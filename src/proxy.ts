import { NextRequest, NextResponse } from "next/server";

// CSP lives here instead of next.config.ts's `headers()` because Next's App
// Router streams RSC/hydration data via inline <script> tags (self.__next_f /
// self.__next_r) — those need a nonce (or 'unsafe-inline', which defeats the
// point). Next auto-detects a nonce from the CSP response header and applies
// it to its own inline scripts, so a fresh nonce per request is enough; no
// per-script wiring needed. See https://nextjs.org/docs/app/guides/content-security-policy
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // 'unsafe-eval' is needed in every env, not just dev: Turbopack/webpack's
  // HMR runtime uses eval()/Function() in dev, and in production Handlebars
  // (packages/llm-core/src/prompts/resolver.ts) JIT-compiles prompt
  // templates via `new Function(...)` on every LLM call. Only fixed,
  // developer-authored template strings are compiled this way — user input
  // (job descriptions, resume text) is passed as template *data*, never
  // compiled — so this doesn't expose an eval-user-content vector.
  const csp = [
    "default-src 'self'",
    "connect-src 'self' http://127.0.0.1:3008 http://localhost:3008 http://127.0.0.1:3009 http://localhost:11434 ipc: http://ipc.localhost https:",
    "img-src 'self' data: blob: https:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`,
    "font-src 'self' data:",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Skip static assets and image optimization, which don't need the CSP
    // header and don't run any hydration/RSC scripts.
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
