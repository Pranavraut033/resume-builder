import { NextRequest, NextResponse } from "next/server";

import { stashAuthCode } from "@/lib/email/authCodeStore";
import { createLogger } from "@/lib/logger";

const logger = createLogger("GoogleOAuthCallback");

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function page(title: string, body: string, status = 200): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0d1117; color: #fff; }
          .card { text-align: center; background: #161b22; padding: 2.5rem; border-radius: 1rem; border: 1px solid #30363d; box-shadow: 0 8px 24px rgba(0,0,0,0.4); max-width: 28rem; }
          h2 { margin: 0 0 0.5rem; color: #58a6ff; }
          p { margin: 0; color: #8b949e; }
        </style>
      </head>
      <body>
        <div class="card">${body}</div>
      </body>
    </html>`,
    { status, headers: { "Content-Type": "text/html" } }
  );
}

/**
 * Dumb relay: this is the only server-side surface in the Google OAuth flow
 * (documented exception to hard rule 1 in CLAUDE.md — Google requires a
 * fixed redirect URI). It does no token exchange, no Prisma writes, and
 * touches no secrets — it only hands the authorization `code` back to the
 * client that started the flow via `src/lib/email/authCodeStore.ts`.
 *
 * The consent screen runs in the system browser, not the app's embedded
 * webview (Google blocks OAuth inside embedded webviews), so there is no
 * `window.opener` here to postMessage to — see connectGmail.ts for the
 * polling hand-off on the other end.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    logger.error("OAuth callback received error or missing params", {
      error,
      hasCode: Boolean(code),
      hasState: Boolean(state),
    });
    return page(
      "Authentication failed",
      `<h2>Authentication failed</h2><p>${escapeHtml(error || "Missing authorization code.")}</p>`,
      400
    );
  }

  stashAuthCode(state, code);
  logger.info("Stashed OAuth authorization code for client pickup");

  return page(
    "Authentication successful",
    `<h2>✓ Almost done</h2><p>You can close this window and return to Udaan.</p>`
  );
}
