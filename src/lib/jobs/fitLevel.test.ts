import { describe, expect, it } from "vitest";

import { FitCheckJSON } from "@/types/fitCheck";

import { parseFitLevel, resolveFitLevel } from "./fitLevel";

const fitCheck: FitCheckJSON = {
  v: 2,
  fit_level: "strong",
  verdict: "Good match.",
  knockout_risks: [],
  gaps: [],
  strengths: [{ requirement: "X", evidence: "Y" }],
};

describe("parseFitLevel", () => {
  it("returns the fit_level for a valid v:2 blob", () => {
    expect(parseFitLevel(JSON.stringify(fitCheck))).toBe("strong");
  });

  it("returns null for null/undefined input", () => {
    expect(parseFitLevel(null)).toBeNull();
    expect(parseFitLevel(undefined)).toBeNull();
  });

  it("returns null for a pre-v:2 blob instead of throwing", () => {
    const stale = JSON.stringify({ fit_level: "strong", score: 80 });
    expect(parseFitLevel(stale)).toBeNull();
  });

  it("returns null for invalid JSON instead of throwing", () => {
    expect(parseFitLevel("not json")).toBeNull();
  });
});

describe("resolveFitLevel", () => {
  it("prefers resume.fitCheck over the job-level fitCheck once a resume exists", () => {
    const resumeFitCheck: FitCheckJSON = { ...fitCheck, fit_level: "mismatch" };
    const result = resolveFitLevel({
      fitCheck: { contentJson: JSON.stringify(fitCheck) },
      resume: { fitCheck: { contentJson: JSON.stringify(resumeFitCheck) } },
    });
    expect(result).toBe("mismatch");
  });

  it("falls back to the job-level fitCheck when there's no resume yet", () => {
    const result = resolveFitLevel({
      fitCheck: { contentJson: JSON.stringify(fitCheck) },
      resume: null,
    });
    expect(result).toBe("strong");
  });

  it("returns null when neither is present", () => {
    expect(resolveFitLevel({ fitCheck: null, resume: null })).toBeNull();
  });
});
