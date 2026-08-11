import { describe, expect, it } from "vitest";

import { applyProofreadFixes } from "@/lib/proofread/applyFixes";
import { ProofreadIssue } from "@/types/proofread";
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
        achievements: [
          "Cut checkout latency 40% by migrating to Kafka-based retries.",
          "Led a 3-person team building the fraud-detection pipeline.",
        ],
      },
    ],
    projects: [],
    skills: [{ name: "TypeScript", category: null, tier: "primary" }],
    education: [],
    certifications: [],
    publications: null,
    languages: null,
    volunteer: null,
    awards: null,
    hobbies: null,
    sectionLayout: null,
    ...overrides,
  };
}

function makeIssue(overrides: Partial<ProofreadIssue>): ProofreadIssue {
  return {
    field: "summary",
    category: "other",
    severity: "suggestion",
    location: "Summary",
    original: "",
    suggestion: "",
    explanation: "",
    source: "llm",
    ...overrides,
  };
}

describe("applyProofreadFixes", () => {
  it("applies a fix whose `original` matches uniquely within its field", () => {
    const resume = makeResume();
    const issue = makeIssue({
      field: "summary",
      original: "engineer",
      suggestion: "developer",
    });

    const {
      resume: updated,
      applied,
      unapplied,
    } = applyProofreadFixes(resume, [issue]);

    expect(applied).toEqual([issue]);
    expect(unapplied).toEqual([]);
    expect(updated.summary).toBe(
      "Senior backend developer with 6 years building payment systems."
    );
  });

  it("leaves the resume untouched and reports unapplied when there are zero matches", () => {
    const resume = makeResume();
    const issue = makeIssue({
      field: "summary",
      original: "this text does not appear anywhere",
      suggestion: "replacement",
    });

    const {
      resume: updated,
      applied,
      unapplied,
    } = applyProofreadFixes(resume, [issue]);

    expect(applied).toEqual([]);
    expect(unapplied).toEqual([issue]);
    expect(updated).toEqual(resume);
  });

  it("reports unapplied when `original` matches more than once in the field", () => {
    const resume = makeResume({
      experience: [
        {
          company: "Acme Corp",
          role: "Senior Engineer",
          startDate: "2020",
          endDate: "2021",
          description: "Owned platform tools.",
          achievements: [
            "Built tools for scale.",
            "Improved tools reliability.",
          ],
        },
      ],
    });
    const issue = makeIssue({
      field: "experience",
      original: "tools",
      suggestion: "systems",
    });

    const {
      resume: updated,
      applied,
      unapplied,
    } = applyProofreadFixes(resume, [issue]);

    expect(applied).toEqual([]);
    expect(unapplied).toEqual([issue]);
    expect(updated).toEqual(resume);
  });

  it("reports unapplied when the replacement breaks the field's Zod shape", () => {
    const resume = makeResume();
    const issue = makeIssue({
      field: "skills",
      original: "primary",
      suggestion: "not_a_real_tier",
    });

    const {
      resume: updated,
      applied,
      unapplied,
    } = applyProofreadFixes(resume, [issue]);

    expect(applied).toEqual([]);
    expect(unapplied).toEqual([issue]);
    expect(updated.skills).toEqual(resume.skills);
  });

  it("applies two fixes to the same field, composing sequentially", () => {
    const resume = makeResume();
    const issue1 = makeIssue({
      field: "experience",
      original: "Cut checkout latency 40% by migrating to Kafka-based retries.",
      suggestion: "Cut checkout latency 40% via Kafka-based retries.",
    });
    const issue2 = makeIssue({
      field: "experience",
      original: "Led a 3-person team building the fraud-detection pipeline.",
      suggestion: "Led a 3-person team on the fraud-detection pipeline.",
    });

    const {
      resume: updated,
      applied,
      unapplied,
    } = applyProofreadFixes(resume, [issue1, issue2]);

    expect(unapplied).toEqual([]);
    expect(applied).toEqual([issue1, issue2]);
    expect(updated.experience[0].achievements).toEqual([
      "Cut checkout latency 40% via Kafka-based retries.",
      "Led a 3-person team on the fraud-detection pipeline.",
    ]);
  });

  it("never throws — a malformed issue is reported as unapplied", () => {
    const resume = makeResume();
    const issue = makeIssue({
      // Empty `original` is degenerate (countOccurrences treats it as 0
      // matches) rather than matching every position.
      field: "summary",
      original: "",
      suggestion: "x",
    });

    expect(() => applyProofreadFixes(resume, [issue])).not.toThrow();
    const { applied, unapplied } = applyProofreadFixes(resume, [issue]);
    expect(applied).toEqual([]);
    expect(unapplied).toEqual([issue]);
  });

  describe("path-based apply", () => {
    it("applies a fix whose `original` contains a double quote (fails today via serialized JSON)", () => {
      const resume = makeResume({
        summary:
          'Senior backend engineer known for "shipping fast" and reliable systems.',
      });
      const issue = makeIssue({
        field: "summary",
        location: "Summary",
        path: "/summary",
        original: '"shipping fast"',
        suggestion: "shipping fast",
      });

      const {
        resume: updated,
        applied,
        unapplied,
      } = applyProofreadFixes(resume, [issue]);

      expect(unapplied).toEqual([]);
      expect(applied).toEqual([issue]);
      expect(updated.summary).toBe(
        "Senior backend engineer known for shipping fast and reliable systems."
      );
    });

    it("scopes the replace to the leaf named by `path` even when `original` also appears elsewhere in the resume", () => {
      const resume = makeResume({
        summary: "Senior backend engineer with a track record in payments.",
        experience: [
          {
            company: "Acme Corp",
            role: "Senior Engineer",
            startDate: "2020",
            endDate: "2021",
            description: "Owned platform in payments.",
            achievements: [
              "Cut checkout latency 40% by migrating to Kafka-based retries.",
              "Improved reliability in payments across the board.",
            ],
          },
        ],
      });
      // "in payments" appears in summary, description, and the second
      // achievement — `path` scopes this fix to only the second achievement.
      const issue = makeIssue({
        field: "experience",
        location: "Experience → Acme Corp → bullet 2",
        path: "/experience/0/achievements/1",
        original: "in payments",
        suggestion: "in fintech",
      });

      const {
        resume: updated,
        applied,
        unapplied,
      } = applyProofreadFixes(resume, [issue]);

      expect(unapplied).toEqual([]);
      expect(applied).toEqual([issue]);
      expect(updated.experience[0].achievements[1]).toBe(
        "Improved reliability in fintech across the board."
      );
      // Untouched: same substring elsewhere in the resume.
      expect(updated.summary).toBe(
        "Senior backend engineer with a track record in payments."
      );
      expect(updated.experience[0].description).toBe(
        "Owned platform in payments."
      );
    });

    it("falls back to the serialized-field strategy when `path` is absent (regression)", () => {
      const resume = makeResume();
      const issue = makeIssue({
        field: "summary",
        original: "engineer",
        suggestion: "developer",
        // no `path` set
      });

      const {
        resume: updated,
        applied,
        unapplied,
      } = applyProofreadFixes(resume, [issue]);

      expect(applied).toEqual([issue]);
      expect(unapplied).toEqual([]);
      expect(updated.summary).toBe(
        "Senior backend developer with 6 years building payment systems."
      );
    });
  });
});
