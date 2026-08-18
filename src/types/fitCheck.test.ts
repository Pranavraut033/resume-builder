import { describe, expect, it } from "vitest";

import { FitCheckSchema } from "./fitCheck";

describe("FitCheckSchema", () => {
  it("parses a valid example", () => {
    const fitCheck = {
      v: 2,
      fit_level: "stretch",
      verdict:
        "You cover the core stack but are light on the seniority the JD wants. Worth applying with a targeted cover letter.",
      knockout_risks: [
        {
          requirement: "Must be authorized to work in Germany",
          confidence: "unknown",
          evidence: "Resume does not state work authorization status.",
          advice: "Add a work authorization line to the header.",
        },
      ],
      gaps: [
        {
          requirement: "5+ years leading a platform team",
          severity: "major",
          gap_type: "seniority",
          evidence_in_resume: "2 years as a senior engineer, no lead title.",
          solution: "Highlight informal leadership/mentoring in bullets.",
        },
      ],
      strengths: [
        {
          requirement: "Strong TypeScript/React experience",
          evidence: "4 years shipping production React apps.",
        },
      ],
    };

    const parsed = FitCheckSchema.parse(fitCheck);

    expect(parsed.v).toBe(2);
    expect(parsed.fit_level).toBe("stretch");
    expect(parsed.knockout_risks[0].confidence).toBe("unknown");
    expect(parsed.gaps[0].gap_type).toBe("seniority");
    expect(parsed.strengths).toHaveLength(1);
  });

  it("rejects a blob with no strengths", () => {
    const result = FitCheckSchema.safeParse({
      v: 2,
      fit_level: "strong",
      verdict: "Great fit.",
      knockout_risks: [],
      gaps: [],
      strengths: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a blob without v: 2", () => {
    const legacyShapedBlob = {
      // no `v` at all, and the deleted `resume_fix`/5-value gap_type shape.
      fit_level: "strong",
      verdict: "Great fit.",
      gaps: [
        {
          requirement: "SQL",
          severity: "minor",
          gap_type: "unquantified",
          evidence_in_resume: null,
          solution: "Add a metric.",
          resume_fix: null,
        },
      ],
      strengths: [{ requirement: "React", evidence: "5 years." }],
    };

    const result = FitCheckSchema.safeParse(legacyShapedBlob);

    expect(result.success).toBe(false);
  });

  it("rejects a blob with the wrong v value", () => {
    const result = FitCheckSchema.safeParse({
      v: 1,
      fit_level: "strong",
      verdict: "Great fit.",
      knockout_risks: [],
      gaps: [],
      strengths: [{ requirement: "React", evidence: "5 years." }],
    });

    expect(result.success).toBe(false);
  });
});
