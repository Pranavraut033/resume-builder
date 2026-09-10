import { describe, expect, it } from "vitest";

import { FitCheckJSON } from "@/types/fitCheck";

import { DEFAULT_FILTERS, matchesFilters } from "./FilterBar";

const strongFitCheck: FitCheckJSON = {
  v: 2,
  fit_level: "strong",
  verdict: "Good match.",
  knockout_risks: [],
  gaps: [],
  strengths: [{ requirement: "X", evidence: "Y" }],
};

function makeJob(
  overrides: Partial<Parameters<typeof matchesFilters>[0]> = {}
) {
  return {
    hiddenAt: null,
    status: "DRAFT",
    fitCheck: null,
    resume: null,
    ...overrides,
  } as Parameters<typeof matchesFilters>[0];
}

describe("matchesFilters", () => {
  it("passes everything through with default filters", () => {
    expect(matchesFilters(makeJob(), DEFAULT_FILTERS)).toBe(true);
  });

  it("excludes hidden jobs unless showHidden is set", () => {
    const hidden = makeJob({ hiddenAt: new Date() });
    expect(matchesFilters(hidden, DEFAULT_FILTERS)).toBe(false);
    expect(
      matchesFilters(hidden, { ...DEFAULT_FILTERS, showHidden: true })
    ).toBe(true);
  });

  it("excludes rejected jobs when hideRejected is set", () => {
    const rejected = makeJob({ status: "REJECTED" });
    expect(
      matchesFilters(rejected, { ...DEFAULT_FILTERS, hideRejected: true })
    ).toBe(false);
    expect(matchesFilters(rejected, DEFAULT_FILTERS)).toBe(true);
  });

  it("matches on fit level when fitLevels is non-empty, excluding never-checked jobs", () => {
    const strong = makeJob({
      resume: { fitCheck: { contentJson: JSON.stringify(strongFitCheck) } },
    });
    const neverChecked = makeJob();

    expect(
      matchesFilters(strong, { ...DEFAULT_FILTERS, fitLevels: ["strong"] })
    ).toBe(true);
    expect(
      matchesFilters(strong, { ...DEFAULT_FILTERS, fitLevels: ["mismatch"] })
    ).toBe(false);
    expect(
      matchesFilters(neverChecked, {
        ...DEFAULT_FILTERS,
        fitLevels: ["strong"],
      })
    ).toBe(false);
  });
});
