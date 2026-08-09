import { describe, expect, it } from "vitest";

import { FLOW_CATALOG, nextPurposeFor } from "@/mcp/flows";

describe("nextPurposeFor", () => {
  it("walks the add_job chain in order", () => {
    expect(nextPurposeFor("parse_job")).toBe("analyze_ats");
    expect(nextPurposeFor("analyze_ats", { hasResume: false })).toBe(
      "generate_tailored_resume"
    );
    expect(nextPurposeFor("generate_tailored_resume")).toBe(
      "generate_cover_letter"
    );
    expect(nextPurposeFor("generate_cover_letter")).toBeNull();
  });

  it("disambiguates analyze_ats's two callers via hasResume", () => {
    // add_job: scoring the base profile, no tailored resume yet.
    expect(nextPurposeFor("analyze_ats", { hasResume: false })).toBe(
      "generate_tailored_resume"
    );
    // ats_fix: scoring the already-tailored resume directly.
    expect(nextPurposeFor("analyze_ats", { hasResume: true })).toBe(
      "fix_ats_issues"
    );
  });

  it("defaults hasResume to false when omitted", () => {
    expect(nextPurposeFor("analyze_ats")).toBe("generate_tailored_resume");
  });

  it("terminates flows whose remaining steps are apply_resume_ops, not another purpose", () => {
    expect(nextPurposeFor("extract_fields_to_edit")).toBeNull();
    expect(nextPurposeFor("proofread_resume")).toBeNull();
    expect(nextPurposeFor("fix_ats_issues")).toBeNull();
    expect(nextPurposeFor("humanize_content")).toBeNull();
  });

  it("terminates analyze_resume_gaps (apply is a separate apply_resume_ops call)", () => {
    expect(nextPurposeFor("analyze_resume_gaps")).toBeNull();
  });
});

describe("FLOW_CATALOG", () => {
  it("lists every flow named in the plan, in order", () => {
    const names = FLOW_CATALOG.map((flow) => flow.name);
    expect(names).toEqual([
      "add_job",
      "edit",
      "proofread",
      "ats_fix",
      "humanize",
      "cover_letter",
      "bookmark",
      "gap_analysis",
    ]);
  });

  it("orders bookmark as a single parse_job step (no chain — persistence is a submit-time flag, not a next purpose)", () => {
    const bookmark = FLOW_CATALOG.find((flow) => flow.name === "bookmark");
    expect(bookmark?.purposes).toEqual(["parse_job"]);
  });

  it("orders add_job as parse_job -> analyze_ats -> generate_tailored_resume -> generate_cover_letter", () => {
    const addJob = FLOW_CATALOG.find((flow) => flow.name === "add_job");
    expect(addJob?.purposes).toEqual([
      "parse_job",
      "analyze_ats",
      "generate_tailored_resume",
      "generate_cover_letter",
    ]);
  });

  it("orders ats_fix as analyze_ats -> fix_ats_issues", () => {
    const atsFix = FLOW_CATALOG.find((flow) => flow.name === "ats_fix");
    expect(atsFix?.purposes).toEqual(["analyze_ats", "fix_ats_issues"]);
  });
});
