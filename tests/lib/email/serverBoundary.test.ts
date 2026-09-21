// @vitest-environment node
//
// The bug that broke the email tracker end to end never showed up in the
// default jsdom test environment: jsdom polyfills `window`/`localStorage`,
// so a server module reaching for a client-only global (keyStorage,
// gmailClient) looked fine under test and only failed on a real request.
// This file runs the actual server surface — every emailSync action, and
// the OAuth callback route — under Node with no `window` at all, which is
// what a Server Action / route handler actually runs in.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    emailAccount: {
      findFirst: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: 1, email: "a@b.com" }),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    jobEmail: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    },
    jobListing: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    job: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}));

describe("emailSync server surface (node environment, no window)", () => {
  beforeEach(() => {
    expect(typeof window).toBe("undefined");
  });

  it("imports and calls every emailSync action without a browser global", async () => {
    const actions = await import("@/actions/emailSync");

    await expect(actions.getEmailSyncStatus()).resolves.toBeDefined();
    await expect(actions.getSyncCursor()).resolves.toBeDefined();
    await expect(actions.filterNewMessageIds(["msg-1"])).resolves.toBeDefined();
    await expect(actions.upsertEmailAccount("a@b.com")).resolves.toBeDefined();
    await expect(actions.disconnectGoogleAccount()).resolves.toBeDefined();
    await expect(actions.consumeAuthCode("some-state")).resolves.toBeDefined();
    await expect(actions.wipeLegacyPlaintextTokens()).resolves.toBeUndefined();
    await expect(actions.persistClassifiedEmails(1, [])).resolves.toBeDefined();
    await expect(actions.getJobListings()).resolves.toEqual([]);
    await expect(actions.getMisfiledAlerts()).resolves.toEqual([]);
    await expect(actions.promoteStoredAlerts([])).resolves.toEqual({
      promoted: 0,
      listingsCreated: 0,
    });
  });

  it("imports the OAuth callback route without a browser global", async () => {
    await expect(
      import("@/app/api/auth/callback/google/route")
    ).resolves.toBeDefined();
  });
});
