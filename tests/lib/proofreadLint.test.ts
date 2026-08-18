import { describe, expect, it } from "vitest";

import { lintResume } from "@/lib/proofread/lint";
import { resumePathLines } from "@/lib/resume/editor";
import { DocumentFindingKind } from "@/types/documentAnalysis";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

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

function makeJobDetails(
  overrides: Partial<JobDetailsJSON> = {}
): JobDetailsJSON {
  return {
    job: {
      job_title: "Backend Engineer",
      job_role_category: null,
      seniority_level: null,
      employment_type: null,
      workplace_type: null,
      reposted_status: null,
      application_volume_indicator: null,
    },
    company: {
      company_name: "Acme",
      company_industry: null,
      company_description: null,
      company_market_position: null,
      company_location_city: null,
      company_location_country: null,
      office_location_details: null,
    },
    location: {
      city: null,
      state_or_region: null,
      country: null,
      onsite_required: null,
    },
    responsibilities: {
      core_responsibilities: null,
      technical_responsibilities: null,
      collaboration_teams: null,
      architecture_responsibilities: null,
      performance_and_quality_expectations: null,
    },
    requirements: {
      required_experience_years: null,
      primary_technologies: null,
      programming_languages: null,
      frameworks_libraries: null,
      api_knowledge: null,
      version_control_tools: null,
      ux_ui_knowledge: null,
      soft_skills: null,
      language_requirements: null,
    },
    nice_to_have: {
      ci_cd_experience: null,
      testing_experience: null,
      cloud_platforms: null,
      domain_interest: null,
    },
    tech_stack: {
      frontend_stack: null,
      backend_stack: null,
      database: null,
      cloud_stack: null,
      devops_tools: null,
    },
    benefits: {
      compensation_type: null,
      work_environment: null,
      career_growth_opportunities: null,
      flexibility: null,
      office_perks: null,
      team_culture: null,
      events_and_travel: null,
    },
    contact: {
      recruiter_name: null,
      recruiter_role: null,
      contact_email: null,
      contact_phone: null,
      contact_whatsapp_available: null,
    },
    raw_description: "",
    ...overrides,
  };
}

describe("lintResume — clean resume", () => {
  it("returns zero findings for a well-formed resume (no false positives)", () => {
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
      nationality: null,
      dateOfBirth: null,
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

  const findings = lintResume(corpusResume);

  function findingsWhere(predicate: (f: (typeof findings)[number]) => boolean) {
    return findings.filter(predicate);
  }

  it("flags the dangling bullet glyph (•-) as correctness", () => {
    const stray = findingsWhere((f) => f.original.includes("•"));
    expect(stray.length).toBeGreaterThan(0);
    expect(stray.every((f) => f.kind === "correctness")).toBe(true);
  });

  it("flags the trailing hyphen glued to the GitHub URL", () => {
    const urlFinding = findings.find(
      (f) => f.original === "github.com/pranavraut033-"
    );
    expect(urlFinding).toBeDefined();
    expect(urlFinding?.suggestion).toBe("github.com/pranavraut033");
    expect(urlFinding?.path).toBe("/header/github");
    expect(urlFinding?.kind).toBe("correctness");
  });

  it("flags the two phone spellings for consistency", () => {
    const phoneFinding = findings.find(
      (f) => f.original === "+49 15510 256211"
    );
    expect(phoneFinding).toBeDefined();
    expect(phoneFinding?.suggestion).toBe("+49 1551 0256211");
    // The stray phone spelling was in the summary, not the header.
    expect(phoneFinding?.path).toBe("/summary");
  });

  it("flags the double space", () => {
    const spacingFinding = findings.find((f) => f.original === "  ");
    expect(spacingFinding).toBeDefined();
    expect(spacingFinding?.path).toBe("/experience/0/achievements/1");
  });

  it("flags the en-dash date range when a hyphen range also exists", () => {
    const dateFinding = findings.find((f) => f.original === "2018 – 2020");
    expect(dateFinding).toBeDefined();
    expect(dateFinding?.suggestion).toBe("2018 - 2020");
    expect(dateFinding?.path).toBe("/experience/1/description");
  });

  it("flags the bullet duplicated verbatim under two employers as duplication", () => {
    const duplicates = findings.filter(
      (f) =>
        f.kind === "duplication" &&
        f.original ===
          "Cut checkout latency 40% by migrating to Kafka-based retries."
    );
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].severity).toBe("error");
    // Duplicate is under the second experience entry (Beta Inc), bullet 0.
    expect(duplicates[0].path).toBe("/experience/1/achievements/0");
  });

  it("every finding is attributed to the lint pass", () => {
    expect(findings.every((f) => f.source === "lint")).toBe(true);
  });

  it("every finding's `path` resolves to a leaf that appears in resumePathLines", () => {
    const pathLines = resumePathLines(corpusResume);
    for (const finding of findings) {
      expect(finding.path).toBeTruthy();
      expect(pathLines).toMatch(
        new RegExp(
          `^${finding.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: `,
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
    const findings = lintResume(resume);
    expect(findings.some((f) => f.original === "TODO")).toBe(true);
    expect(findings.some((f) => f.original === "[Company]")).toBe(true);
    expect(findings.every((f) => f.kind === "correctness")).toBe(true);
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
    const findings = lintResume(resume);
    expect(findings).toHaveLength(1);
    expect(findings[0].original).toBe("Cut infra spend by 20%");
    expect(findings[0].suggestion).toBe("Cut infra spend by 20%.");
    expect(findings[0].path).toBe("/experience/0/achievements/3");
  });
});

describe("lintResume — canonical brand casing", () => {
  it("flags an incorrectly cased brand name", () => {
    const resume = makeResume({
      summary: "Built services with Javascript and Github Actions.",
    });
    const findings = lintResume(resume).filter(
      (f) => f.kind === ("correctness" satisfies DocumentFindingKind)
    );

    const jsFinding = findings.find((f) => f.original === "Javascript");
    expect(jsFinding?.suggestion).toBe("JavaScript");
    expect(jsFinding?.path).toBe("/summary");

    const githubFinding = findings.find((f) => f.original === "Github");
    expect(githubFinding?.suggestion).toBe("GitHub");
  });

  it("does not fire on a correctly-cased brand term (no false positive)", () => {
    const resume = makeResume({
      summary:
        "Built services with JavaScript, TypeScript, and GitHub Actions.",
    });
    expect(lintResume(resume)).toEqual([]);
  });
  it("does not fire inside a URL, a hyphenated tool name, or a package path", () => {
    // Regression: a bare \b boundary matched inside "docker-compose" and
    // "nodejs.org". These findings auto-apply with no review, so a false
    // positive here silently corrupts a real resume.
    const resume = makeResume({
      summary:
        "Authored docker-compose stacks, published to nodejs.org, profile at github.com/example and mysql-connector tuning.",
    });

    const brandFindings = lintResume(resume).filter(
      (f) => f.kind === "correctness" && /brand casing/.test(f.why)
    );

    expect(brandFindings).toEqual([]);
  });
});

describe("lintResume — internal consistency", () => {
  it("flags the minority-spelled digit-bearing identifier when a majority form exists", () => {
    const resume = makeResume({
      summary:
        "Deployed on K8s, scaled with K8s tooling and shared K8s runbooks.",
      experience: [
        {
          company: "Acme Corp",
          role: "Engineer",
          startDate: "2020",
          endDate: null,
          description: "Migrated the cluster off k8s 1.20.",
          achievements: ["Ran production workloads on k8s."],
        },
      ],
    });
    const findings = lintResume(resume);
    const consistency = findings.filter((f) => f.original === "k8s");
    expect(consistency.length).toBeGreaterThan(0);
    expect(consistency.every((f) => f.suggestion === "K8s")).toBe(true);
    expect(consistency.every((f) => f.kind === "correctness")).toBe(true);
  });

  it("does not fire when the same identifier is spelled the same way everywhere", () => {
    const resume = makeResume({
      summary: "Deployed on K8s and automated rollouts with K8s tooling.",
    });
    expect(lintResume(resume)).toEqual([]);
  });
});

describe("lintResume — skill-entry merge", () => {
  it("flags a redundant .js-suffixed skill entry duplicating a bare one", () => {
    const resume = makeResume({
      skills: [
        { name: "React", category: null, tier: null },
        { name: "React.js", category: null, tier: null },
      ],
    });
    const findings = lintResume(resume);
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe("duplication");
    expect(findings[0].original).toBe("React.js");
    expect(findings[0].suggestion).toBe("");
    expect(findings[0].path).toBe("/skills/1/name");
  });

  it("does not fire on two genuinely distinct skills", () => {
    const resume = makeResume({
      skills: [
        { name: "React", category: null, tier: null },
        { name: "Vue", category: null, tier: null },
      ],
    });
    expect(lintResume(resume)).toEqual([]);
  });
});

describe("lintResume — spelling variant", () => {
  it("flags a US spelling in the resume when the job description is UK English", () => {
    const resume = makeResume({
      summary:
        "Led efforts to organize and optimize the checkout color scheme.",
    });
    const ukJob = makeJobDetails({
      raw_description:
        "We are looking for someone to organise our team and optimise our processes, with strong attention to colour and behaviour.",
    });
    const findings = lintResume(resume, { jobDetails: ukJob });
    const spelling = findings.filter((f) =>
      ["organize", "optimize", "color"].includes(f.original)
    );
    expect(spelling.length).toBe(3);
    const organize = spelling.find((f) => f.original === "organize");
    expect(organize?.suggestion).toBe("organise");
    expect(organize?.kind).toBe("correctness");
  });

  it("does not fire without a jobDetails input", () => {
    const resume = makeResume({
      summary: "Led efforts to organize and optimize the checkout process.",
    });
    expect(lintResume(resume)).toEqual([]);
  });

  it("does not fire when the job description has no clear spelling-variant signal", () => {
    const resume = makeResume({
      summary: "Led efforts to organize and optimize the checkout process.",
    });
    const neutralJob = makeJobDetails({
      raw_description:
        "We are looking for a backend engineer to join our team.",
    });
    expect(lintResume(resume, { jobDetails: neutralJob })).toEqual([]);
  });
});
