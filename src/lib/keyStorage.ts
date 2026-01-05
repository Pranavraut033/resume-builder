/**
 * Secure Key Storage
 *
 * Uses AES-256-GCM encryption via Web Crypto API to store API keys securely.
 * Stores keys in Tauri's app data directory using Tauri's file system APIs.
 *
 * Keys are encrypted with a master password before being written to disk.
 */

import {
  exists,
  readTextFile,
  writeTextFile,
  BaseDirectory,
} from "@tauri-apps/plugin-fs";

import { createLogger } from "@/lib/logger";

const logger = createLogger("KeyStorage");

// Encryption configuration
const _KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;

// Master password for encryption
const MASTER_PASSWORD = "resume-builder-master-key-change-in-production";

// Storage file path (relative to AppData directory)
const STORAGE_FILE = "keys.enc";

interface EncryptedData {
  iv: string;
  salt: string;
  authTag: string;
  encrypted: string;
}

interface KeyStore {
  [provider: string]: EncryptedData;
}

let keyStore: KeyStore | null = null;

/**
 * Check if we're in a Tauri/browser context (client-side)
 */
function isTauriContext(): boolean {
  return typeof window !== "undefined";
}

/**
 * Derive encryption key from password using PBKDF2
 */
async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"]
  );

  return crypto.subtle.deriveKey(
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
}

/**
 * Load the key store from disk
 */
async function loadKeyStore(): Promise<KeyStore> {
  if (keyStore !== null) return keyStore;

  // If not in Tauri context (e.g., server-side), return empty store
  if (!isTauriContext()) {
    logger.debug("Not in Tauri context, returning empty key store");
    keyStore = {};
    return keyStore;
  }

  try {
    const fileExists = await exists(STORAGE_FILE, {
      baseDir: BaseDirectory.AppData,
    });

    if (!fileExists) {
      keyStore = {};
      logger.debug("Initialized new key store - file does not exist");
      return keyStore;
    }

    const data = await readTextFile(STORAGE_FILE, {
      baseDir: BaseDirectory.AppData,
    });
    keyStore = JSON.parse(data);
    logger.info("Key store loaded from disk", {
      keyCount: keyStore ? Object.keys(keyStore).length : 0,
    });
    return keyStore!;
  } catch (error) {
    // File doesn't exist or is corrupted, start fresh
    keyStore = {};
    logger.error("Failed to load key store, initialized empty", { error });
    return keyStore;
  }
}

/**
 * Save the key store to disk
 */
async function saveKeyStore(): Promise<void> {
  if (keyStore === null) return;

  // Can only save in Tauri context
  if (!isTauriContext()) {
    logger.warn("Cannot save key store outside Tauri context");
    return;
  }

  try {
    const data = JSON.stringify(keyStore, null, 2);
    await writeTextFile(STORAGE_FILE, data, { baseDir: BaseDirectory.AppData });
    logger.debug("Key store saved to disk");
  } catch (error) {
    logger.error("Failed to save key store", { error });
    throw error;
  }
}

/**
 * Encrypt a string value using Web Crypto API
 */
async function encrypt(text: string, password: string): Promise<EncryptedData> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const key = await deriveKey(password, salt);
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(text)
  );

  // Convert to hex strings for JSON storage
  const encrypted = Array.from(new Uint8Array(encryptedBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    iv: Array.from(iv)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
    salt: Array.from(salt)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
    authTag: "", // GCM mode includes auth tag in encrypted data
    encrypted,
  };
}

/**
 * Decrypt an encrypted value using Web Crypto API
 */
async function decrypt(
  encryptedData: EncryptedData,
  password: string
): Promise<string> {
  const hexToBytes = (hex: string) => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  };

  const salt = hexToBytes(encryptedData.salt);
  const iv = hexToBytes(encryptedData.iv);
  const encrypted = hexToBytes(encryptedData.encrypted);

  const key = await deriveKey(password, salt);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    encrypted
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

/**
 * Store an API key securely
 * Falls back to localStorage in web mode (development)
 */
export async function setApiKey(
  provider: string,
  apiKey: string
): Promise<void> {
  if (!isTauriContext()) {
    logger.warn("Not in Tauri context, using localStorage fallback", {
      provider,
    });
    // Fallback to localStorage for web mode development
    try {
      localStorage.setItem(`apiKey_${provider}`, apiKey);
      logger.info("API key stored in localStorage (web mode)", { provider });
      return;
    } catch (error) {
      logger.error(`Failed to store API key in localStorage for ${provider}`, {
        error,
        provider,
      });
      throw new Error(
        `Failed to store API key: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  try {
    const store = await loadKeyStore();
    const encrypted = await encrypt(apiKey, MASTER_PASSWORD);
    store[provider] = encrypted;
    keyStore = store;
    await saveKeyStore();
    logger.info("API key stored securely", { provider });
  } catch (error) {
    logger.error(`Failed to store API key for ${provider}`, {
      error,
      provider,
    });
    throw new Error(
      `Failed to store API key: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Retrieve an API key
 * Falls back to localStorage in web mode (development)
 */
export async function getApiKey(provider: string): Promise<string | null> {
  if (!isTauriContext()) {
    // Fallback to localStorage for web mode development
    try {
      const key = localStorage.getItem(`apiKey_${provider}`);
      logger.debug(
        key
          ? "API key retrieved from localStorage (web mode)"
          : "API key not found in localStorage",
        { provider }
      );
      return key;
    } catch (error) {
      logger.error("Failed to retrieve API key from localStorage", {
        provider,
        error,
      });
      return null;
    }
  }

  try {
    const store = await loadKeyStore();
    const encrypted = store[provider];

    if (!encrypted) {
      logger.debug("API key not found", { provider });
      return null;
    }

    const decrypted = await decrypt(encrypted, MASTER_PASSWORD);
    logger.debug("API key retrieved securely", { provider });
    return decrypted;
  } catch (error) {
    logger.error("Failed to retrieve API key", { provider, error });
    return null;
  }
}

/**
 * Delete an API key
 * Falls back to localStorage in web mode (development)
 */
export async function deleteApiKey(provider: string): Promise<void> {
  if (!isTauriContext()) {
    // Fallback to localStorage for web mode development
    try {
      localStorage.removeItem(`apiKey_${provider}`);
      logger.info("API key deleted from localStorage (web mode)", { provider });
      return;
    } catch (error) {
      logger.error(
        `Failed to delete API key from localStorage for ${provider}`,
        { error, provider }
      );
      throw new Error(
        `Failed to delete API key: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  try {
    const store = await loadKeyStore();
    delete store[provider];
    keyStore = store;
    await saveKeyStore();
    logger.info("API key deleted", { provider });
  } catch (error) {
    logger.error(`Failed to delete API key for ${provider}`, {
      error,
      provider,
    });
    throw new Error(
      `Failed to delete API key: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * List all stored API key providers
 */
export async function listApiKeys(): Promise<string[]> {
  try {
    const store = await loadKeyStore();
    const providers = Object.keys(store);
    logger.debug("Listed stored API keys", { providers });
    return providers;
  } catch (error) {
    logger.error("Failed to list API keys", { error });
    return [];
  }
}
