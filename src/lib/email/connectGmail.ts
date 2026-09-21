"use client";

import { consumeAuthCode, upsertEmailAccount } from "@/actions/emailSync";
import { DESKTOP_SCHEMES, tagState } from "@/lib/email/appLink";
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
import { isTauriContext } from "@/lib/keyStorage";
import { createLogger } from "@/lib/logger";

const logger = createLogger("connectGmail");

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
 * The URL scheme the success page should launch to get back to *this* build
 * (stable and canary register different ones), or null on web / an unknown
 * identifier — the page then falls back to a plain link into the web app.
 */
async function desktopScheme(): Promise<string | null> {
  if (!isTauriContext()) return null;
  try {
    const { getIdentifier } = await import("@tauri-apps/api/app");
    return DESKTOP_SCHEMES[await getIdentifier()] ?? null;
  } catch (err) {
    logger.warn("Could not read app identifier for the success-page link", {
      err,
    });
    return null;
  }
}

/**
 * The browser tab is in front while the user consents; bring the app back
 * once the code arrives so they land where the result shows. Best-effort —
 * the connect must never fail because a window couldn't be raised.
 */
async function raiseAppWindow(): Promise<void> {
  if (!isTauriContext()) return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    await win.unminimize();
    await win.setFocus();
  } catch (err) {
    logger.warn("Could not raise the app window after sign-in", { err });
  }
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
  // Tagged so the success page can link back to the right app — see appLink.ts.
  const state = tagState(generateState(), await desktopScheme());
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const authUrl = await generateAuthUrl(redirectUri, state, codeChallenge);
  await openExternalUrl(authUrl);

  const code = await pollForAuthCode(state);
  await raiseAppWindow();
  const tokens = await exchangeCodeForTokens(code, redirectUri, codeVerifier);
  const userInfo = await getGoogleUserInfo(tokens.accessToken);

  await upsertEmailAccount(userInfo.email);

  return { email: userInfo.email };
}
