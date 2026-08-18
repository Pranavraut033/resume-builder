import { describe, expect, it } from "vitest";

import { applyProofreadFixes } from "@/lib/proofread/applyFixes";
import { DocumentFinding } from "@/types/documentAnalysis";
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

function makeFinding(overrides: Partial<DocumentFinding> = {}): DocumentFinding {
  return {
    path: "/summary",
    kind: "correctness",
    severity: "suggestion",
    original: "",
    suggestion: "",
    why: "",
    source: "llm",
    ...overrides,
  };
}

describe("applyProofreadFixes", () => {
  it("applies a fix whose `original` matches uniquely within its leaf", () => {
    const resume = makeResume();
    const finding = makeFinding({
      path: "/summary",
      original: "engineer",
      suggestion: "developer",
    });

    const {
      resume: updated,
      applied,
      unapplied,
    } = applyProofreadFixes(resume, [finding]);

    expect(applied).toEqual([finding]);
    expect(unapplied).toEqual([]);
    expect(updated.summary).toBe(
      "Senior backend developer with 6 years building payment systems."
    );
  });

  it("leaves the resume untouched and reports unapplied when there are zero matches", () => {
    const resume = makeResume();
    const finding = makeFinding({
      path: "/summary",
      original: "this text does not appear anywhere",
      suggestion: "replacement",
    });

    const {
      resume: updated,
      applied,
      unapplied,
    } = applyProofreadFixes(resume, [finding]);

    expect(applied).toEqual([]);
    expect(unapplied).toEqual([finding]);
    expect(updated).toEqual(resume);
  });

  it("reports unapplied when `original` matches more than once in the leaf", () => {
    const resume = makeResume({
      experience: [
        {
          company: "Acme Corp",
          role: "Senior Engineer",
          startDate: "2020",
          endDate: "2021",
          description: "Owned tools for scale, and more tools for reliability.",
          achievements: ["Built tools for scale."],
        },
      ],
    });
    const finding = makeFinding({
      path: "/experience/0/description",
      original: "tools",
      suggestion: "systems",
    });

    const {
      resume: updated,
      applied,
      unapplied,
    } = applyProofreadFixes(resume, [finding]);

    expect(applied).toEqual([]);
    expect(unapplied).toEqual([finding]);
    expect(updated).toEqual(resume);
  });

  it("reports unapplied when the replacement breaks the field's Zod shape", () => {
    const resume = makeResume();
    const finding = makeFinding({
      path: "/skills/0/tier",
      original: "primary",
      suggestion: "not_a_real_tier",
    });

    const {
      resume: updated,
      applied,
      unapplied,
    } = applyProofreadFixes(resume, [finding]);

    expect(applied).toEqual([]);
    expect(unapplied).toEqual([finding]);
    expect(updated.skills).toEqual(resume.skills);
  });

  it("applies two fixes to different leaves, composing sequentially", () => {
    const resume = makeResume();
    const finding1 = makeFinding({
      path: "/experience/0/achievements/0",
      original: "Cut checkout latency 40% by migrating to Kafka-based retries.",
      suggestion: "Cut checkout latency 40% via Kafka-based retries.",
    });
    const finding2 = makeFinding({
      path: "/experience/0/achievements/1",
      original: "Led a 3-person team building the fraud-detection pipeline.",
      suggestion: "Led a 3-person team on the fraud-detection pipeline.",
    });

    const {
      resume: updated,
      applied,
      unapplied,
    } = applyProofreadFixes(resume, [finding1, finding2]);

    expect(unapplied).toEqual([]);
    expect(applied).toEqual([finding1, finding2]);
    expect(updated.experience[0].achievements).toEqual([
      "Cut checkout latency 40% via Kafka-based retries.",
      "Led a 3-person team on the fraud-detection pipeline.",
    ]);
  });

  it("never throws — a malformed finding is reported as unapplied", () => {
    const resume = makeResume();
    const finding = makeFinding({
      // Empty `original` is degenerate (countOccurrences treats it as 0
      // matches) rather than matching every position.
      path: "/summary",
      original: "",
      suggestion: "x",
    });

    expect(() => applyProofreadFixes(resume, [finding])).not.toThrow();
    const { applied, unapplied } = applyProofreadFixes(resume, [finding]);
    expect(applied).toEqual([]);
    expect(unapplied).toEqual([finding]);
  });

  describe("path-based apply", () => {
    it("applies a fix whose `original` contains a double quote", () => {
      const resume = makeResume({
        summary:
          'Senior backend engineer known for "shipping fast" and reliable systems.',
      });
      const finding = makeFinding({
        path: "/summary",
        original: '"shipping fast"',
        suggestion: "shipping fast",
      });

      const {
        resume: updated,
        applied,
        unapplied,
      } = applyProofreadFixes(resume, [finding]);

      expect(unapplied).toEqual([]);
      expect(applied).toEqual([finding]);
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
      const finding = makeFinding({
        path: "/experience/0/achievements/1",
        original: "in payments",
        suggestion: "in fintech",
      });

      const {
        resume: updated,
        applied,
        unapplied,
      } = applyProofreadFixes(resume, [finding]);

      expect(unapplied).toEqual([]);
      expect(applied).toEqual([finding]);
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

    it("reports unapplied when `path` doesn't resolve to a string leaf", () => {
      const resume = makeResume();
      const finding = makeFinding({
        path: "/experience", // array, not a string leaf
        original: "engineer",
        suggestion: "developer",
      });

      const {
        resume: updated,
        applied,
        unapplied,
      } = applyProofreadFixes(resume, [finding]);

      expect(applied).toEqual([]);
      expect(unapplied).toEqual([finding]);
      expect(updated).toEqual(resume);
    });
  });
});
