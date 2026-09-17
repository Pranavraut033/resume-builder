"use client";

import { consumeAuthCode, upsertEmailAccount } from "@/actions/emailSync";
import {
  exchangeCodeForTokens,
  generateAuthUrl,
  getGoogleUserInfo,
} from "@/lib/email/gmailClient";
import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "@/lib/email/oauthPkce";
import { openExternalUrl } from "@/lib/externalLink";

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // matches authCodeStore.ts's TTL

export class ConnectTimeoutError extends Error {
  constructor() {
    super("Timed out waiting for Google sign-in. Please try again.");
    this.name = "ConnectTimeoutError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollForAuthCode(state: string): Promise<string> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const { code } = await consumeAuthCode(state);
    if (code) return code;
    await sleep(POLL_INTERVAL_MS);
  }
  throw new ConnectTimeoutError();
}

/**
 * Runs the full Gmail connect flow client-side: opens Google's consent
 * screen in the system browser (Tauri blocks OAuth inside its embedded
 * webview, so this can't be a same-window popup), picks up the resulting
 * code via the transient server-side hand-off in authCodeStore.ts, exchanges
 * it for tokens (kept in keyStorage, never SQLite), and records the account.
 */
export async function connectGmail(): Promise<{ email: string }> {
  const redirectUri = `${window.location.origin}/api/auth/callback/google`;
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const authUrl = await generateAuthUrl(redirectUri, state, codeChallenge);
  await openExternalUrl(authUrl);

  const code = await pollForAuthCode(state);
  const tokens = await exchangeCodeForTokens(code, redirectUri, codeVerifier);
  const userInfo = await getGoogleUserInfo(tokens.accessToken);

  await upsertEmailAccount(userInfo.email);

  return { email: userInfo.email };
}
