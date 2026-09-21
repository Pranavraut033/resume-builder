import { describe, expect, it } from "vitest";

import { extractListingsHeuristically } from "@/lib/llm/listingExtractor";

describe("extractListingsHeuristically", () => {
  // Layout of LinkedIn's real plain-text digest (stored alert, row 18).
  const linkedin = `Your job alert for student job in Berlin
New jobs match your preferences.

Student Service und Event Specialist Berlin (m/w/d)
IU International University of Applied Sciences
Berlin

2 connections
View job: https://www.linkedin.com/comm/jobs/view/4458979763/?trackingId=a%3D%3D&refId=b

Senior Software Engineer
Kaliper · Mumbai (Remote)
Easy Apply
View job: https://www.linkedin.com/comm/jobs/view/4455903004/?trackingId=zzz

Manage alerts: https://www.linkedin.com/comm/jobs/alerts?lipi=x`;

  it("titles each posting from the lines above its link, skipping UI noise", () => {
    const out = extractListingsHeuristically(linkedin);
    expect(out).toEqual([
      expect.objectContaining({
        title: "Student Service und Event Specialist Berlin (m/w/d)",
        companyName: "IU International University of Applied Sciences",
        location: "Berlin",
        url: "https://www.linkedin.com/jobs/view/4458979763",
        source: "linkedin",
      }),
      expect.objectContaining({
        title: "Senior Software Engineer",
        companyName: "Kaliper",
        location: "Mumbai (Remote)",
        url: "https://www.linkedin.com/jobs/view/4455903004",
      }),
    ]);
  });

  it("does not let a header line become the first posting's title", () => {
    const out = extractListingsHeuristically(
      "New jobs match your preferences.\n\nReact Developer\nStripe · Berlin\nView job: https://www.linkedin.com/jobs/view/1"
    );
    expect(out[0].title).toBe("React Developer");
  });

  it("dedupes a posting that appears twice under different tracking params", () => {
    const out = extractListingsHeuristically(
      "A\nB\nhttps://www.linkedin.com/comm/jobs/view/1/?t=a\n\nC\nD\nhttps://www.linkedin.com/comm/jobs/view/1/?t=b"
    );
    expect(out).toHaveLength(1);
  });

  it("returns nothing when no job links are present", () => {
    expect(extractListingsHeuristically("hello there")).toEqual([]);
  });
});
