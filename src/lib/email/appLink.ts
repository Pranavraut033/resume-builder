/**
 * How the OAuth success page (a server-rendered page in the *system browser*,
 * see src/app/api/auth/callback/google/route.ts) links back to the app that
 * started the flow. The page can't see which build that was, so the client
 * tags the OAuth `state` (`<scheme>~<random>`, or `web~<random>`) and the page
 * resolves the tag against an allow-list. Shared by client and server — no
 * "use client".
 */

/** Seconds the success page stays readable before it launches the app. */
export const REDIRECT_DELAY_SECONDS = 3;

/**
 * Tauri bundle identifier → URL scheme registered by that build
 * (`plugins.deep-link.desktop.schemes` in src-tauri/tauri.conf.json and
 * canary.conf.json). Keep in sync with those files.
 */
export const DESKTOP_SCHEMES: Record<string, string> = {
  "com.resumebuilder.dev": "udaan",
  "com.resumebuilder.canary": "udaan-canary",
};

const ALLOWED_SCHEMES = new Set(Object.values(DESKTOP_SCHEMES));
const SEPARATOR = "~"; // not in the base64url alphabet, so it can't clash with the random part

export type AppTarget = { kind: "web" } | { kind: "desktop"; scheme: string };

/** `scheme` null tags a web build. */
export function tagState(random: string, scheme: string | null): string {
  return `${scheme ?? "web"}${SEPARATOR}${random}`;
}

/**
 * The state comes from a public query string, so the scheme is only ever
 * taken from the allow-list — anything else (missing, unknown, hostile)
 * resolves to web, and the raw value is never used in a link.
 */
export function parseStateTarget(state: string): AppTarget {
  const prefix = state.split(SEPARATOR, 1)[0];
  return ALLOWED_SCHEMES.has(prefix)
    ? { kind: "desktop", scheme: prefix }
    : { kind: "web" };
}

export function appLinkFor(target: AppTarget): string {
  return target.kind === "desktop"
    ? `${target.scheme}://oauth-complete`
    : "/settings";
}
