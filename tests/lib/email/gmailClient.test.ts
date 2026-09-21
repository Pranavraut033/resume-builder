import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const store = new Map<string, string>();
vi.mock("@/lib/keyStorage", () => ({
  getApiKey: vi.fn(async (k: string) => store.get(k) ?? null),
  setApiKey: vi.fn(async (k: string, v: string) => void store.set(k, v)),
  deleteApiKey: vi.fn(async (k: string) => void store.delete(k)),
}));

const gmail = await import("@/lib/email/gmailClient");

const b64 = (s: string) => Buffer.from(s, "utf-8").toString("base64url");
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

function rawMessage(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    threadId: `t-${id}`,
    snippet: "snip",
    internalDate: String(Date.UTC(2026, 0, 2)),
    payload: {
      headers: [
        { name: "subject", value: "Interview invite" },
        { name: "FROM", value: "Recruiter <r@stripe.com>" },
        { name: "To", value: "me@gmail.com" },
        { name: "Date", value: "Thu, 01 Jan 2026 10:00:00 +0000" },
      ],
      body: { data: b64("hello body") },
    },
    ...over,
  };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  store.clear();
  // vitest doesn't load .env.local, so configure a client the way Settings does.
  store.set(
    "google_custom_client_id",
    "test-client.apps.googleusercontent.com"
  );
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchRecruitingEmails", () => {
  it("lists with the default recruiting query plus an after: cutoff and a bearer token", async () => {
    fetchMock.mockResolvedValueOnce(json({ messages: [] }));

    const cutoff = new Date("2026-01-01T00:00:00Z");
    await gmail.fetchRecruitingEmails("tok", { afterTimestamp: cutoff });

    const [url, init] = fetchMock.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.pathname).toBe("/gmail/v1/users/me/messages");
    expect(parsed.searchParams.get("q")).toContain("interview");
    expect(parsed.searchParams.get("q")).toContain(
      `after:${Math.floor(cutoff.getTime() / 1000)}`
    );
    expect(init.headers.Authorization).toBe("Bearer tok");
  });

  it("fetches each listed message in full and parses headers case-insensitively", async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({ messages: [{ id: "m1", threadId: "t-m1" }] })
      )
      .mockResolvedValueOnce(json(rawMessage("m1")));

    const [email] = await gmail.fetchRecruitingEmails("tok");

    expect(fetchMock.mock.calls[1][0]).toContain("/messages/m1?format=full");
    expect(email).toMatchObject({
      messageId: "m1",
      threadId: "t-m1",
      subject: "Interview invite",
      sender: "Recruiter <r@stripe.com>",
      recipient: "me@gmail.com",
      bodyText: "hello body",
    });
    expect(email.date.toISOString()).toBe("2026-01-01T10:00:00.000Z");
  });

  it("follows nextPageToken across list pages", async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({ messages: [{ id: "a", threadId: "a" }], nextPageToken: "P2" })
      )
      .mockResolvedValueOnce(json({ messages: [{ id: "b", threadId: "b" }] }))
      .mockResolvedValueOnce(json(rawMessage("a")))
      .mockResolvedValueOnce(json(rawMessage("b")));

    const emails = await gmail.fetchRecruitingEmails("tok");

    expect(
      new URL(fetchMock.mock.calls[1][0]).searchParams.get("pageToken")
    ).toBe("P2");
    expect(emails.map((e) => e.messageId)).toEqual(["a", "b"]);
  });

  it("extracts text/plain from nested multipart bodies", async () => {
    const nested = rawMessage("m1", {
      payload: {
        headers: [{ name: "Subject", value: "s" }],
        parts: [
          {
            mimeType: "multipart/alternative",
            parts: [
              { mimeType: "text/html", body: { data: b64("<b>html</b>") } },
              { mimeType: "text/plain", body: { data: b64("plain ünïcode") } },
            ],
          },
        ],
      },
    });
    fetchMock
      .mockResolvedValueOnce(json({ messages: [{ id: "m1", threadId: "t" }] }))
      .mockResolvedValueOnce(json(nested));

    const [email] = await gmail.fetchRecruitingEmails("tok");

    expect(email.bodyText).toBe("plain ünïcode");
  });

  it("falls back to internalDate when the Date header is missing or unparseable", async () => {
    const noDate = rawMessage("m1");
    noDate.payload.headers = noDate.payload.headers.filter(
      (h) => h.name !== "Date"
    );
    fetchMock
      .mockResolvedValueOnce(json({ messages: [{ id: "m1", threadId: "t" }] }))
      .mockResolvedValueOnce(json(noDate));

    const [email] = await gmail.fetchRecruitingEmails("tok");

    expect(email.date.toISOString()).toBe("2026-01-02T00:00:00.000Z");
  });

  it("truncates body text to 4000 characters", async () => {
    const big = rawMessage("m1");
    big.payload.body.data = b64("x".repeat(9000));
    fetchMock
      .mockResolvedValueOnce(json({ messages: [{ id: "m1", threadId: "t" }] }))
      .mockResolvedValueOnce(json(big));

    const [email] = await gmail.fetchRecruitingEmails("tok");

    expect(email.bodyText).toHaveLength(4000);
  });

  it("skips a message whose fetch fails and keeps the rest", async () => {
    fetchMock
      .mockResolvedValueOnce(
        json({
          messages: [
            { id: "bad", threadId: "t" },
            { id: "good", threadId: "t" },
          ],
        })
      )
      .mockResolvedValueOnce(new Response("nope", { status: 500 }))
      .mockResolvedValueOnce(json(rawMessage("good")));

    const emails = await gmail.fetchRecruitingEmails("tok");

    expect(emails.map((e) => e.messageId)).toEqual(["good"]);
  });

  it("caps one sync at 250 messages even if Gmail keeps paging", async () => {
    const page = (n: number) => ({
      messages: Array.from({ length: n }, (_, i) => ({
        id: `m${i}`,
        threadId: "t",
      })),
      nextPageToken: "more",
    });
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/messages?")) {
        const size = Number(new URL(url).searchParams.get("maxResults"));
        return json(page(size));
      }
      return json(rawMessage("x"));
    });

    const emails = await gmail.fetchRecruitingEmails("tok", {
      maxResults: 10_000,
    });

    expect(emails).toHaveLength(250);
  });

  it("throws when the list request itself fails", async () => {
    fetchMock.mockResolvedValueOnce(new Response("denied", { status: 403 }));

    await expect(gmail.fetchRecruitingEmails("tok")).rejects.toThrow(
      "Failed to list Gmail messages: 403"
    );
  });
});

describe("token lifecycle", () => {
  it("exchangeCodeForTokens sends the PKCE verifier and stores the tokens", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ access_token: "A", refresh_token: "R", expires_in: 3600 })
    );

    const tokens = await gmail.exchangeCodeForTokens(
      "code",
      "http://x/cb",
      "ver"
    );

    const body = new URLSearchParams(fetchMock.mock.calls[0][1].body);
    expect(body.get("code")).toBe("code");
    expect(body.get("code_verifier")).toBe("ver");
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(tokens.accessToken).toBe("A");
    expect(store.get("google_oauth_access_token")).toBe("A");
    expect(store.get("google_oauth_refresh_token")).toBe("R");
    expect(Number(store.get("google_oauth_token_expiry"))).toBeGreaterThan(
      Date.now()
    );
  });

  it("getValidAccessToken returns null when nothing is stored", async () => {
    await expect(gmail.getValidAccessToken()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("getValidAccessToken returns the cached token while it is fresh", async () => {
    store.set("google_oauth_access_token", "cached");
    store.set("google_oauth_refresh_token", "R");
    store.set("google_oauth_token_expiry", String(Date.now() + 10 * 60_000));

    await expect(gmail.getValidAccessToken()).resolves.toBe("cached");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("getValidAccessToken refreshes a token that is about to expire", async () => {
    store.set("google_oauth_access_token", "stale");
    store.set("google_oauth_refresh_token", "R");
    store.set("google_oauth_token_expiry", String(Date.now() + 30_000));
    fetchMock.mockResolvedValueOnce(
      json({ access_token: "fresh", expires_in: 3600 })
    );

    await expect(gmail.getValidAccessToken()).resolves.toBe("fresh");

    const body = new URLSearchParams(fetchMock.mock.calls[0][1].body);
    expect(body.get("grant_type")).toBe("refresh_token");
    expect(body.get("refresh_token")).toBe("R");
    expect(store.get("google_oauth_access_token")).toBe("fresh");
  });

  it("an invalid_grant refresh clears the tokens and demands reconnect", async () => {
    store.set("google_oauth_access_token", "stale");
    store.set("google_oauth_refresh_token", "R");
    store.set("google_oauth_token_expiry", "0");
    fetchMock.mockResolvedValueOnce(
      new Response('{"error":"invalid_grant"}', { status: 400 })
    );

    await expect(gmail.getValidAccessToken()).rejects.toBeInstanceOf(
      gmail.GoogleReauthRequiredError
    );
    expect(store.has("google_oauth_access_token")).toBe(false);
    expect(store.has("google_oauth_refresh_token")).toBe(false);
    expect(store.has("google_oauth_token_expiry")).toBe(false);
  });

  it("a transient refresh failure returns null without wiping tokens", async () => {
    store.set("google_oauth_access_token", "stale");
    store.set("google_oauth_refresh_token", "R");
    store.set("google_oauth_token_expiry", "0");
    fetchMock.mockResolvedValueOnce(new Response("oops", { status: 503 }));

    await expect(gmail.getValidAccessToken()).resolves.toBeNull();
    expect(store.get("google_oauth_refresh_token")).toBe("R");
  });
});
