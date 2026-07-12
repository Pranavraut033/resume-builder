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
  sectionLayout: null,
};

describe("applyChangesToText", () => {
  it("replaces matched originals", () => {
    const result = applyChangesToText("Leveraged synergies to build things.", [
      {
        original: "Leveraged synergies",
        replacement: "Used teamwork",
        reason: "cliche",
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
      },
      {
        original: "Utilized cutting-edge technology.",
        replacement: "Used modern tools.",
        reason: "buzzword",
      },
      {
        original: "Spearheaded a project.",
        replacement: "Led a project.",
        reason: "buzzword",
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
});
