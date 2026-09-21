// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, it, expect, vi } from "vitest";

import { takeAuthCode } from "@/lib/email/authCodeStore";

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }),
}));

const { GET } = await import("@/app/api/auth/callback/google/route");

function call(
  query: Record<string, string>,
  headers: Record<string, string> = {}
) {
  const url = new URL("http://localhost:3009/api/auth/callback/google");
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  return GET(new NextRequest(url, { headers }));
}

describe("Google OAuth callback page", () => {
  it("still hands the code to the waiting client under the full tagged state", async () => {
    await call({ code: "the-code", state: "udaan~st1" });

    expect(takeAuthCode("udaan~st1")).toBe("the-code");
  });

  it("desktop: shows success, an Open app button, and counts down 3s to the deep link", async () => {
    const res = await call(
      { code: "c", state: "udaan~st2" },
      { "x-nonce": "NONCE123" }
    );
    const html = await res.text();

    expect(res.status).toBe(200);
    expect(html).toContain("Open Udaan");
    expect(html).toContain('href="udaan://oauth-complete"');
    expect(html).toMatch(/id="count"[^>]*>3</);
    expect(html).toMatch(/Returning to Udaan in/);
  });

  it("canary: links to the canary scheme, not stable's", async () => {
    const html = await (
      await call({ code: "c", state: "udaan-canary~st3" })
    ).text();

    expect(html).toContain('href="udaan-canary://oauth-complete"');
    expect(html).not.toContain('href="udaan://');
  });

  it("web: links back into the web app instead of a custom scheme", async () => {
    const html = await (await call({ code: "c", state: "web~st4" })).text();

    expect(html).toContain('href="/settings"');
    expect(html).not.toMatch(/href="[a-z-]+:\/\/oauth-complete"/);
  });

  // proxy.ts sets script-src 'nonce-…' 'strict-dynamic' on every response; an
  // inline script without the request's nonce is blocked, so the countdown
  // would silently never run.
  it("puts the request's CSP nonce on the countdown script", async () => {
    const html = await (
      await call({ code: "c", state: "udaan~st5" }, { "x-nonce": "NONCE123" })
    ).text();

    expect(html).toMatch(/<script nonce="NONCE123">/);
  });

  it("escapes a hostile nonce instead of breaking out of the attribute", async () => {
    const html = await (
      await call(
        { code: "c", state: "udaan~st6" },
        { "x-nonce": '"><img src=x onerror=alert(1)>' }
      )
    ).text();

    expect(html).not.toContain("<img");
  });

  it("never reflects the state into the page or trusts a hostile scheme", async () => {
    const state = 'javascript:alert(1)"><b>pwn</b>~x';
    const html = await (await call({ code: "c", state })).text();

    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<b>pwn</b>");
    expect(html).toContain('href="/settings"');
  });

  it("the error page has no countdown and no auto-redirect", async () => {
    const res = await call({ error: "access_denied", state: "udaan~st7" });
    const html = await res.text();

    expect(res.status).toBe(400);
    expect(html).toContain("access_denied");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("oauth-complete");
  });
});
