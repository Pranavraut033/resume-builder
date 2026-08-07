import { describe, expect, it } from "vitest";

import { applyResumeOps, resumePathLines } from "@/lib/resume/editor";
import { ResumeJSON } from "@/types/resume";

import type { ResumeOp } from "@/lib/resume/editor";

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

describe("applyResumeOps", () => {
  it("replaces a nested leaf, leaving the rest of the resume untouched", () => {
    const resume = makeResume();
    const op: ResumeOp = {
      op: "replace",
      path: "/experience/0/achievements/1",
      value: "Led a 5-person team building the fraud-detection pipeline.",
    };

    const { resume: updated, applied, rejected } = applyResumeOps(resume, [op]);

    expect(rejected).toEqual([]);
    expect(applied).toEqual([op]);
    expect(updated.experience[0].achievements).toEqual([
      "Cut checkout latency 40% by migrating to Kafka-based retries.",
      "Led a 5-person team building the fraud-detection pipeline.",
    ]);
    // Untouched fields still equal the original.
    expect(updated.header).toEqual(resume.header);
    expect(updated.summary).toBe(resume.summary);
    expect(updated.experience[0].company).toBe("Acme Corp");
  });

  it("appends to an array with `add` and removes an item with `remove`", () => {
    const resume = makeResume();

    const addOp: ResumeOp = {
      op: "add",
      path: "/experience/0/achievements/-",
      value: "Shipped a new fraud model reducing chargebacks 15%.",
    };
    const afterAdd = applyResumeOps(resume, [addOp]);
    expect(afterAdd.rejected).toEqual([]);
    expect(afterAdd.applied).toEqual([addOp]);
    expect(afterAdd.resume.experience[0].achievements).toEqual([
      "Cut checkout latency 40% by migrating to Kafka-based retries.",
      "Led a 3-person team building the fraud-detection pipeline.",
      "Shipped a new fraud model reducing chargebacks 15%.",
    ]);

    const removeOp: ResumeOp = {
      op: "remove",
      path: "/experience/0/achievements/0",
    };
    const afterRemove = applyResumeOps(afterAdd.resume, [removeOp]);
    expect(afterRemove.rejected).toEqual([]);
    expect(afterRemove.applied).toEqual([removeOp]);
    expect(afterRemove.resume.experience[0].achievements).toEqual([
      "Led a 3-person team building the fraud-detection pipeline.",
      "Shipped a new fraud model reducing chargebacks 15%.",
    ]);
  });

  it("rejects `add` at an out-of-range array index instead of throwing", () => {
    const resume = makeResume();
    const op: ResumeOp = {
      op: "add",
      path: "/experience/0/achievements/99",
      value: "Should not be inserted.",
    };

    expect(() => applyResumeOps(resume, [op])).not.toThrow();
    const { resume: updated, applied, rejected } = applyResumeOps(resume, [op]);

    expect(applied).toEqual([]);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].op).toEqual(op);
    expect(typeof rejected[0].reason).toBe("string");
    expect(rejected[0].reason.length).toBeGreaterThan(0);
    expect(updated).toEqual(resume);
  });

  it("rejects an op whose result fails ResumeSchema validation, leaving the resume unchanged", () => {
    const resume = makeResume();

    const badEmailOp: ResumeOp = {
      op: "replace",
      path: "/header/email",
      value: 12345,
    };
    const emailResult = applyResumeOps(resume, [badEmailOp]);
    expect(emailResult.applied).toEqual([]);
    expect(emailResult.rejected).toHaveLength(1);
    expect(emailResult.rejected[0].op).toEqual(badEmailOp);
    expect(emailResult.resume).toEqual(resume);

    const badExperienceOp: ResumeOp = {
      op: "replace",
      path: "/experience",
      value: "not an array",
    };
    const experienceResult = applyResumeOps(resume, [badExperienceOp]);
    expect(experienceResult.applied).toEqual([]);
    expect(experienceResult.rejected).toHaveLength(1);
    expect(experienceResult.resume).toEqual(resume);
  });

  it("does not let a rejected op block a later valid op in the same call", () => {
    const resume = makeResume();

    const rejectedOp: ResumeOp = {
      op: "add",
      path: "/experience/0/achievements/99",
      value: "Out of range.",
    };
    const validOp: ResumeOp = {
      op: "replace",
      path: "/summary",
      value: "Updated summary.",
    };

    const {
      resume: updated,
      applied,
      rejected,
    } = applyResumeOps(resume, [rejectedOp, validOp]);

    expect(rejected).toEqual([{ op: rejectedOp, reason: expect.any(String) }]);
    expect(applied).toEqual([validOp]);
    expect(updated.summary).toBe("Updated summary.");
    // Original experience is untouched by the rejected op.
    expect(updated.experience).toEqual(resume.experience);
  });
});

describe("resumePathLines", () => {
  it("emits paths that resolve to the shown value in the fixture resume", () => {
    const resume = makeResume({
      publications: [
        {
          title: "Scaling Payments",
          authors: ["Jamie Rivera"],
          venue: "InfoQ",
          date: "2022",
          url: null,
          doi: null,
        },
      ],
      hobbies: ["Chess", "Climbing"],
    });

    const output = resumePathLines(resume);
    const lines = output.split("\n");

    const findValue = (path: string): string => {
      const line = lines.find((l) => l.startsWith(`${path}: "`));
      if (!line) throw new Error(`no line found for path ${path}`);
      // Strip `path: "` prefix and trailing `"`.
      return line.slice(`${path}: "`.length, -1);
    };

    expect(findValue("/header/name")).toBe(resume.header.name);
    expect(findValue("/header/email")).toBe(resume.header.email);
    expect(findValue("/summary")).toBe(resume.summary);
    expect(findValue("/experience/0/company")).toBe(
      resume.experience[0].company
    );
    expect(findValue("/experience/0/achievements/1")).toBe(
      resume.experience[0].achievements[1]
    );
    expect(findValue("/publications/0/title")).toBe(
      resume.publications![0].title
    );
    expect(findValue("/hobbies/0")).toBe(resume.hobbies![0]);

    // Array-length marker lines are present so the model knows valid `add`
    // indices.
    expect(lines).toContain(
      `/experience/0/achievements: ${resume.experience[0].achievements.length} items`
    );
    expect(lines).toContain(`/experience: ${resume.experience.length} items`);
  });

  it("truncates long leaf values for display without affecting other paths", () => {
    const longText = "x".repeat(300);
    const resume = makeResume({ summary: longText });

    const output = resumePathLines(resume);
    const line = output.split("\n").find((l) => l.startsWith("/summary: "))!;

    expect(line).toContain("…");
    expect(line.length).toBeLessThan(longText.length);
  });

  it("lists null leaves explicitly instead of omitting them", () => {
    // A skill with category/tier unset must still surface as editable paths
    // — otherwise the model can't tell they exist and can't enumerate every
    // item in a bulk edit like "group all my skills into two categories".
    const resume = makeResume({
      skills: [
        { name: "TypeScript", category: null, tier: null },
        { name: "AWS", category: "Cloud", tier: "secondary" },
      ],
    });

    const lines = resumePathLines(resume).split("\n");

    expect(lines).toContain("/skills/0/category: null");
    expect(lines).toContain("/skills/0/tier: null");
    expect(lines).toContain('/skills/1/category: "Cloud"');
    expect(lines).toContain('/skills/1/tier: "secondary"');
    // header.linkedin/github/website are null in the fixture.
    expect(lines).toContain("/header/linkedin: null");
  });
});
