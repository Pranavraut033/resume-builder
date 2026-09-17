/**
 * Tiny "have we shown this to the user for the current app version yet"
 * flag, backed by localStorage and keyed on `packageJson.version`. Shared by
 * the keychain-access explainer (`keyStorage.ts`) and the What's New modal
 * (`WhatsNewGate.tsx`) — both are "once per app version" notices, just with
 * different triggers.
 */
import packageJson from "../../package.json";

export function hasSeenForVersion(key: string): boolean {
  return localStorage.getItem(key) === packageJson.version;
}

export function markSeenForVersion(key: string): void {
  localStorage.setItem(key, packageJson.version);
}
