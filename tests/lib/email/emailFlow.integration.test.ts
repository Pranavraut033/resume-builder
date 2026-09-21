// End-to-end flow: connect Gmail → token exchange → account → sync → fetch →
// classify → dedupe → persist. Real: connectGmail, gmailClient, oauthPkce,
// classifyEmail (keyword heuristic — no LLM model configured), runEmailSync.
// Faked: the network (Google endpoints), keyStorage, the system browser, and
// the DB-backed server actions (an in-memory stand-in with the same contract).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import type { ClassifiedEmailInput } from "@/actions/emailSync";

const keys = new Map<string, string>();
vi.mock("@/lib/keyStorage", () => ({
  getApiKey: vi.fn(async (k: string) => keys.get(k) ?? null),
  setApiKey: vi.fn(async (k: string, v: string) => void keys.set(k, v)),
  deleteApiKey: vi.fn(async (k: string) => void keys.delete(k)),
  isTauriContext: () => false,
}));

const opened: string[] = [];
vi.mock("@/lib/externalLink", () => ({
  openExternalUrl: vi.fn(async (u: string) => void opened.push(u)),
}));

vi.mock("@/components/AppShell", () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

// In-memory stand-in for src/actions/emailSync.ts (Prisma-backed in prod).
const db = {
  account: null as {
    id: number;
    email: string;
    lastSyncedAt: Date | null;
  } | null,
  emails: [] as ClassifiedEmailInput[],
  // Digests stored before `kind` existed (unlinked APPLICATION rows).
  misfiled: [] as {
    id: number;
    sender: string;
    subject: string;
    snippet: string;
    bodyText: string | null;
  }[],
  promoted: [] as { emailId: number; listings: unknown[] }[],
  pendingCode: null as { state: string; code: string } | null,
};
vi.mock("@/actions/emailSync", () => ({
  // Stands in for the OAuth callback route having stashed the code.
  consumeAuthCode: vi.fn(async (state: string) => {
    const hit = db.pendingCode?.state === state ? db.pendingCode.code : null;
    if (hit) db.pendingCode = null;
    return { code: hit };
  }),
  upsertEmailAccount: vi.fn(async (email: string) => {
    db.account ??= { id: 1, email, lastSyncedAt: null };
    return { id: db.account.id };
  }),
  getSyncCursor: vi.fn(async () => ({
    accountId: db.account?.id ?? null,
    lastSyncedAt: db.account?.lastSyncedAt?.toISOString() ?? null,
    alertsAfter:
      db.emails
        .filter((e) => e.classification.kind === "ALERT")
        .map((e) => e.receivedAt)
        .sort()
        .at(-1) ?? null,
  })),
  getMisfiledAlerts: vi.fn(async () => db.misfiled),
  promoteStoredAlerts: vi.fn(
    async (items: { emailId: number; listings: unknown[] }[]) => {
      db.promoted.push(...items);
      return {
        promoted: items.length,
        listingsCreated: items.reduce((n, i) => n + i.listings.length, 0),
      };
    }
  ),
  filterNewMessageIds: vi.fn(async (ids: string[]) => {
    const seen = new Set(db.emails.map((e) => e.messageId));
    return ids.filter((id) => !seen.has(id));
  }),
  persistClassifiedEmails: vi.fn(
    async (_accountId: number, rows: ClassifiedEmailInput[]) => {
      db.emails.push(...rows);
      if (db.account) db.account.lastSyncedAt = new Date();
      return {
        created: rows.length,
        listingsCreated: rows.reduce(
          (n, r) => n + (r.listings?.length ?? 0),
          0
        ),
        matchedJobIds: [],
        failedMessageIds: [],
      };
    }
  ),
}));

const b64 = (s: string) => Buffer.from(s, "utf-8").toString("base64url");
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

function gmailMessage(
  id: string,
  subject: string,
  from: string,
  body: string,
  date = "Mon, 05 Jan 2026 09:00:00 +0000"
) {
  return {
    id,
    threadId: `t-${id}`,
    snippet: body.slice(0, 40),
    internalDate: String(Date.now()),
    payload: {
      headers: [
        { name: "Subject", value: subject },
        { name: "From", value: from },
        { name: "To", value: "me@gmail.com" },
        { name: "Date", value: date },
      ],
      body: { data: b64(body) },
    },
  };
}

const INBOX = [
  gmailMessage(
    "interview",
    "Interview invitation",
    "Recruiting at Stripe <jobs@stripe.com>",
    "We would like to schedule a call to speak with you."
  ),
  gmailMessage(
    "reject",
    "Your application",
    "no-reply@greenhouse.io",
    "Unfortunately we are not moving forward with your application."
  ),
  gmailMessage(
    "newsletter",
    "Application performance tips",
    "digest@blog.example.com",
    "Ten ways to make your web app faster."
  ),
];

// Returned only for the job-alert query, so tests opt in to digests.
let alertInbox: ReturnType<typeof gmailMessage>[] = [];

let listQueries: string[];
let tokenCalls: URLSearchParams[];

function installGoogle() {
  listQueries = [];
  tokenCalls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.host === "oauth2.googleapis.com") {
        tokenCalls.push(new URLSearchParams(String(init?.body)));
        return json({
          access_token: "ACCESS-1",
          refresh_token: "REFRESH-1",
          expires_in: 3600,
        });
      }
      if (url.pathname === "/oauth2/v2/userinfo") {
        return json({ email: "me@gmail.com" });
      }
      if (url.pathname === "/gmail/v1/users/me/messages") {
        const q = url.searchParams.get("q") ?? "";
        listQueries.push(q);
        const list = q.includes("linkedin.com") ? alertInbox : INBOX;
        return json({
          messages: list.map((m) => ({ id: m.id, threadId: m.threadId })),
        });
      }
      const match = url.pathname.match(/\/messages\/([^/]+)$/);
      const msg = [...INBOX, ...alertInbox].find((m) => m.id === match?.[1]);
      return msg ? json(msg) : new Response("not found", { status: 404 });
    })
  );
}

// Imported after the mocks so the real modules bind to them.
const { connectGmail } = await import("@/lib/email/connectGmail");
const { runEmailSync } = await import("@/lib/email/runEmailSync");
const { getValidAccessToken } = await import("@/lib/email/gmailClient");
const { useNotificationStore } = await import("@/store/notificationStore");

beforeEach(() => {
  keys.clear();
  opened.length = 0;
  db.account = null;
  db.emails = [];
  db.misfiled = [];
  db.promoted = [];
  alertInbox = [];
  db.pendingCode = null;
  useNotificationStore.getState().clear();
  vi.useFakeTimers({ toFake: ["setTimeout", "Date"] });
  // A build/dev instance with a client configured (NEXT_PUBLIC_* or Settings).
  keys.set("google_custom_client_id", "test-client.apps.googleusercontent.com");
  installGoogle();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function connect() {
  const pending = connectGmail();
  // User consents in the system browser; the callback route stashes the code.
  // PKCE hashing is real async crypto, so wait for the consent URL to open.
  await vi.waitFor(() => expect(opened).toHaveLength(1));
  const state = new URL(opened[0]).searchParams.get("state")!;
  db.pendingCode = { state, code: "AUTH-CODE" };
  await vi.advanceTimersByTimeAsync(2000);
  return pending;
}

describe("email tracking, connect → fetch", () => {
  it("connects, stores tokens, and records the account", async () => {
    const result = await connect();

    expect(result).toEqual({ email: "me@gmail.com" });
    const authUrl = new URL(opened[0]);
    expect(authUrl.searchParams.get("client_id")).toBe(
      "test-client.apps.googleusercontent.com"
    );
    expect(authUrl.searchParams.get("code_challenge_method")).toBe("S256");
    expect(authUrl.searchParams.get("scope")).toContain("gmail.readonly");
    // PKCE: the verifier sent at exchange must match the challenge sent at consent.
    expect(tokenCalls[0].get("code")).toBe("AUTH-CODE");
    expect(tokenCalls[0].get("code_verifier")).toBeTruthy();
    expect(await getValidAccessToken()).toBe("ACCESS-1");
    expect(db.account?.email).toBe("me@gmail.com");
  });

  it("first sync fetches the inbox, keeps only recruiting emails, and persists them", async () => {
    await connect();

    const result = await runEmailSync(true);

    expect(result).toMatchObject({ status: "OK", newEmailsCount: 2 });
    expect(db.emails.map((e) => e.messageId).sort()).toEqual([
      "interview",
      "reject",
    ]);
    const byId = Object.fromEntries(db.emails.map((e) => [e.messageId, e]));
    expect(byId.interview.classification.stage).toBe("INTERVIEW");
    expect(byId.reject.classification.stage).toBe("REJECTED");
    expect(byId.interview.classification.companyName).toBe("Stripe");
    // The first sync looks back MAX_EMAIL_AGE_DAYS (28).
    const cutoff = Number(listQueries[0].match(/after:(\d+)/)![1]) * 1000;
    const days = (Date.now() - cutoff) / 86_400_000;
    expect(days).toBeGreaterThan(27.9);
    expect(days).toBeLessThan(28.1);
  });

  it("never reaches back past 28 days, even when the last sync is far older", async () => {
    await connect();
    db.account!.lastSyncedAt = new Date(Date.now() - 90 * 86_400_000);

    await runEmailSync(true);

    const cutoff = Number(listQueries[0].match(/after:(\d+)/)![1]) * 1000;
    expect((Date.now() - cutoff) / 86_400_000).toBeLessThan(28.1);
  });

  it("a second sync re-fetches from just before the last sync and never duplicates", async () => {
    await connect();
    await runEmailSync(true);
    const lastSynced = db.account!.lastSyncedAt!.getTime();

    const second = await runEmailSync(true);

    expect(second).toMatchObject({ status: "OK", newEmailsCount: 0 });
    expect(db.emails).toHaveLength(2);
    // Each sync lists twice (applications, then job alerts), so the second
    // sync's application query is index 2.
    expect(listQueries).toHaveLength(4);
    expect(listQueries[1]).toContain("linkedin.com");
    const cutoff = Number(listQueries[2].match(/after:(\d+)/)![1]) * 1000;
    // 5 minute overlap so nothing arriving mid-sync is missed.
    expect(lastSynced - cutoff).toBeGreaterThanOrEqual(5 * 60_000 - 1000);
    expect(lastSynced - cutoff).toBeLessThanOrEqual(5 * 60_000 + 1000);
  });

  it("reports NOT_CONNECTED before any sign-in and fetches nothing", async () => {
    const result = await runEmailSync(true);

    expect(result.status).toBe("NOT_CONNECTED");
    expect(listQueries).toHaveLength(0);
  });

  it("surfaces NEEDS_REAUTH when Google revokes the refresh token, then stops", async () => {
    await connect();
    keys.set("google_oauth_token_expiry", "0");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response('{"error":"invalid_grant"}', { status: 400 })
      )
    );

    const result = await runEmailSync(true);

    expect(result.status).toBe("NEEDS_REAUTH");
    expect(keys.has("google_oauth_refresh_token")).toBe(false);
  });

  it("reports ERROR (not a silent success) when Gmail listing fails", async () => {
    await connect();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("quota", { status: 429 }))
    );

    const result = await runEmailSync(true);

    expect(result.status).toBe("ERROR");
    expect(result.error).toContain("429");
    expect(db.emails).toHaveLength(0);
  });
});

describe("job alerts", () => {
  // LinkedIn's plain-text digest: one tracking-laden URL per posting.
  const trackedUrl = (id: number) =>
    `https://www.linkedin.com/comm/jobs/view/${id}/?trackingId=${"x".repeat(500)}&refId=abc`;
  const DIGEST_DATE = new Date(Date.now() - 2 * 86_400_000);
  const digest = gmailMessage(
    "kaliper",
    "Senior Software Engineer job at Kaliper",
    "LinkedIn Job Alerts <jobalerts-noreply@linkedin.com>",
    `Your job alert for senior web developer\n\nSenior Software Engineer\nKaliper · Mumbai (Remote)\nView job: ${trackedUrl(111)}\n\nFull Stack Engineer\nAccenture in India\nView job: ${trackedUrl(222)}\n`,
    DIGEST_DATE.toUTCString()
  );

  it("backfills 28 days on the first sync and stores each posting from the digest", async () => {
    alertInbox = [digest];
    await connect();

    await runEmailSync(true);

    const alertQuery = listQueries.find((q) => q.includes("linkedin.com"))!;
    const days =
      (Date.now() - Number(alertQuery.match(/after:(\d+)/)![1]) * 1000) /
      86_400_000;
    expect(days).toBeGreaterThan(27.9);
    expect(days).toBeLessThan(28.1);

    const row = db.emails.find((e) => e.messageId === "kaliper")!;
    expect(row.classification.kind).toBe("ALERT");
    expect(row.classification.stage).toBeNull();
    expect(row.listings?.map((l) => l.url)).toEqual([
      "https://www.linkedin.com/jobs/view/111",
      "https://www.linkedin.com/jobs/view/222",
    ]);
    // Tracking params were stripped before the body was stored, so a long
    // digest isn't truncated after its first posting.
    expect(row.bodyText).not.toContain("trackingId");
  });

  it("resumes the alert pass from the newest stored digest, not lastSyncedAt", async () => {
    alertInbox = [digest];
    await connect();
    await runEmailSync(true);
    // An application-only sync moved lastSyncedAt to "now"; alerts must not follow it.
    expect(db.account!.lastSyncedAt!.getTime()).toBeGreaterThan(
      DIGEST_DATE.getTime()
    );
    listQueries.length = 0;

    await runEmailSync(true);

    const alertQuery = listQueries.find((q) => q.includes("linkedin.com"))!;
    const cutoff = Number(alertQuery.match(/after:(\d+)/)![1]) * 1000;
    // toUTCString drops milliseconds; the cursor is the digest's second minus the 5 min overlap.
    expect(cutoff).toBe(
      Math.floor(DIGEST_DATE.getTime() / 1000) * 1000 - 5 * 60_000
    );
  });

  it("converts digests stored as applications before alerts existed", async () => {
    db.misfiled = [
      {
        id: 10,
        sender: "LinkedIn Job Alerts <jobalerts-noreply@linkedin.com>",
        subject: "Student Service Specialist at IU",
        snippet: "Your job alert",
        bodyText: `IU International\nView job: ${trackedUrl(4458979763)}`,
      },
    ];
    await connect();

    await runEmailSync(true);

    expect(db.promoted).toHaveLength(1);
    expect(db.promoted[0].emailId).toBe(10);
    expect(db.promoted[0].listings).toEqual([
      expect.objectContaining({
        url: "https://www.linkedin.com/jobs/view/4458979763",
        source: "linkedin",
      }),
    ]);
  });
});
