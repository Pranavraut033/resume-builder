// Transient hand-off for the Google OAuth authorization code between the
// callback route (src/app/api/auth/callback/google/route.ts) and the client
// that initiated the connect flow (src/lib/email/connectGmail.ts).
//
// The consent screen opens in the system browser (Tauri blocks OAuth inside
// its embedded webview), so there is no `window.opener` to postMessage back
// to. Both the system browser and the app webview talk to the same bundled
// Next server, so the code is stashed here by `state` and picked up by the
// client polling the `consumeAuthCode` server action. Single-use, 5 minute
// TTL, PKCE-bound (the verifier never leaves the client) — never written to
// disk or SQLite.
//
// ponytail: a plain in-memory Map, so this only works with a single Next.js
// server process — exactly what this app's local/bundled server is. Would
// need a shared store (Redis, DB row) if this server were ever horizontally
// scaled, which a local-first desktop app's server never is.

interface StashedCode {
  code: string;
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000;
const codesByState = new Map<string, StashedCode>();

function purgeExpired(): void {
  const now = Date.now();
  for (const [state, entry] of codesByState) {
    if (entry.expiresAt <= now) codesByState.delete(state);
  }
}

export function stashAuthCode(state: string, code: string): void {
  purgeExpired();
  codesByState.set(state, { code, expiresAt: Date.now() + TTL_MS });
}

/** Removes and returns the code for `state`, or null if absent/expired. */
export function takeAuthCode(state: string): string | null {
  purgeExpired();
  const entry = codesByState.get(state);
  if (!entry) return null;
  codesByState.delete(state);
  return entry.code;
}
