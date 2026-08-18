/**
 * Regression for a real bug found via a live probe against gpt-4o-mini: the
 * model self-reports `source` on every finding it returns, but has no real
 * visibility into what lintResume() actually checks — in practice it
 * mislabeled judgment-only findings (weak wording, unquantified claims) as
 * `source: "lint"`. That label gates auto-apply in Chatbot.ts (only
 * `source === "lint"` findings are auto-applied), so a mislabeled judgment
 * call — including one whose suggestion is a deletion — would get silently
 * applied via the chat deep-analysis intent. analyzeDocument must never
 * trust a model-supplied `source`; only findings that actually came out of
 * lintResume() may carry `source: "lint"`.
 */
import { LLMProvider } from "@pranavraut033/llm-core";
import { describe, expect, it } from "vitest";

import { analyzeDocument } from "@/lib/llm/domainOps";
import { DocumentFinding } from "@/types/documentAnalysis";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

const USAGE = { promptTokens: 10, completionTokens: 10 };

const JOB_DETAILS = {
  job: {},
  company: {},
  location: {},
  responsibilities: {},
  requirements: {},
  nice_to_have: {},
  tech_stack: {},
  benefits: {},
  contact: {},
  raw_description: "",
} as unknown as JobDetailsJSON;

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
      workAuthorization: null,
      nationality: null,
      dateOfBirth: null,
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

function providerReturningFindings(findings: DocumentFinding[]): LLMProvider {
  return {
    runStructuredLLM: async () => ({
      result: { v: 2, findings, summary: "test" },
      usage: USAGE,
    }),
  } as unknown as LLMProvider;
}

describe("analyzeDocument", () => {
  it('forces source: "llm" even when the model mislabels a judgment finding as "lint"', async () => {
    const resume = makeResume();
    // Mirrors the live-observed bug: the model returned these two
    // judgment-only findings tagged source: "lint".
    const modelFindings: DocumentFinding[] = [
      {
        path: "/skills/0/name",
        original: "Javascript",
        suggestion: "JavaScript",
        kind: "correctness",
        severity: "warning",
        why: "Should match industry-standard casing.",
        source: "lint",
      },
      {
        path: "/summary",
        original: "Senior backend engineer.",
        suggestion: "",
        kind: "impact",
        severity: "warning",
        why: "No metrics or scope given.",
        source: "lint",
      },
    ];
    const provider = providerReturningFindings(modelFindings);

    const { result } = await analyzeDocument(
      provider,
      { resumeFull: resume, jobDetails: JOB_DETAILS, baseProfile: null },
      { model: "test-model" }
    );

    // Neither finding matches an actual lintResume() output for this resume
    // (there's no skills entry to normalize, and no lint check flags
    // unquantified summaries), so both must be re-stamped "llm".
    const judgmentFindings = result.findings.filter(
      (finding) =>
        finding.path === "/skills/0/name" || finding.path === "/summary"
    );
    expect(judgmentFindings).toHaveLength(2);
    for (const finding of judgmentFindings) {
      expect(finding.source).toBe("llm");
    }
  });

  it("passes through the LLM-supplied `path` field when merging with lint findings", async () => {
    const resume = makeResume();
    const modelFindings: DocumentFinding[] = [
      {
        path: "/summary",
        original: "Senior backend engineer.",
        suggestion: "",
        kind: "impact",
        severity: "warning",
        why: "No metrics or scope given.",
        source: "llm",
      },
    ];
    const provider = providerReturningFindings(modelFindings);

    const { result } = await analyzeDocument(
      provider,
      { resumeFull: resume, jobDetails: JOB_DETAILS, baseProfile: null },
      { model: "test-model" }
    );

    const finding = result.findings.find((f) => f.path === "/summary");
    expect(finding?.path).toBe("/summary");
  });

  it('still tags genuine lintResume() findings as source: "lint"', async () => {
    // A resume with a real lint-detectable defect (double space) and no
    // model-reported findings at all.
    const resume = makeResume({
      summary: "Senior backend  engineer with double spacing.",
    });
    const provider = providerReturningFindings([]);

    const { result } = await analyzeDocument(
      provider,
      { resumeFull: resume, jobDetails: JOB_DETAILS, baseProfile: null },
      { model: "test-model" }
    );

    expect(result.findings.length).toBeGreaterThan(0);
    for (const finding of result.findings) {
      expect(finding.source).toBe("lint");
    }
  });

  it('dedupes a model finding against a real lint finding covering the same path + text, letting the lint one win as "lint"', async () => {
    const resume = makeResume({
      summary: "Senior backend  engineer with double spacing.",
    });
    // The model independently reports the exact same double-space defect —
    // real providers do this often (double-reporting a mechanical issue the
    // lint pass also catches).
    const modelFindings: DocumentFinding[] = [
      {
        path: "/summary",
        original: "  ",
        suggestion: " ",
        kind: "correctness",
        severity: "warning",
        why: "Double space.",
        source: "lint",
      },
    ];
    const provider = providerReturningFindings(modelFindings);

    const { result } = await analyzeDocument(
      provider,
      { resumeFull: resume, jobDetails: JOB_DETAILS, baseProfile: null },
      { model: "test-model" }
    );

    const doubleSpaceFindings = result.findings.filter(
      (f) => f.path === "/summary" && f.original.trim() === ""
    );
    expect(doubleSpaceFindings).toHaveLength(1);
    expect(doubleSpaceFindings[0].source).toBe("lint");
  });
});
