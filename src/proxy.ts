import { NextRequest, NextResponse } from "next/server";

// CSP lives here instead of next.config.ts's `headers()` because Next's App
// Router streams RSC/hydration data via inline <script> tags (self.__next_f /
// self.__next_r) — those need a nonce (or 'unsafe-inline', which defeats the
// point). Next auto-detects a nonce from the CSP response header and applies
// it to its own inline scripts, so a fresh nonce per request is enough; no
// per-script wiring needed. See https://nextjs.org/docs/app/guides/content-security-policy
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Turbopack/webpack's dev-mode HMR runtime executes updated module code via
  // eval()/Function(), which CSP's script-src gates directly — only relax
  // this in dev; production output has no eval.
  const isDev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    "connect-src 'self' http://127.0.0.1:3008 http://localhost:3008 https:",
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
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
