import { describe, expect, it } from "vitest";

import {
  detectSource,
  normalizeListingUrl,
  shortenUrls,
} from "@/lib/email/listingUrl";

describe("normalizeListingUrl", () => {
  it("collapses LinkedIn digest tracking variants to one URL", () => {
    const a =
      "https://www.linkedin.com/comm/jobs/view/4123456789/?trackingId=abc&midToken=x";
    const b = "https://www.linkedin.com/jobs/view/4123456789?trackingId=zzz";
    expect(normalizeListingUrl(a)).toBe(normalizeListingUrl(b));
    expect(normalizeListingUrl(a)).toBe(
      "https://www.linkedin.com/jobs/view/4123456789"
    );
  });

  it("keeps Indeed's jk id and drops other params", () => {
    expect(
      normalizeListingUrl("https://de.indeed.com/viewjob?jk=abc123&from=alert")
    ).toBe("https://de.indeed.com/viewjob?jk=abc123");
  });

  it("returns unparseable input trimmed", () => {
    expect(normalizeListingUrl("  not a url ")).toBe("not a url");
  });
});

describe("detectSource", () => {
  it("maps hosts and falls back to other", () => {
    expect(detectSource("https://www.linkedin.com/jobs/view/1")).toBe(
      "linkedin"
    );
    expect(detectSource("https://www.stepstone.de/stellenangebote--x")).toBe(
      "stepstone"
    );
    expect(detectSource("https://example.com/job")).toBe("other");
    expect(detectSource("garbage")).toBe("other");
  });
});

describe("shortenUrls", () => {
  it("drops tracking params from every URL and leaves the prose alone", () => {
    const body = `Kaliper\nView job: https://www.linkedin.com/comm/jobs/view/1/?trackingId=${"a".repeat(600)}&x=y\nManage: https://www.linkedin.com/comm/jobs/alerts?lipi=zzz`;
    const out = shortenUrls(body);
    expect(out).toBe(
      "Kaliper\nView job: https://www.linkedin.com/jobs/view/1\nManage: https://www.linkedin.com/jobs/alerts"
    );
  });
});
