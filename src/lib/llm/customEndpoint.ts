/**
 * Base URL for the user-configured custom OpenAI-compatible provider.
 *
 * Not a secret (the paired API key goes through `keyStorage` like every other
 * provider's), so this lives in `localStorage` rather than the encrypted store.
 */

const STORAGE_KEY = "udaan.customEndpoint.baseUrl";

/**
 * The API key and the user's resume both travel to whatever host is set here,
 * so a remote endpoint must be HTTPS. Plain HTTP is allowed only for loopback,
 * where there is no network to eavesdrop on — that's how self-hosted runtimes
 * (vLLM, LM Studio, llama.cpp) are normally reached.
 */
export function validateCustomBaseUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return "Enter the endpoint's base URL.";

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "Not a valid URL — include the scheme, e.g. https://integrate.api.nvidia.com/v1";
  }

  if (url.protocol === "https:") return null;
  if (
    url.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname)
  ) {
    return null;
  }
  return "Must be https:// — your API key and resume are sent to this address. Plain http:// is allowed only for localhost.";
}

export function getCustomBaseUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setCustomBaseUrl(url: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, url.trim());
  } catch {
    // Storage unavailable (private mode, blocked site data) — the provider
    // will report "no endpoint configured" on its next call, which is the
    // same failure the user would see from an empty field.
  }
}

export function clearCustomBaseUrl(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // See setCustomBaseUrl.
  }
}
