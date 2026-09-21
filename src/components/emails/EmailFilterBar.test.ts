import { describe, expect, it } from "vitest";

import {
  DEFAULT_EMAIL_FILTERS,
  hasActiveEmailFilters,
  matchesEmailFilters,
} from "./EmailFilterBar";

const base = {
  hiddenAt: null,
  actionRequired: false,
  jobId: 1 as number | null,
  stage: "APPLIED" as string | null,
  subject: "Interview invite — Backend Engineer",
  sender: "recruiter@acme.com",
  companyName: null as string | null,
  snippet: "We'd love to chat next week",
};

describe("matchesEmailFilters", () => {
  it("passes a visible email under default filters", () => {
    expect(matchesEmailFilters(base, DEFAULT_EMAIL_FILTERS)).toBe(true);
  });

  it("excludes hidden emails unless showHidden is on", () => {
    const hidden = { ...base, hiddenAt: new Date() };
    expect(matchesEmailFilters(hidden, DEFAULT_EMAIL_FILTERS)).toBe(false);
    expect(
      matchesEmailFilters(hidden, {
        ...DEFAULT_EMAIL_FILTERS,
        showHidden: true,
      })
    ).toBe(true);
  });

  it("actionRequired keeps only emails that need action", () => {
    const f = { ...DEFAULT_EMAIL_FILTERS, actionRequired: true };
    expect(matchesEmailFilters(base, f)).toBe(false);
    expect(matchesEmailFilters({ ...base, actionRequired: true }, f)).toBe(
      true
    );
  });

  it("unlinked keeps only emails with no job", () => {
    const f = { ...DEFAULT_EMAIL_FILTERS, unlinked: true };
    expect(matchesEmailFilters(base, f)).toBe(false);
    expect(matchesEmailFilters({ ...base, jobId: null }, f)).toBe(true);
  });

  it("stage chips OR together and drop emails with no stage", () => {
    const f = { ...DEFAULT_EMAIL_FILTERS, stages: ["INTERVIEW", "OFFER"] };
    expect(matchesEmailFilters({ ...base, stage: "OFFER" }, f)).toBe(true);
    expect(matchesEmailFilters({ ...base, stage: "APPLIED" }, f)).toBe(false);
    expect(matchesEmailFilters({ ...base, stage: null }, f)).toBe(false);
  });

  it("search matches the extracted company, not just the relaying sender", () => {
    const linkedin = {
      ...base,
      sender: "LinkedIn <jobs-noreply@linkedin.com>",
      companyName: "Jobgether",
    };
    expect(
      matchesEmailFilters(linkedin, {
        ...DEFAULT_EMAIL_FILTERS,
        search: "jobgether",
      })
    ).toBe(true);
  });

  it("search is case-insensitive across subject, sender and snippet", () => {
    const search = (q: string) =>
      matchesEmailFilters(base, { ...DEFAULT_EMAIL_FILTERS, search: q });
    expect(search("BACKEND")).toBe(true);
    expect(search("acme.com")).toBe(true);
    expect(search("next week")).toBe(true);
    expect(search("globex")).toBe(false);
  });
});

describe("hasActiveEmailFilters", () => {
  it("is false for defaults and ignores whitespace-only search", () => {
    expect(hasActiveEmailFilters(DEFAULT_EMAIL_FILTERS)).toBe(false);
    expect(
      hasActiveEmailFilters({ ...DEFAULT_EMAIL_FILTERS, search: "   " })
    ).toBe(false);
  });

  it("is true when any filter is set", () => {
    expect(
      hasActiveEmailFilters({ ...DEFAULT_EMAIL_FILTERS, unlinked: true })
    ).toBe(true);
  });
});
