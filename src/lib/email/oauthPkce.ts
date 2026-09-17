"use client";

/**
 * PKCE + CSRF helpers for the Google OAuth connect flow (`connectGmail.ts`).
 * Verifier and state are held in memory only for the duration of one
 * in-flight connect attempt — never persisted.
 */

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generateState(): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(16)));
}

export function generateCodeVerifier(): string {
  // RFC 7636 requires 43-128 chars from [A-Za-z0-9-._~]; base64url of 32
  // random bytes yields 43 chars, safely within range.
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return base64UrlEncode(new Uint8Array(digest));
}
