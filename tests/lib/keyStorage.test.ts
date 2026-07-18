import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// In-memory fake filesystem standing in for Tauri's plugin-fs, keyed by the
// storage file path used by keyStorage.ts ("keys.enc").
let fakeFiles: Record<string, string> = {};

const existsMock = vi.fn(async (path: string) => path in fakeFiles);
const readTextFileMock = vi.fn(async (path: string) => fakeFiles[path]);
const writeTextFileMock = vi.fn(async (path: string, data: string) => {
  fakeFiles[path] = data;
});

vi.mock("@tauri-apps/plugin-fs", () => ({
  exists: (...args: unknown[]) => existsMock(...(args as [string])),
  readTextFile: (...args: unknown[]) => readTextFileMock(...(args as [string])),
  writeTextFile: (...args: unknown[]) =>
    writeTextFileMock(...(args as [string, string])),
  BaseDirectory: { AppData: "AppData" },
}));

const FAKE_MASTER_KEY_B64 = "ZmFrZS1rZXljaGFpbi1kZXJpdmVkLW1hc3Rlci1rZXkh"; // arbitrary base64 stand-in
const invokeMock = vi.fn(async (command: string) => {
  if (command === "get_or_create_master_key") {
    return FAKE_MASTER_KEY_B64;
  }
  throw new Error(`Unexpected invoke command: ${command}`);
});

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: [string]) => invokeMock(...args),
}));

const LEGACY_MASTER_PASSWORD = "resume-builder-master-key-change-in-production";

/**
 * Re-implements the module's private `encrypt()` (AES-256-GCM via
 * PBKDF2-derived key, hex-encoded) so tests can synthesize a `keys.enc`
 * entry as if it had been written by a pre-keychain build using the legacy
 * hardcoded password, without depending on keyStorage.ts internals.
 */
async function legacyEncrypt(text: string, password: string) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(text)
  );

  const toHex = (bytes: Uint8Array) =>
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  return {
    iv: toHex(iv),
    salt: toHex(salt),
    authTag: "",
    encrypted: toHex(new Uint8Array(encryptedBuffer)),
  };
}

function enableTauriContext() {
  Object.defineProperty(window, "__TAURI_INTERNALS__", {
    value: {},
    configurable: true,
    writable: true,
  });
}

function disableTauriContext() {
  Object.defineProperty(window, "__TAURI_INTERNALS__", {
    value: undefined,
    configurable: true,
    writable: true,
  });
}

describe("keyStorage", () => {
  beforeEach(() => {
    fakeFiles = {};
    existsMock.mockClear();
    readTextFileMock.mockClear();
    writeTextFileMock.mockClear();
    invokeMock.mockClear();
    enableTauriContext();
    vi.resetModules();
  });

  afterEach(() => {
    disableTauriContext();
  });

  it("encrypts new keys with the keychain-derived master key, not the legacy password", async () => {
    const { setApiKey, getApiKey } = await import("@/lib/keyStorage");

    await setApiKey("openai", "sk-new-key-12345");

    // The Tauri master-key command must have been consulted for the write.
    expect(invokeMock).toHaveBeenCalledWith("get_or_create_master_key");
    expect(writeTextFileMock).toHaveBeenCalled();

    const stored = JSON.parse(fakeFiles["keys.enc"]);
    const entry = stored.openai;

    // Decrypting with the legacy password must fail — proves the new write
    // used the keychain-derived key, not the old hardcoded one.
    await expect(async () => {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(LEGACY_MASTER_PASSWORD),
        "PBKDF2",
        false,
        ["deriveBits", "deriveKey"]
      );
      const hexToBytes = (hex: string) => {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
          bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        return bytes;
      };
      const derived = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: hexToBytes(entry.salt).buffer as ArrayBuffer,
          iterations: 100000,
          hash: "SHA-256",
        },
        key,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
      await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: hexToBytes(entry.iv) },
        derived,
        hexToBytes(entry.encrypted)
      );
    }).rejects.toThrow();

    // But reading it back through getApiKey (keychain key) succeeds.
    const retrieved = await getApiKey("openai");
    expect(retrieved).toBe("sk-new-key-12345");
  });

  it("migrates a legacy-password-encrypted entry: decrypts it and rewrites it with the new key", async () => {
    const plaintext = "sk-legacy-key-abcdef";
    const legacyEntry = await legacyEncrypt(plaintext, LEGACY_MASTER_PASSWORD);

    fakeFiles["keys.enc"] = JSON.stringify({ anthropic: legacyEntry }, null, 2);

    const { getApiKey } = await import("@/lib/keyStorage");

    const result = await getApiKey("anthropic");

    // 1. Old data is still readable after the upgrade — the core "don't
    // brick existing users' stored keys" guarantee.
    expect(result).toBe(plaintext);

    // 2. The store was rewritten to disk with a freshly re-encrypted entry
    // (upgrade-in-place), not left as the legacy ciphertext.
    expect(writeTextFileMock).toHaveBeenCalled();
    const rewritten = JSON.parse(fakeFiles["keys.enc"]);
    expect(rewritten.anthropic.encrypted).not.toBe(legacyEntry.encrypted);
    expect(rewritten.anthropic.salt).not.toBe(legacyEntry.salt);

    // 3. The rewritten entry decrypts correctly with the new keychain key
    // (round-trip via getApiKey again, which will now hit the fast path).
    invokeMock.mockClear();
    const rereadResult = await getApiKey("anthropic");
    expect(rereadResult).toBe(plaintext);
  });

  it("returns null without throwing when both the new key and legacy password fail to decrypt (corrupted data)", async () => {
    fakeFiles["keys.enc"] = JSON.stringify(
      {
        corrupted: {
          iv: "00".repeat(16),
          salt: "00".repeat(32),
          authTag: "",
          encrypted: "deadbeef",
        },
      },
      null,
      2
    );

    const { getApiKey } = await import("@/lib/keyStorage");

    await expect(getApiKey("corrupted")).resolves.toBeNull();
  });

  it("returns null when the requested provider has no stored entry", async () => {
    const { getApiKey } = await import("@/lib/keyStorage");

    await expect(getApiKey("missing-provider")).resolves.toBeNull();
  });
});
