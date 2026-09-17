"use client";

import { getApiKey, setApiKey, deleteApiKey } from "@/lib/keyStorage";
import { createLogger } from "@/lib/logger";

const logger = createLogger("GmailClient");

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

// Official release builds bake in Udaan's own Google OAuth client (set as
// NEXT_PUBLIC_GOOGLE_CLIENT_ID/_SECRET in the release workflow) so most
// users can connect Gmail with no setup. A self-built/dev instance without
// those env vars has none, and a user can always override with their own
// client in Settings — see docs/EMAIL_TRACKING.md.
//
// ponytail: a "Web application" OAuth client's secret isn't meant to be
// public, but it's inlined into the shipped client bundle like any
// NEXT_PUBLIC_ var — extractable by anyone who downloads the app. Accepted
// here the same way installed-app client secrets are treated by Google: it
// only gates which app is asking, not what the user allows: readonly scope,
// so a leaked secret can't do more than run the same gmail.readonly flow
// with its own creds. Upgrade path if that ever stops being acceptable:
// PKCE-only flow that drops the secret requirement (needs a Desktop-type
// client instead of Web), or a thin token-exchange proxy.
export const DEFAULT_GOOGLE_CLIENT_ID: string | null =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || null;
export const DEFAULT_GOOGLE_CLIENT_SECRET: string | null =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET || null;

/** Whether this build has a bundled Google client — no per-user setup needed. */
export function hasDefaultGoogleClient(): boolean {
  return DEFAULT_GOOGLE_CLIENT_ID !== null;
}

/** Thrown by any flow step that needs a client ID and none is configured. */
export class GoogleClientNotConfiguredError extends Error {
  constructor() {
    super("No Google OAuth client ID configured. Add one in Settings.");
    this.name = "GoogleClientNotConfiguredError";
  }
}

/** Thrown when Google rejects a refresh token (revoked/expired) — the user must reconnect. */
export class GoogleReauthRequiredError extends Error {
  constructor() {
    super("Google access was revoked or expired. Reconnect your account.");
    this.name = "GoogleReauthRequiredError";
  }
}

const KEY_GOOGLE_REFRESH_TOKEN = "google_oauth_refresh_token";
const KEY_GOOGLE_ACCESS_TOKEN = "google_oauth_access_token";
const KEY_GOOGLE_TOKEN_EXPIRY = "google_oauth_token_expiry";
const KEY_GOOGLE_CUSTOM_CLIENT_ID = "google_custom_client_id";
const KEY_GOOGLE_CUSTOM_CLIENT_SECRET = "google_custom_client_secret";

export interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType?: string;
  scope?: string;
}

export interface GoogleUserInfo {
  email: string;
  name?: string;
  picture?: string;
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessagePart {
  mimeType: string;
  body?: {
    size: number;
    data?: string;
  };
  parts?: GmailMessagePart[];
}

export interface GmailMessageRaw {
  id: string;
  threadId: string;
  snippet: string;
  internalDate: string;
  payload?: {
    headers: GmailHeader[];
    body?: {
      data?: string;
    };
    parts?: GmailMessagePart[];
  };
}

export interface ParsedEmailMessage {
  messageId: string;
  threadId?: string;
  sender: string;
  recipient?: string;
  subject: string;
  snippet: string;
  bodyText?: string;
  date: Date;
}

export async function getActiveClientId(): Promise<string | null> {
  const customId = await getApiKey(KEY_GOOGLE_CUSTOM_CLIENT_ID);
  return customId && customId.trim().length > 0
    ? customId.trim()
    : DEFAULT_GOOGLE_CLIENT_ID;
}

// The bundled default secret is only ever paired with the bundled default
// client ID. If the user has set their own custom client ID, a blank secret
// field means "this is a public/PKCE-only client" — it must NOT silently
// fall back to Udaan's secret, which belongs to a different client entirely.
export async function getActiveClientSecret(): Promise<string | null> {
  const customId = await getApiKey(KEY_GOOGLE_CUSTOM_CLIENT_ID);
  const customSecret = await getApiKey(KEY_GOOGLE_CUSTOM_CLIENT_SECRET);
  if (customSecret && customSecret.trim().length > 0)
    return customSecret.trim();
  const hasCustomId = Boolean(customId && customId.trim().length > 0);
  return hasCustomId ? null : DEFAULT_GOOGLE_CLIENT_SECRET;
}

export async function setCustomGoogleCredentials(
  clientId: string | null,
  clientSecret: string | null
): Promise<void> {
  if (clientId) {
    await setApiKey(KEY_GOOGLE_CUSTOM_CLIENT_ID, clientId);
  } else {
    await deleteApiKey(KEY_GOOGLE_CUSTOM_CLIENT_ID);
  }

  if (clientSecret) {
    await setApiKey(KEY_GOOGLE_CUSTOM_CLIENT_SECRET, clientSecret);
  } else {
    await deleteApiKey(KEY_GOOGLE_CUSTOM_CLIENT_SECRET);
  }
}

/**
 * Generates the Google OAuth authorization URL for the user to sign in.
 */
export async function generateAuthUrl(
  redirectUri: string,
  state?: string,
  codeChallenge?: string
): Promise<string> {
  const clientId = await getActiveClientId();
  if (!clientId) throw new GoogleClientNotConfiguredError();

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GMAIL_SCOPES);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");

  if (state) {
    url.searchParams.set("state", state);
  }
  if (codeChallenge) {
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");
  }

  return url.toString();
}

/**
 * Exchanges authorization code for access and refresh tokens.
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  codeVerifier?: string
): Promise<GoogleTokens> {
  const clientId = await getActiveClientId();
  if (!clientId) throw new GoogleClientNotConfiguredError();
  const clientSecret = await getActiveClientSecret();

  const params = new URLSearchParams();
  params.set("code", code);
  params.set("client_id", clientId);
  if (clientSecret) {
    params.set("client_secret", clientSecret);
  }
  params.set("redirect_uri", redirectUri);
  params.set("grant_type", "authorization_code");
  if (codeVerifier) {
    params.set("code_verifier", codeVerifier);
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("Token exchange failed", {
      status: response.status,
      errorText,
    });
    throw new Error(
      `Google token exchange failed: ${response.status} - ${errorText}`
    );
  }

  const data = await response.json();
  const tokens: GoogleTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    scope: data.scope,
  };

  // Cache tokens in keyStorage
  await setApiKey(KEY_GOOGLE_ACCESS_TOKEN, tokens.accessToken);
  if (tokens.refreshToken) {
    await setApiKey(KEY_GOOGLE_REFRESH_TOKEN, tokens.refreshToken);
  }
  const expiryTimestamp = String(Date.now() + tokens.expiresIn * 1000);
  await setApiKey(KEY_GOOGLE_TOKEN_EXPIRY, expiryTimestamp);

  return tokens;
}

/**
 * Refreshes an expired access token using the stored refresh token.
 */
export async function refreshAccessToken(): Promise<string> {
  const refreshToken = await getApiKey(KEY_GOOGLE_REFRESH_TOKEN);
  if (!refreshToken) {
    throw new Error(
      "No Google refresh token found. User must re-authenticate."
    );
  }

  const clientId = await getActiveClientId();
  if (!clientId) throw new GoogleClientNotConfiguredError();
  const clientSecret = await getActiveClientSecret();

  const params = new URLSearchParams();
  params.set("client_id", clientId);
  if (clientSecret) {
    params.set("client_secret", clientSecret);
  }
  params.set("refresh_token", refreshToken);
  params.set("grant_type", "refresh_token");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("Token refresh failed", {
      status: response.status,
      errorText,
    });
    if (errorText.includes("invalid_grant")) {
      await clearGoogleAuthTokens();
      throw new GoogleReauthRequiredError();
    }
    throw new Error(`Google token refresh failed: ${response.status}`);
  }

  const data = await response.json();
  const newAccessToken = data.access_token;
  await setApiKey(KEY_GOOGLE_ACCESS_TOKEN, newAccessToken);
  const expiryTimestamp = String(Date.now() + (data.expires_in || 3600) * 1000);
  await setApiKey(KEY_GOOGLE_TOKEN_EXPIRY, expiryTimestamp);

  return newAccessToken;
}

/**
 * Gets a valid access token, automatically refreshing if expired or expiring within 60 seconds.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const accessToken = await getApiKey(KEY_GOOGLE_ACCESS_TOKEN);
  const expiryStr = await getApiKey(KEY_GOOGLE_TOKEN_EXPIRY);
  const refreshToken = await getApiKey(KEY_GOOGLE_REFRESH_TOKEN);

  if (!refreshToken && !accessToken) {
    return null;
  }

  const expiry = expiryStr ? parseInt(expiryStr, 10) : 0;
  // If token expires within 60s, refresh it
  if (Date.now() > expiry - 60000) {
    try {
      return await refreshAccessToken();
    } catch (err) {
      if (err instanceof GoogleReauthRequiredError) throw err;
      logger.error("Failed to auto-refresh access token", { err });
      return null;
    }
  }

  return accessToken;
}

export async function clearGoogleAuthTokens(): Promise<void> {
  await deleteApiKey(KEY_GOOGLE_ACCESS_TOKEN);
  await deleteApiKey(KEY_GOOGLE_REFRESH_TOKEN);
  await deleteApiKey(KEY_GOOGLE_TOKEN_EXPIRY);
}

/**
 * Fetches basic profile info (email address) for the authenticated Google user.
 */
export async function getGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserInfo> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.status}`);
  }

  return (await response.json()) as GoogleUserInfo;
}

function decodeBase64Url(dataStr: string): string {
  try {
    const base64 = dataStr.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return "";
  }
}

function extractTextFromBody(part: GmailMessagePart): string {
  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  if (part.parts && part.parts.length > 0) {
    for (const subPart of part.parts) {
      const text = extractTextFromBody(subPart);
      if (text) return text;
    }
  }
  return "";
}

/**
 * Fetches messages from Gmail matching a search query.
 */
// Conservative ceiling on one sync run — a first-time connect can otherwise
// pull hundreds of messages through per-message LLM classification.
const MAX_MESSAGES_PER_SYNC = 250;
const LIST_PAGE_SIZE = 100;

export async function fetchRecruitingEmails(
  accessToken: string,
  options: {
    query?: string;
    maxResults?: number;
    afterTimestamp?: Date | null;
  } = {}
): Promise<ParsedEmailMessage[]> {
  const defaultQuery =
    'subject:(application OR applied OR interview OR "thank you for applying" OR assessment OR offer OR status OR rejection OR "next steps")';
  let q = options.query || defaultQuery;

  if (options.afterTimestamp) {
    const epochSec = Math.floor(options.afterTimestamp.getTime() / 1000);
    q += ` after:${epochSec}`;
  }

  const cap = Math.min(
    options.maxResults || MAX_MESSAGES_PER_SYNC,
    MAX_MESSAGES_PER_SYNC
  );
  const rawList: { id: string; threadId: string }[] = [];
  let pageToken: string | undefined;

  do {
    const listUrl = new URL(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages"
    );
    listUrl.searchParams.set("q", q);
    listUrl.searchParams.set(
      "maxResults",
      String(Math.min(LIST_PAGE_SIZE, cap - rawList.length))
    );
    if (pageToken) listUrl.searchParams.set("pageToken", pageToken);

    const listResp = await fetch(listUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listResp.ok) {
      throw new Error(`Failed to list Gmail messages: ${listResp.status}`);
    }

    const listData = await listResp.json();
    rawList.push(...(listData.messages || []));
    pageToken = listData.nextPageToken;
  } while (pageToken && rawList.length < cap);

  const parsedEmails: ParsedEmailMessage[] = [];

  // Fetch full details for each message in batches of 5 to respect rate limits
  for (const item of rawList) {
    try {
      const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`;
      const msgResp = await fetch(msgUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!msgResp.ok) continue;

      const msg: GmailMessageRaw = await msgResp.json();
      const headers = msg.payload?.headers || [];

      const getHeader = (name: string) =>
        headers.find((h) => h.name.toLowerCase() === name.toLowerCase())
          ?.value || "";

      const subject = getHeader("Subject");
      const sender = getHeader("From");
      const recipient = getHeader("To");
      const dateStr = getHeader("Date");
      const date = dateStr
        ? new Date(dateStr)
        : new Date(parseInt(msg.internalDate, 10));

      let bodyText = "";
      if (msg.payload) {
        if (msg.payload.body?.data) {
          bodyText = decodeBase64Url(msg.payload.body.data);
        } else if (msg.payload.parts) {
          for (const part of msg.payload.parts) {
            const text = extractTextFromBody(part);
            if (text) {
              bodyText = text;
              break;
            }
          }
        }
      }

      parsedEmails.push({
        messageId: msg.id,
        threadId: msg.threadId,
        sender,
        recipient,
        subject,
        snippet: msg.snippet || "",
        bodyText: bodyText.slice(0, 4000), // Limit body text length for prompt context
        date: isNaN(date.getTime()) ? new Date() : date,
      });
    } catch (err) {
      logger.error("Failed to parse message", { id: item.id, err });
    }
  }

  return parsedEmails;
}
