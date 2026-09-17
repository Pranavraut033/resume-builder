import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, getGoogleUserInfo } from "@/lib/email/gmailClient";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger("GoogleOAuthCallback");

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    logger.error("OAuth callback received error", { error });
    return new NextResponse(
      `<html><body><h3>Authentication failed</h3><p>${error || "No code received"}</p><script>setTimeout(() => window.close(), 3000);</script></body></html>`,
      { headers: { "Content-Type": "text/html" }, status: 400 }
    );
  }

  try {
    const redirectUri = new URL("/api/auth/callback/google", request.url).toString();
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const userInfo = await getGoogleUserInfo(tokens.accessToken);

    // Save EmailAccount in Prisma
    await prisma.emailAccount.upsert({
      where: { email: userInfo.email },
      update: {
        provider: "GMAIL",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? undefined,
        tokenExpiry: new Date(Date.now() + tokens.expiresIn * 1000),
        isActive: true,
      },
      create: {
        email: userInfo.email,
        provider: "GMAIL",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiry: new Date(Date.now() + tokens.expiresIn * 1000),
        isActive: true,
      },
    });

    logger.info("Successfully connected Google email account", {
      email: userInfo.email,
    });

    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0d1117; color: #fff; }
            .card { text-align: center; background: #161b22; padding: 2.5rem; border-radius: 1rem; border: 1px solid #30363d; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
            h2 { margin: 0 0 0.5rem; color: #58a6ff; }
            p { margin: 0; color: #8b949e; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>✓ Gmail Connected Successfully</h2>
            <p>Signed in as <strong>${userInfo.email}</strong>. You can close this window now.</p>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', email: '${userInfo.email}' }, '*');
                setTimeout(() => window.close(), 1200);
              } else {
                setTimeout(() => { window.location.href = '/settings?email_connected=true'; }, 1500);
              }
            } catch (e) {
              window.location.href = '/settings?email_connected=true';
            }
          </script>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("Failed to complete OAuth token exchange", { error: errorMsg });
    return new NextResponse(
      `<html><body><h3>Authentication failed</h3><p>${errorMsg}</p><script>setTimeout(() => window.close(), 4000);</script></body></html>`,
      { headers: { "Content-Type": "text/html" }, status: 500 }
    );
  }
}
