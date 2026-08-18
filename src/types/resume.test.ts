import { describe, expect, it } from "vitest";

import { documentAnalysisToCompactPositional } from "./resume";

import type { DocumentAnalysisJSON } from "./documentAnalysis";

describe("documentAnalysisToCompactPositional", () => {
  const baseAnalysis: DocumentAnalysisJSON = {
    v: 2,
    findings: [
      {
        path: "/experience/0/achievements/0",
        original: "Managed a team",
        suggestion: "Managed a team of 6 engineers",
        kind: "impact",
        severity: "suggestion",
        why: "No quantification",
        source: "llm",
      },
    ],
    summary: "One quantification gap found.",
  };

  it("serializes findings and the summary into pipe-delimited lines", () => {
    const result = documentAnalysisToCompactPositional(baseAnalysis);

    expect(result).toContain(
      "/experience/0/achievements/0|Managed a team|Managed a team of 6 engineers|impact|suggestion|No quantification|llm"
    );
    expect(result).toContain("One quantification gap found.");
  });

  it("escapes a standalone fence-breaking line in the summary field", () => {
    const analysis: DocumentAnalysisJSON = {
      v: 2,
      findings: [],
      // A summary that is *only* a markdown-horizontal-rule/fence line —
      // occupies its own physical line in the serialized output, unlike a
      // finding field embedded mid pipe-delimited line.
      summary: "---",
    };

    const result = documentAnalysisToCompactPositional(analysis);

    // No line in the serialized output is a bare `---` fence delimiter —
    // sanitizeUntrustedText must have escaped it.
    expect(result.split("\n").some((line) => /^-{3,}$/.test(line.trim()))).toBe(
      false
    );
    expect(result).toContain("\\-\\-\\-");
  });
});
