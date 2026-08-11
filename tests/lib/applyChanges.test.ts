import { describe, expect, it } from "vitest";

import {
  applyChangesToResume,
  applyChangesToText,
} from "@/lib/humanizer/applyChanges";
import { ResumeJSON } from "@/types/resume";

const baseResume: ResumeJSON = {
  header: {
    name: "Jane Doe",
    headline: null,
    email: "jane@example.com",
    phone: null,
    location: null,
    linkedin: null,
    github: null,
    website: null,
    workAuthorization: null,
    photoDataUrl: null,
  },
  summary: "Leveraged synergies to spearhead innovative solutions.",
  experience: [
    {
      company: "Acme",
      role: "Engineer",
      startDate: "2020",
      endDate: null,
      description: "Utilized cutting-edge technology.",
      achievements: ["Spearheaded a project."],
    },
  ],
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
};

describe("applyChangesToText", () => {
  it("replaces matched originals", () => {
    const result = applyChangesToText("Leveraged synergies to build things.", [
      {
        original: "Leveraged synergies",
        replacement: "Used teamwork",
        reason: "cliche",
        path: null,
      },
    ]);
    expect(result).toBe("Used teamwork to build things.");
  });

  it("skips a change whose original text isn't present", () => {
    const result = applyChangesToText("Built a dashboard.", [
      {
        original: "Leveraged synergies",
        replacement: "Used teamwork",
        reason: "cliche",
        path: null,
      },
    ]);
    expect(result).toBe("Built a dashboard.");
  });
});

describe("applyChangesToResume", () => {
  it("applies changes across summary, experience description, and achievements", () => {
    const next = applyChangesToResume(baseResume, [
      {
        original: "Leveraged synergies to spearhead innovative solutions.",
        replacement: "Built better solutions.",
        reason: "buzzword",
        path: null,
      },
      {
        original: "Utilized cutting-edge technology.",
        replacement: "Used modern tools.",
        reason: "buzzword",
        path: null,
      },
      {
        original: "Spearheaded a project.",
        replacement: "Led a project.",
        reason: "buzzword",
        path: null,
      },
    ]);

    expect(next.summary).toBe("Built better solutions.");
    expect(next.experience[0].description).toBe("Used modern tools.");
    expect(next.experience[0].achievements[0]).toBe("Led a project.");
    // original untouched
    expect(baseResume.summary).toBe(
      "Leveraged synergies to spearhead innovative solutions."
    );
  });

  it("scopes a `path`-bearing change to that one leaf, ignoring the same substring elsewhere", () => {
    const resumeWithSharedSubstring: ResumeJSON = {
      ...baseResume,
      summary: "Leveraged synergies across the whole org.",
      experience: [
        {
          company: "Acme",
          role: "Engineer",
          startDate: "2020",
          endDate: null,
          description: "Leveraged synergies to modernize infra.",
          achievements: ["Leveraged synergies to ship the release."],
        },
      ],
    };

    const next = applyChangesToResume(resumeWithSharedSubstring, [
      {
        original: "Leveraged synergies",
        replacement: "Used teamwork",
        reason: "cliche",
        path: "/experience/0/achievements/0",
      },
    ]);

    expect(next.experience[0].achievements[0]).toBe(
      "Used teamwork to ship the release."
    );
    // Untouched: the same substring appears in summary and description too,
    // but `path` scopes the fix to only the named achievement.
    expect(next.summary).toBe("Leveraged synergies across the whole org.");
    expect(next.experience[0].description).toBe(
      "Leveraged synergies to modernize infra."
    );
  });

  it("mixes path-based and whitelist-fallback changes in one call", () => {
    const next = applyChangesToResume(baseResume, [
      {
        original: "Spearheaded a project.",
        replacement: "Led a project.",
        reason: "buzzword",
        path: "/experience/0/achievements/0",
      },
      {
        original: "Leveraged synergies to spearhead innovative solutions.",
        replacement: "Built better solutions.",
        reason: "buzzword",
        path: null, // falls back to the whitelist walk
      },
    ]);

    expect(next.experience[0].achievements[0]).toBe("Led a project.");
    expect(next.summary).toBe("Built better solutions.");
  });
});
