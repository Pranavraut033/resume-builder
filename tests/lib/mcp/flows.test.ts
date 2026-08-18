import { describe, expect, it } from "vitest";

import { FLOW_CATALOG, nextPurposeFor } from "@/mcp/flows";

describe("nextPurposeFor", () => {
  it("walks the add_job chain in order", () => {
    expect(nextPurposeFor("parse_job")).toBe("analyze_document");
    expect(nextPurposeFor("analyze_document", { hasResume: false })).toBe(
      "generate_tailored_resume"
    );
    expect(nextPurposeFor("generate_tailored_resume")).toBe(
      "generate_cover_letter"
    );
    expect(nextPurposeFor("generate_cover_letter")).toBeNull();
  });

  it("disambiguates analyze_document's two callers via hasResume", () => {
    // add_job: scoring the base profile, no tailored resume yet — continue
    // on to tailoring.
    expect(nextPurposeFor("analyze_document", { hasResume: false })).toBe(
      "generate_tailored_resume"
    );
    // document_fix: scoring the already-tailored resume directly — the
    // flow ends here (the caller turns findings into ops itself, via
    // align_resume_terms or apply_resume_ops, not another purpose).
    expect(nextPurposeFor("analyze_document", { hasResume: true })).toBeNull();
  });

  it("defaults hasResume to false when omitted", () => {
    expect(nextPurposeFor("analyze_document")).toBe("generate_tailored_resume");
  });

  it("terminates flows whose remaining steps are apply_resume_ops/align_resume_terms, not another purpose", () => {
    expect(nextPurposeFor("extract_fields_to_edit")).toBeNull();
    expect(nextPurposeFor("humanize_content")).toBeNull();
  });

  it("terminates analyze_fit (it has no apply path at all)", () => {
    expect(nextPurposeFor("analyze_fit")).toBeNull();
  });
});

describe("FLOW_CATALOG", () => {
  it("lists every flow named in the plan, in order", () => {
    const names = FLOW_CATALOG.map((flow) => flow.name);
    expect(names).toEqual([
      "add_job",
      "edit",
      "document_fix",
      "humanize",
      "cover_letter",
      "bookmark",
      "fit_check",
    ]);
  });

  it("orders bookmark as a single parse_job step (no chain — persistence is a submit-time flag, not a next purpose)", () => {
    const bookmark = FLOW_CATALOG.find((flow) => flow.name === "bookmark");
    expect(bookmark?.purposes).toEqual(["parse_job"]);
  });

  it("orders add_job as parse_job -> analyze_document -> generate_tailored_resume -> generate_cover_letter", () => {
    const addJob = FLOW_CATALOG.find((flow) => flow.name === "add_job");
    expect(addJob?.purposes).toEqual([
      "parse_job",
      "analyze_document",
      "generate_tailored_resume",
      "generate_cover_letter",
    ]);
  });

  it("orders document_fix as a single analyze_document step (align_resume_terms/apply_resume_ops are tools, not purposes)", () => {
    const documentFix = FLOW_CATALOG.find(
      (flow) => flow.name === "document_fix"
    );
    expect(documentFix?.purposes).toEqual(["analyze_document"]);
  });

  it("orders fit_check as a single analyze_fit step", () => {
    const fitCheck = FLOW_CATALOG.find((flow) => flow.name === "fit_check");
    expect(fitCheck?.purposes).toEqual(["analyze_fit"]);
  });
});
