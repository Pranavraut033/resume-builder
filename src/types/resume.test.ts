import { describe, expect, it } from "vitest";

import { ATSAnalysisSchema } from "./resume";

describe("ATSAnalysisSchema back-compat", () => {
  it("parses a full old-shape ATS analysis (missing_keywords, formatting_issues, 4-key scores, match_status, estimated_score_delta, resume_title/target_title, no knockout_risks/title_alignment) and strips the deleted fields while filling defaults", () => {
    const oldShapeAnalysis = {
      keyword_analysis: [
        { keyword: "PostgreSQL", match_type: "exact", match_status: "present" },
      ],
      missing_keywords: ["Kubernetes"],
      formatting_issues: [
        { section: "header", description: "missing email", severity: "high" },
      ],
      scores: {
        keyword_match_score: 78,
        formatting_score: 100,
        content_quality_score: 65,
        composite_score: 72,
      },
      improvements: [
        {
          section: "experience",
          issue: "bullet 2 describes a duty with no quantification",
          recommended_fix: "add the team size or throughput number",
          estimated_score_delta: 5,
          // no original_text/rewrite — matches pre-Cluster-A stored rows
        },
      ],
      summary: "Strong keyword coverage; content quality is the main gap.",
      // no knockout_risks, no title_alignment — matches pre-Cluster-A stored rows,
      // which predate both fields entirely
    };

    const parsed = ATSAnalysisSchema.parse(oldShapeAnalysis);

    // Zod strips unknown keys by default — deleted fields must not survive
    // parsing even though the raw input still carries them.
    expect(parsed).not.toHaveProperty("missing_keywords");
    expect(parsed).not.toHaveProperty("formatting_issues");
    expect(parsed.keyword_analysis[0]).not.toHaveProperty("match_status");
    expect(parsed.scores).not.toHaveProperty("keyword_match_score");
    expect(parsed.scores).not.toHaveProperty("formatting_score");
    expect(parsed.scores).not.toHaveProperty("content_quality_score");
    expect(parsed.improvements[0]).not.toHaveProperty("estimated_score_delta");

    // Surviving fields parse through untouched.
    expect(parsed.keyword_analysis[0].keyword).toBe("PostgreSQL");
    expect(parsed.keyword_analysis[0].match_type).toBe("exact");
    expect(parsed.scores).toEqual({ composite_score: 72 });
    expect(parsed.improvements[0].original_text).toBeNull();
    expect(parsed.improvements[0].rewrite).toBeNull();

    // Object-level `.default()` fills knockout_risks/title_alignment, which
    // this old blob never had at all — and the new title_alignment default
    // no longer carries resume_title/target_title.
    expect(parsed.knockout_risks).toEqual([]);
    expect(parsed.title_alignment).toEqual({
      verdict: "unclear",
      note: "",
    });
  });

  it("parses a title_alignment blob with the deleted resume_title/target_title fields and strips them", () => {
    const analysisWithOldTitleAlignment = {
      keyword_analysis: [{ keyword: "PostgreSQL", match_type: "exact" }],
      scores: { composite_score: 72 },
      improvements: [],
      summary: "Solid match.",
      title_alignment: {
        resume_title: "Senior Software Engineer",
        target_title: "Staff Software Engineer",
        verdict: "below",
        note: "Resume title reads a level junior to the target.",
      },
    };

    const parsed = ATSAnalysisSchema.parse(analysisWithOldTitleAlignment);

    expect(parsed.title_alignment).not.toHaveProperty("resume_title");
    expect(parsed.title_alignment).not.toHaveProperty("target_title");
    expect(parsed.title_alignment).toEqual({
      verdict: "below",
      note: "Resume title reads a level junior to the target.",
    });
  });
});
