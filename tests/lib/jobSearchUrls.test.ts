import { describe, expect, it } from "vitest";

import { buildSearchUrls, JOB_SITES } from "@/lib/jobSearchUrls";

describe("JOB_SITES", () => {
  it("lists the four supported job sites", () => {
    expect(JOB_SITES.map((s) => s.key)).toEqual([
      "google",
      "linkedin",
      "indeed",
      "glassdoor",
    ]);
  });
});

describe("buildSearchUrls", () => {
  it("builds a URL for every job site", () => {
    const urls = buildSearchUrls("software engineer", "San Francisco");
    expect(Object.keys(urls).sort()).toEqual(
      ["glassdoor", "google", "indeed", "linkedin"].sort()
    );
  });

  it("URL-encodes the query and location", () => {
    const urls = buildSearchUrls("c++ dev", "New York, NY");
    expect(urls.linkedin).toContain("keywords=c%2B%2B%20dev");
    expect(urls.linkedin).toContain("location=New%20York%2C%20NY");
  });

  it("trims surrounding whitespace from query and location before encoding", () => {
    const urls = buildSearchUrls("  engineer  ", "  remote  ");
    expect(urls.indeed).toBe(
      "https://www.indeed.com/jobs?q=engineer&l=remote"
    );
  });

  it("produces the expected literal URL per site", () => {
    const urls = buildSearchUrls("nurse", "Austin");
    expect(urls.google).toBe(
      "https://www.google.com/search?q=nurse+jobs+Austin&ibp=htl;jobs"
    );
    expect(urls.glassdoor).toBe(
      "https://www.glassdoor.com/Job/jobs.htm?sc.keyword=nurse&locT=C&locId=Austin"
    );
  });
});
