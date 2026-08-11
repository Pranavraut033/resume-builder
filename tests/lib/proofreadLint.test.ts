import { describe, expect, it } from "vitest";

import { lintResume } from "@/lib/proofread/lint";
import { resumePathLines } from "@/lib/resume/editor";
import { ProofreadCategory } from "@/types/proofread";
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
    skills: [{ name: "TypeScript", category: null, tier: null }],
    education: [
      {
        institution: "UT Austin",
        degree: "B.S.",
        field: "Computer Science",
        startDate: "2013",
        endDate: "2017",
        gpa: null,
      },
    ],
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

describe("lintResume — clean resume", () => {
  it("returns zero issues for a well-formed resume (no false positives)", () => {
    const resume = makeResume();
    expect(lintResume(resume)).toEqual([]);
  });
});

describe("lintResume — corpus defects", () => {
  // Built straight from the real defect corpus in the proofread plan.
  const corpusResume = makeResume({
    header: {
      name: "Jamie Rivera",
      headline: "Backend Engineer",
      email: "jamie@example.com",
      phone: "+49 1551 0256211",
      location: "Berlin, DE",
      linkedin: null,
      github: "github.com/pranavraut033-",
      website: null,
      workAuthorization: null,
      photoDataUrl: null,
    },
    summary:
      "Senior engineer with a track record. GitHub • - LinkedIn. Backup contact: +49 15510 256211.",
    experience: [
      {
        company: "Acme Corp",
        role: "Senior Engineer",
        startDate: "2020",
        endDate: "2021",
        description: "Worked 2020 - 2021 on payments.",
        achievements: [
          "Cut checkout latency 40% by migrating to Kafka-based retries.",
          "Built  scalable systems for millions of users.",
        ],
      },
      {
        company: "Beta Inc",
        role: "Engineer",
        startDate: "2018",
        endDate: "2020",
        description: "Worked 2018 – 2020 on infra.",
        achievements: [
          "Cut checkout latency 40% by migrating to Kafka-based retries.",
        ],
      },
    ],
  });

  const issues = lintResume(corpusResume);

  function issuesOf(category: ProofreadCategory) {
    return issues.filter((i) => i.category === category);
  }

  it("flags the dangling bullet glyph (•-) as stray_artifact", () => {
    const stray = issuesOf("stray_artifact");
    expect(stray.some((i) => i.original.includes("•"))).toBe(true);
  });

  it("flags the trailing hyphen glued to the GitHub URL as stray_artifact", () => {
    const stray = issuesOf("stray_artifact");
    expect(stray.some((i) => i.original === "github.com/pranavraut033-")).toBe(
      true
    );
    const urlIssue = stray.find(
      (i) => i.original === "github.com/pranavraut033-"
    );
    expect(urlIssue?.suggestion).toBe("github.com/pranavraut033");
    expect(urlIssue?.path).toBe("/header/github");
  });

  it("flags the two phone spellings as contact_format", () => {
    const contact = issuesOf("contact_format");
    expect(contact.some((i) => i.original === "+49 15510 256211")).toBe(true);
    const phoneIssue = contact.find((i) => i.original === "+49 15510 256211");
    expect(phoneIssue?.suggestion).toBe("+49 1551 0256211");
    // The stray phone spelling was in the summary, not the header.
    expect(phoneIssue?.path).toBe("/summary");
  });

  it("flags the double space as spacing", () => {
    const spacing = issuesOf("spacing");
    expect(spacing.some((i) => i.original === "  ")).toBe(true);
    const spacingIssue = spacing.find((i) => i.original === "  ");
    expect(spacingIssue?.path).toBe("/experience/0/achievements/1");
  });

  it("flags the en-dash date range as date_format when a hyphen range also exists", () => {
    const dates = issuesOf("date_format");
    expect(dates.some((i) => i.original === "2018 – 2020")).toBe(true);
    const dateIssue = dates.find((i) => i.original === "2018 – 2020");
    expect(dateIssue?.suggestion).toBe("2018 - 2020");
    expect(dateIssue?.path).toBe("/experience/1/description");
  });

  it("flags the bullet duplicated verbatim under two employers as exact_duplicate_bullet", () => {
    const duplicates = issuesOf("exact_duplicate_bullet");
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].original).toBe(
      "Cut checkout latency 40% by migrating to Kafka-based retries."
    );
    expect(duplicates[0].location).toContain("Beta Inc");
    expect(duplicates[0].severity).toBe("error");
    // Duplicate is under the second experience entry (Beta Inc), bullet 0.
    expect(duplicates[0].path).toBe("/experience/1/achievements/0");
  });

  it("every issue is attributed to the lint pass", () => {
    expect(issues.every((i) => i.source === "lint")).toBe(true);
  });

  it("every issue's `path` resolves to a leaf that appears in resumePathLines", () => {
    const pathLines = resumePathLines(corpusResume);
    for (const issue of issues) {
      expect(issue.path).toBeTruthy();
      expect(pathLines).toMatch(
        new RegExp(
          `^${(issue.path ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: `,
          "m"
        )
      );
    }
  });
});

describe("lintResume — placeholder text", () => {
  it("flags TODO/placeholder leftovers", () => {
    const resume = makeResume({
      summary: "TODO: rewrite this summary for [Company].",
    });
    const issues = lintResume(resume);
    const placeholders = issues.filter(
      (i) => i.category === "placeholder_text"
    );
    expect(placeholders.some((i) => i.original === "TODO")).toBe(true);
    expect(placeholders.some((i) => i.original === "[Company]")).toBe(true);
  });
});

describe("lintResume — bullet punctuation", () => {
  it("flags the minority-style bullet when most bullets share a terminal-punctuation convention", () => {
    const resume = makeResume({
      experience: [
        {
          company: "Acme Corp",
          role: "Engineer",
          startDate: "2020",
          endDate: null,
          description: "Owned the platform.",
          achievements: [
            "Shipped the checkout redesign.",
            "Migrated the fraud pipeline to Kafka.",
            "Reduced on-call load by half.",
            "Cut infra spend by 20%", // the only one missing a period
          ],
        },
      ],
    });
    const issues = lintResume(resume);
    const punctuation = issues.filter(
      (i) => i.category === "bullet_punctuation"
    );
    expect(punctuation).toHaveLength(1);
    expect(punctuation[0].original).toBe("Cut infra spend by 20%");
    expect(punctuation[0].suggestion).toBe("Cut infra spend by 20%.");
    expect(punctuation[0].path).toBe("/experience/0/achievements/3");
  });
});
