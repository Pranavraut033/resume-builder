/**
 * Regression for a real bug found via a live probe against gpt-4o-mini: the
 * model self-reports `source` on every issue it returns, but has no real
 * visibility into what lintResume() actually checks — in practice it
 * mislabeled judgment-only categories (terminology_consistency,
 * unquantified_claim) as `source: "lint"`. That label gates auto-apply in
 * Chatbot.ts (only `source === "lint"` findings are auto-applied), so a
 * mislabeled judgment call — including one whose suggestion is a deletion —
 * would get silently applied via the chat proofread intent. proofreadResume
 * must never trust a model-supplied `source`; only issues that actually came
 * out of lintResume() may carry `source: "lint"`.
 */
import { LLMProvider } from "@pranavraut033/llm-core";
import { describe, expect, it } from "vitest";

import { proofreadResume } from "@/lib/llm/domainOps";
import { ProofreadIssue } from "@/types/proofread";
import { ResumeJSON } from "@/types/resume";

const USAGE = { promptTokens: 10, completionTokens: 10 };

function makeResume(overrides: Partial<ResumeJSON> = {}): ResumeJSON {
  return {
    header: {
      name: "Jamie Rivera",
      headline: "Backend Engineer",
      email: "jamie@example.com",
      phone: "555-0100",
      location: "Berlin, DE",
      linkedin: null,
      github: null,
      website: null,
      photoDataUrl: null,
    },
    summary: "Senior backend engineer.",
    experience: [],
    projects: [],
    skills: [],
    education: [],
    certifications: [],
    publications: null,
    languages: null,
    volunteer: null,
    awards: null,
    hobbies: null,
    sectionLayout: null,
    ...overrides,
  } as ResumeJSON;
}

function providerReturningIssues(issues: ProofreadIssue[]): LLMProvider {
  return {
    runStructuredLLM: async () => ({
      result: { issues, summary: "test" },
      usage: USAGE,
    }),
  } as unknown as LLMProvider;
}

describe("proofreadResume", () => {
  it('forces source: "llm" even when the model mislabels a judgment issue as "lint"', async () => {
    const resume = makeResume();
    // Mirrors the live-observed bug: the model returned these two
    // judgment-only categories tagged source: "lint".
    const modelIssues: ProofreadIssue[] = [
      {
        field: "skills",
        category: "terminology_consistency",
        severity: "warning",
        location: "Skills → Javascript",
        original: "Javascript",
        suggestion: "JavaScript",
        explanation: "Should match industry-standard casing.",
        source: "lint",
      },
      {
        field: "summary",
        category: "unquantified_claim",
        severity: "warning",
        location: "Summary",
        original: "Senior backend engineer.",
        suggestion: "",
        explanation: "No metrics or scope given.",
        source: "lint",
      },
    ];
    const provider = providerReturningIssues(modelIssues);

    const { result } = await proofreadResume(
      provider,
      { resumeFull: resume, jobDetails: null, baseProfile: null },
      { model: "test-model" }
    );

    const judgmentIssues = result.issues.filter(
      (issue) =>
        issue.category === "terminology_consistency" ||
        issue.category === "unquantified_claim"
    );
    expect(judgmentIssues).toHaveLength(2);
    for (const issue of judgmentIssues) {
      expect(issue.source).toBe("llm");
    }
  });

  it("passes through the LLM-supplied `path` field when merging with lint issues", async () => {
    const resume = makeResume();
    const modelIssues: ProofreadIssue[] = [
      {
        field: "summary",
        category: "unquantified_claim",
        severity: "warning",
        location: "Summary",
        path: "/summary",
        original: "Senior backend engineer.",
        suggestion: "",
        explanation: "No metrics or scope given.",
        source: "llm",
      },
    ];
    const provider = providerReturningIssues(modelIssues);

    const { result } = await proofreadResume(
      provider,
      { resumeFull: resume, jobDetails: null, baseProfile: null },
      { model: "test-model" }
    );

    const issue = result.issues.find(
      (i) => i.category === "unquantified_claim"
    );
    expect(issue?.path).toBe("/summary");
  });

  it('still tags genuine lintResume() findings as source: "lint"', async () => {
    // A resume with a real lint-detectable defect (double space) and no
    // model-reported issues at all.
    const resume = makeResume({
      summary: "Senior backend  engineer with double spacing.",
    });
    const provider = providerReturningIssues([]);

    const { result } = await proofreadResume(
      provider,
      { resumeFull: resume, jobDetails: null, baseProfile: null },
      { model: "test-model" }
    );

    expect(result.issues.length).toBeGreaterThan(0);
    for (const issue of result.issues) {
      expect(issue.source).toBe("lint");
    }
  });
});
