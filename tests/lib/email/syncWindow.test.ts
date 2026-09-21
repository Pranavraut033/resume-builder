import { describe, expect, it } from "vitest";

import { MAX_EMAIL_AGE_DAYS, syncAfter } from "@/lib/email/syncWindow";

const NOW = Date.parse("2026-09-21T12:00:00Z");
const DAY = 86_400_000;

describe("syncAfter", () => {
  it("looks back MAX_EMAIL_AGE_DAYS when the pass has never run", () => {
    expect(syncAfter(null, NOW).getTime()).toBe(NOW - MAX_EMAIL_AGE_DAYS * DAY);
  });

  it("resumes 5 minutes before a recent cursor", () => {
    const cursor = new Date(NOW - 2 * DAY).toISOString();
    expect(syncAfter(cursor, NOW).getTime()).toBe(NOW - 2 * DAY - 5 * 60_000);
  });

  it("never goes back further than the age floor, however stale the cursor", () => {
    const stale = new Date(NOW - 200 * DAY).toISOString();
    expect(syncAfter(stale, NOW).getTime()).toBe(
      NOW - MAX_EMAIL_AGE_DAYS * DAY
    );
  });

  it("treats an unparseable cursor as never-run", () => {
    expect(syncAfter("garbage", NOW).getTime()).toBe(
      NOW - MAX_EMAIL_AGE_DAYS * DAY
    );
  });
});
