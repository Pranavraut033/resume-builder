import { describe, expect, it } from "vitest";

import { DocumentAnalysisSchema } from "./documentAnalysis";

describe("DocumentAnalysisSchema", () => {
  it("parses a valid example", () => {
    const analysis = {
      v: 2,
      findings: [
        {
          path: "/experience/0/achievements/0",
          original: "Managed the deploy pipeline",
          suggestion: "Managed the deploy pipeline for a 12-person team",
          kind: "impact",
          severity: "suggestion",
          why: "No quantification of scope",
        },
        {
          path: "/header/name",
          original: "Github: github.com/foo",
          suggestion: "GitHub: github.com/foo",
          kind: "correctness",
          severity: "warning",
          why: "Brand casing",
          source: "lint",
        },
      ],
      summary: "Two findings: one quantification gap, one casing fix.",
    };

    const parsed = DocumentAnalysisSchema.parse(analysis);

    expect(parsed.v).toBe(2);
    expect(parsed.findings).toHaveLength(2);
    // No `source` supplied on the first finding — defaults to "llm".
    expect(parsed.findings[0].source).toBe("llm");
    expect(parsed.findings[1].source).toBe("lint");
    expect(parsed.summary).toBe(
      "Two findings: one quantification gap, one casing fix."
    );
  });

  it("rejects a blob without v: 2", () => {
    const legacyShapedBlob = {
      // no `v` at all — the pre-refactor shape this replaces.
      issues: [
        {
          field: "summary",
          category: "spelling",
          severity: "error",
          location: "Summary",
          original: "teh",
          suggestion: "the",
          explanation: "typo",
        },
      ],
      summary: "One typo found.",
    };

    const result = DocumentAnalysisSchema.safeParse(legacyShapedBlob);

    expect(result.success).toBe(false);
  });

  it("rejects a blob with the wrong v value", () => {
    const result = DocumentAnalysisSchema.safeParse({
      v: 1,
      findings: [],
      summary: "",
    });

    expect(result.success).toBe(false);
  });
});
