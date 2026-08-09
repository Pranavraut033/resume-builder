import { describe, expect, it } from "vitest";

import { Gap, gapFixesToResumeOps } from "@/types/gapAnalysis";

function makeGap(overrides: Partial<Gap> = {}): Gap {
  return {
    requirement: "5+ years operating Kafka at scale",
    severity: "major",
    gap_type: "understated",
    evidence_in_resume: "Owns the checkout and payments platform.",
    solution: "Quantify the Kafka throughput/scale actually owned.",
    resume_fix: {
      op: "replace",
      path: "/experience/0/description",
      value:
        "Owns the checkout and payments platform, processing 2M+ Kafka events/day.",
    },
    ...overrides,
  };
}

describe("gapFixesToResumeOps", () => {
  it("skips gaps with a null resume_fix and maps the rest to ResumeOps", () => {
    const gaps: Gap[] = [
      makeGap({
        requirement: "Kafka at scale",
        resume_fix: {
          op: "replace",
          path: "/experience/0/description",
          value: "Fixed description.",
        },
      }),
      makeGap({
        requirement: "5+ years leading a team",
        gap_type: "seniority",
        resume_fix: null,
      }),
      makeGap({
        requirement: "PostgreSQL at scale",
        resume_fix: {
          op: "add",
          path: "/skills/-",
          value: { name: "PostgreSQL", category: "Databases", tier: null },
        },
      }),
    ];

    const ops = gapFixesToResumeOps(gaps);

    expect(ops).toEqual([
      {
        op: "replace",
        path: "/experience/0/description",
        value: "Fixed description.",
      },
      {
        op: "add",
        path: "/skills/-",
        value: { name: "PostgreSQL", category: "Databases", tier: null },
      },
    ]);
  });

  it("preserves the order of the gaps that had a fix", () => {
    const gaps: Gap[] = [
      makeGap({
        requirement: "First",
        resume_fix: { op: "replace", path: "/summary", value: "First fix." },
      }),
      makeGap({
        requirement: "Second (unfixable)",
        gap_type: "missing",
        resume_fix: null,
      }),
      makeGap({
        requirement: "Third",
        resume_fix: {
          op: "replace",
          path: "/experience/0/achievements/0",
          value: "Third fix.",
        },
      }),
      makeGap({
        requirement: "Fourth",
        resume_fix: {
          op: "remove",
          path: "/experience/0/achievements/1",
          value: null,
        },
      }),
    ];

    const ops = gapFixesToResumeOps(gaps);

    expect(ops.map((op) => op.path)).toEqual([
      "/summary",
      "/experience/0/achievements/0",
      "/experience/0/achievements/1",
    ]);
  });

  it("returns an empty array for an empty gaps list", () => {
    expect(gapFixesToResumeOps([])).toEqual([]);
  });

  it("returns an empty array when every gap has a null resume_fix", () => {
    const gaps: Gap[] = [
      makeGap({ gap_type: "missing", resume_fix: null }),
      makeGap({ gap_type: "seniority", resume_fix: null }),
    ];

    expect(gapFixesToResumeOps(gaps)).toEqual([]);
  });
});
