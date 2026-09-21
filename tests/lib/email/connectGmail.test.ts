import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/actions/emailSync", () => ({
  consumeAuthCode: vi.fn(),
  upsertEmailAccount: vi.fn(),
}));

vi.mock("@/lib/email/gmailClient", () => ({
  generateAuthUrl: vi.fn(),
  exchangeCodeForTokens: vi.fn(),
  getGoogleUserInfo: vi.fn(),
}));

vi.mock("@/lib/email/oauthPkce", () => ({
  generateState: () => "state-abc",
  generateCodeVerifier: () => "verifier-xyz",
  generateCodeChallenge: vi.fn().mockResolvedValue("challenge-123"),
}));

vi.mock("@/lib/externalLink", () => ({
  openExternalUrl: vi.fn(),
}));

const tauri = vi.hoisted(() => ({
  isTauri: false,
  identifier: "com.resumebuilder.dev",
  unminimize: vi.fn(),
  setFocus: vi.fn(),
}));
vi.mock("@/lib/keyStorage", () => ({ isTauriContext: () => tauri.isTauri }));
vi.mock("@tauri-apps/api/app", () => ({
  getIdentifier: vi.fn(async () => tauri.identifier),
}));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    unminimize: tauri.unminimize,
    setFocus: tauri.setFocus,
  }),
}));

const { consumeAuthCode, upsertEmailAccount } =
  await import("@/actions/emailSync");
const { generateAuthUrl, exchangeCodeForTokens, getGoogleUserInfo } =
  await import("@/lib/email/gmailClient");
const { openExternalUrl } = await import("@/lib/externalLink");
const { connectGmail, ConnectTimeoutError } =
  await import("@/lib/email/connectGmail");

describe("connectGmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    tauri.isTauri = false;
    tauri.identifier = "com.resumebuilder.dev";
    tauri.unminimize.mockResolvedValue(undefined);
    tauri.setFocus.mockResolvedValue(undefined);
    vi.mocked(generateAuthUrl).mockResolvedValue("https://accounts.google/x");
    vi.mocked(exchangeCodeForTokens).mockResolvedValue({
      accessToken: "access",
      expiresIn: 3600,
    });
    vi.mocked(getGoogleUserInfo).mockResolvedValue({ email: "me@gmail.com" });
    vi.mocked(upsertEmailAccount).mockResolvedValue({ id: 1 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens consent, polls for the code, exchanges it with the PKCE verifier, and records the account", async () => {
    vi.mocked(consumeAuthCode)
      .mockResolvedValueOnce({ code: null })
      .mockResolvedValueOnce({ code: null })
      .mockResolvedValueOnce({ code: "auth-code" });

    const pending = connectGmail();
    await vi.advanceTimersByTimeAsync(5000);
    const result = await pending;

    const redirectUri = `${window.location.origin}/api/auth/callback/google`;
    expect(generateAuthUrl).toHaveBeenCalledWith(
      redirectUri,
      "web~state-abc",
      "challenge-123"
    );
    expect(openExternalUrl).toHaveBeenCalledWith("https://accounts.google/x");
    expect(consumeAuthCode).toHaveBeenCalledWith("web~state-abc");
    expect(exchangeCodeForTokens).toHaveBeenCalledWith(
      "auth-code",
      redirectUri,
      "verifier-xyz"
    );
    expect(getGoogleUserInfo).toHaveBeenCalledWith("access");
    expect(upsertEmailAccount).toHaveBeenCalledWith("me@gmail.com");
    expect(result).toEqual({ email: "me@gmail.com" });
  });

  it("times out without exchanging or recording anything when no code ever arrives", async () => {
    vi.mocked(consumeAuthCode).mockResolvedValue({ code: null });

    const pending = connectGmail();
    const assertion =
      expect(pending).rejects.toBeInstanceOf(ConnectTimeoutError);
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 2000);
    await assertion;

    expect(exchangeCodeForTokens).not.toHaveBeenCalled();
    expect(upsertEmailAccount).not.toHaveBeenCalled();
  });

  it("does not record an account when the token exchange fails", async () => {
    vi.mocked(consumeAuthCode).mockResolvedValue({ code: "auth-code" });
    vi.mocked(exchangeCodeForTokens).mockRejectedValue(new Error("400"));

    await expect(connectGmail()).rejects.toThrow("400");
    expect(upsertEmailAccount).not.toHaveBeenCalled();
  });

  describe("platform link", () => {
    async function run() {
      vi.mocked(consumeAuthCode).mockResolvedValue({ code: "auth-code" });
      const pending = connectGmail();
      await vi.advanceTimersByTimeAsync(0);
      return pending;
    }

    it("tags the OAuth state with the desktop scheme so the success page can link back", async () => {
      tauri.isTauri = true;

      await run();

      expect(generateAuthUrl).toHaveBeenCalledWith(
        expect.any(String),
        "udaan~state-abc",
        "challenge-123"
      );
      expect(consumeAuthCode).toHaveBeenCalledWith("udaan~state-abc");
    });

    it("uses the canary scheme for the canary build", async () => {
      tauri.isTauri = true;
      tauri.identifier = "com.resumebuilder.canary";

      await run();

      expect(consumeAuthCode).toHaveBeenCalledWith("udaan-canary~state-abc");
    });

    it("falls back to the web link for an unrecognised desktop identifier", async () => {
      tauri.isTauri = true;
      tauri.identifier = "com.someone.else";

      await run();

      expect(consumeAuthCode).toHaveBeenCalledWith("web~state-abc");
    });

    it("raises the app window once the code arrives, before the token exchange", async () => {
      tauri.isTauri = true;

      await run();

      expect(tauri.unminimize).toHaveBeenCalledTimes(1);
      expect(tauri.setFocus).toHaveBeenCalledTimes(1);
      expect(tauri.setFocus.mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(exchangeCodeForTokens).mock.invocationCallOrder[0]
      );
    });

    it("does not touch a window on web", async () => {
      await run();

      expect(tauri.setFocus).not.toHaveBeenCalled();
    });

    it("does not raise the window when no code ever arrives", async () => {
      tauri.isTauri = true;
      vi.mocked(consumeAuthCode).mockResolvedValue({ code: null });

      const pending = connectGmail();
      const assertion =
        expect(pending).rejects.toBeInstanceOf(ConnectTimeoutError);
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 2000);
      await assertion;

      expect(tauri.setFocus).not.toHaveBeenCalled();
    });

    it("still connects when raising the window fails", async () => {
      tauri.isTauri = true;
      tauri.setFocus.mockRejectedValue(new Error("not allowed"));

      await expect(run()).resolves.toEqual({ email: "me@gmail.com" });
    });
  });
});
