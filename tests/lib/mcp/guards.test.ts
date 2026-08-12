import { describe, expect, it } from "vitest";

import {
  applyGuard,
  guardProofreadResult,
  guardTailoredResume,
} from "@/mcp/guards";
import { ProofreadIssue, ProofreadJSON } from "@/types/proofread";
import { ResumeJSON } from "@/types/resume";

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
    summary: "Senior backend engineer with 6 years building payment systems.",
    experience: [
      {
        company: "Acme Corp",
        role: "Senior Engineer",
        startDate: "2020",
        endDate: "2021",
        description: "Owned the checkout platform.",
        achievements: ["Cut checkout latency 40%."],
      },
    ],
    projects: [],
    skills: [{ name: "TypeScript", category: null, tier: "primary" }],
    education: [
      {
        institution: "State University",
        degree: "B.S.",
        field: "Computer Science",
        startDate: "2016",
        endDate: "2020",
        gpa: null,
      },
    ],
    certifications: [],
    publications: null,
    languages: null,
    volunteer: null,
    awards: null,
    hobbies: null,
    sectionLayout: { order: ["header", "summary"], hidden: [], custom: [] },
    ...overrides,
  };
}

describe("applyGuard", () => {
  it("wraps a successful guard in { ok: true, value }", () => {
    const result = applyGuard(() => 42);
    expect(result).toEqual({ ok: true, value: 42 });
  });

  it("turns a thrown guard rejection into { ok: false } instead of letting it escape", () => {
    const result = applyGuard(() => {
      throw new Error("boom");
    });
    expect(result).toEqual({ ok: false, error: "boom" });
  });
});

describe("guardTailoredResume", () => {
  it("carries the base profile's sectionLayout over onto the tailored resume", () => {
    const base = makeResume({
      sectionLayout: {
        order: ["header", "experience"],
        hidden: ["hobbies"],
        custom: [],
      },
    });
    const tailored = makeResume({
      sectionLayout: { order: ["header"], hidden: [], custom: [] },
    });

    const result = guardTailoredResume(base, tailored);

    expect(result.sectionLayout).toEqual(base.sectionLayout);
  });

  it("throws (via assertResumeNotGutted) when the tailored resume empties out sections the base profile had", () => {
    const base = makeResume();
    const gutted = makeResume({
      experience: [],
      skills: [],
      education: [],
      summary: "",
    });

    expect(() => guardTailoredResume(base, gutted)).toThrow(/emptied out/);
  });

  it("surfaces a gutted-resume rejection as { ok: false } via applyGuard, not a thrown error", () => {
    const base = makeResume();
    const gutted = makeResume({
      experience: [],
      skills: [],
      education: [],
      summary: "",
    });

    const result = applyGuard(() => guardTailoredResume(base, gutted));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/emptied out/);
    }
  });

  it("does not throw for a resume that is merely pruned, not gutted", () => {
    const base = makeResume();
    const pruned = makeResume({ projects: [] });

    expect(() => guardTailoredResume(base, pruned)).not.toThrow();
  });
});

describe("guardProofreadResult", () => {
  const baseIssue: ProofreadIssue = {
    field: "summary",
    category: "unquantified_claim",
    severity: "warning",
    location: "Summary",
    original: "Senior backend engineer with 6 years building payment systems.",
    suggestion: "",
    explanation: "No metrics given.",
    source: "llm",
  };

  it('re-stamps every submitted issue to source: "llm", even one claiming source: "lint"', () => {
    const resume = makeResume();
    const submitted: ProofreadJSON = {
      issues: [{ ...baseIssue, source: "lint" }],
      summary: "test",
    };

    const result = guardProofreadResult(resume, submitted);

    const judgmentIssue = result.issues.find(
      (issue) => issue.category === "unquantified_claim"
    );
    expect(judgmentIssue?.source).toBe("llm");
  });

  it("merges in this server's own lintResume() findings, tagged source: lint", () => {
    // Double space in the summary is a real lintResume()-detectable defect.
    const resume = makeResume({
      summary: "Senior backend  engineer with double spacing.",
    });
    const submitted: ProofreadJSON = { issues: [], summary: "test" };

    const result = guardProofreadResult(resume, submitted);

    expect(result.issues.length).toBeGreaterThan(0);
    for (const issue of result.issues) {
      expect(issue.source).toBe("lint");
    }
  });

  it("drops a submitted issue that duplicates a lint finding rather than double-reporting it", () => {
    const resume = makeResume({
      summary: "Senior backend  engineer with double spacing.",
    });
    const submitted: ProofreadJSON = {
      issues: [
        {
          ...baseIssue,
          category: "spacing",
          original: "  ",
          suggestion: " ",
          source: "llm",
        },
      ],
      summary: "test",
    };

    const result = guardProofreadResult(resume, submitted);

    const spacingIssues = result.issues.filter(
      (issue) => issue.category === "spacing"
    );
    // Deduped: only the lint-produced instance survives, not a second
    // LLM-reported copy of the same defect.
    expect(spacingIssues).toHaveLength(1);
    expect(spacingIssues[0].source).toBe("lint");
  });
});
