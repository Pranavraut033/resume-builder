import { describe, expect, it } from "vitest";

import { ATSAnalysisSchema } from "./resume";

describe("ATSAnalysisSchema back-compat", () => {
  it("parses an old-shape ATS analysis (no knockout_risks/title_alignment, improvements without original_text/rewrite) and fills in defaults", () => {
    const oldShapeAnalysis = {
      keyword_analysis: [
        { keyword: "PostgreSQL", match_type: "exact", match_status: "present" },
      ],
      missing_keywords: ["Kubernetes"],
      formatting_issues: [],
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
      // no knockout_risks, no title_alignment — matches pre-Cluster-A stored rows
    };

    const parsed = ATSAnalysisSchema.parse(oldShapeAnalysis);

    expect(parsed.knockout_risks).toEqual([]);
    expect(parsed.title_alignment).toEqual({
      resume_title: "",
      target_title: "",
      verdict: "unclear",
      note: "",
    });
    expect(parsed.improvements[0].original_text).toBeNull();
    expect(parsed.improvements[0].rewrite).toBeNull();
  });
});
