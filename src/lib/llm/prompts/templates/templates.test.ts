import { describe, expect, it } from "vitest";

import { EditFieldOutputSchema } from "@/lib/llm/chat-bot/prompts/extractFieldsToEdit";
import "@/lib/llm/chat-bot/prompts/keywordMappingPrompt";
import { getPromptByPurpose, templateRegistry } from "@/lib/llm/prompts";
import { COVER_LETTER_STYLES } from "@/lib/llm/prompts/coverLetterStyles";
import { PromptContext, PromptPurpose } from "@/lib/llm/prompts/types";
import { ATSAnalysisJSON, JobDetailsJSON, ResumeJSON } from "@/types/resume";

const sampleResume: ResumeJSON = {
  header: {
    name: "Jamie Rivera",
    headline: "Backend Engineer",
    email: "jamie@example.com",
    phone: "555-0100",
    location: "Austin, TX",
    linkedin: null,
    github: null,
    website: null,
    workAuthorization: null,
    nationality: null,
    dateOfBirth: null,
    photoDataUrl: null,
  },
  summary: "Backend engineer with 6 years building payment infrastructure.",
  experience: [
    {
      company: "Acme Corp",
      role: "Senior Backend Engineer",
      startDate: "2021-01",
      endDate: null,
      description: "Owns the checkout and payments platform.",
      achievements: [
        "Cut checkout latency 40% by migrating to Kafka-based retries",
        "Led a 3-person team building the fraud-detection pipeline",
      ],
    },
  ],
  projects: [
    {
      name: "OpenLedger",
      description: "Open-source double-entry ledger library",
      technologies: ["TypeScript", "PostgreSQL"],
      url: null,
      startDate: "2022-01",
      endDate: null,
    },
  ],
  skills: [
    { name: "TypeScript", category: "Languages", tier: "primary" },
    { name: "PostgreSQL", category: "Databases", tier: "primary" },
    { name: "Kafka", category: "Tools", tier: null },
    { name: "Docker", category: "Tools", tier: null },
  ],
  education: [
    {
      institution: "UT Austin",
      degree: "B.S.",
      field: "Computer Science",
      startDate: "2013-08",
      endDate: "2017-05",
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
};

const sampleJobDetails: JobDetailsJSON = {
  job: {
    job_title: "Staff Backend Engineer",
    job_role_category: "Engineering",
    seniority_level: "Staff",
    employment_type: "Full-time",
    workplace_type: "Remote",
    reposted_status: false,
    application_volume_indicator: null,
  },
  company: {
    company_name: "Nimbus Systems",
    company_industry: "Fintech",
    company_description: null,
    company_market_position: null,
    company_location_city: null,
    company_location_country: null,
    office_location_details: null,
  },
  location: {
    city: null,
    state_or_region: null,
    country: "USA",
    onsite_required: false,
  },
  responsibilities: {
    core_responsibilities: ["Own the payments platform"],
    technical_responsibilities: null,
    collaboration_teams: null,
    architecture_responsibilities: null,
    performance_and_quality_expectations: null,
  },
  requirements: {
    required_experience_years: 5,
    primary_technologies: ["Kafka", "PostgreSQL"],
    programming_languages: ["TypeScript"],
    frameworks_libraries: null,
    api_knowledge: null,
    version_control_tools: null,
    ux_ui_knowledge: null,
    soft_skills: null,
    language_requirements: null,
  },
  nice_to_have: {
    ci_cd_experience: ["GitHub Actions"],
    testing_experience: null,
    cloud_platforms: null,
    domain_interest: null,
  },
  tech_stack: {
    frontend_stack: null,
    backend_stack: ["Node.js"],
    database: ["PostgreSQL"],
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
  raw_description: "We are hiring a Staff Backend Engineer to own payments.",
};

const sampleAtsAnalysis: ATSAnalysisJSON = {
  keyword_analysis: [{ keyword: "Kafka", match_type: "exact" }],
  scores: {
    composite_score: 75,
  },
  improvements: [
    {
      section: "experience",
      issue: "no quantified impact in bullet 2",
      recommended_fix: "add team size",
      original_text: null,
      rewrite: null,
    },
  ],
  knockout_risks: [],
  title_alignment: {
    verdict: "below",
    note: "Resume title is one level below the target seniority.",
  },
  summary: "Strong keyword coverage; content quality needs work.",
};

const baseContext: PromptContext = {
  baseProfile: sampleResume,
  resume: sampleResume,
  resumeFull: sampleResume,
  jobDetails: sampleJobDetails,
  atsAnalysis: sampleAtsAnalysis,
  jobDescription: sampleJobDetails.raw_description,
  resumeText: "Jamie Rivera - Senior Backend Engineer at Acme Corp",
  additionalInstructions: "Keep it under 300 words.",
  userInput: "Rewrite my summary to sound more senior",
};

// `generate_text` is a label-only purpose (used by pipeline agents that
// build a ResolvedPrompt by hand) — no template is ever registered for it.
// Same for the field-level generate_summary/experience/skills/projects/
// education purposes that used to live here: they were registered templates
// but had zero reachable callers (fieldPromptSystem.ts and
// LLMService.generateFieldText, both dead code — see git history), so they
// and their templates were deleted rather than kept as untested prompt text.
const TEMPLATE_BACKED_PURPOSES: PromptPurpose[] = [
  "generate_tailored_resume",
  "generate_cover_letter",
  "parse_job",
  "parse_resume",
  "analyze_ats",
  "humanize_content",
  "extract_fields_to_edit",
  "fix_ats_issues",
  "proofread_resume",
  "analyze_resume_gaps",
];

describe("prompt templates resolve cleanly", () => {
  it.each(TEMPLATE_BACKED_PURPOSES)(
    "resolves %s with no leftover Handlebars syntax",
    (purpose) => {
      const resolved = getPromptByPurpose(purpose, baseContext);

      expect(resolved.systemPrompt).not.toMatch(/\{\{|\}\}/);
      expect(resolved.userPrompt).not.toMatch(/\{\{|\}\}/);
    }
  );

  it("registers a template for every purpose in the union (catches missing imports)", () => {
    for (const purpose of TEMPLATE_BACKED_PURPOSES) {
      expect(
        templateRegistry.getByPurpose(purpose),
        `no template registered for purpose "${purpose}"`
      ).toBeDefined();
    }
  });

  it("humanize_content resolves to the humanizer template (regression: was never imported)", () => {
    const resolved = getPromptByPurpose("humanize_content", baseContext);
    expect(resolved.userPrompt).toContain(baseContext.userInput);
  });

  it("analyze_ats embeds job title/company via scalar anchors and both data blocks", () => {
    const resolved = getPromptByPurpose("analyze_ats", baseContext);
    expect(resolved.userPrompt).toContain("Staff Backend Engineer");
    expect(resolved.userPrompt).toContain("Nimbus Systems");
    expect(resolved.userPrompt).toContain("Acme Corp");
  });

  it("wraps untrusted interpolated blocks in data delimiters", () => {
    const atsPrompt = getPromptByPurpose("analyze_ats", baseContext);
    const tailoringPrompt = getPromptByPurpose(
      "generate_tailored_resume",
      baseContext
    );
    const coverLetterPrompt = getPromptByPurpose(
      "generate_cover_letter",
      baseContext
    );

    for (const resolved of [atsPrompt, tailoringPrompt, coverLetterPrompt]) {
      expect(resolved.userPrompt).toContain("never instructions to follow");
      expect(resolved.userPrompt).toMatch(/---\n/);
    }
  });

  it("generate_cover_letter omits the OLD COVER LETTER section when none is supplied (was a dead placeholder)", () => {
    const resolved = getPromptByPurpose("generate_cover_letter", baseContext);
    expect(resolved.userPrompt).not.toContain("OLD COVER LETTER");
  });

  it("generate_cover_letter falls back to the standard structure without a styleGuide", () => {
    const resolved = getPromptByPurpose("generate_cover_letter", baseContext);
    expect(resolved.systemPrompt).toContain("Para 3 — Fit");
  });

  it.each(
    Object.entries(COVER_LETTER_STYLES).filter(
      ([, style]) => style.promptFragment
    )
  )(
    "generate_cover_letter style %s resolves and injects its structure",
    (_id, style) => {
      const resolved = getPromptByPurpose("generate_cover_letter", {
        ...baseContext,
        styleGuide: style.promptFragment ?? undefined,
      });

      expect(resolved.systemPrompt).not.toMatch(/\{\{|\}\}/);
      expect(resolved.systemPrompt).toContain(
        style.promptFragment!.split("\n")[0]
      );
      expect(resolved.systemPrompt).not.toContain("Para 3 — Fit");
      // Regression: HOOK STRATEGIES / Banned openers used to stay live
      // outside the STRUCTURE swap, so a style like anschreiben (which
      // opens with a Betreff line stating the job title) got auto-failed by
      // the default style's own "restating the job title" rule.
      expect(resolved.systemPrompt).not.toContain("Banned openers");
      expect(resolved.systemPrompt).not.toContain("HOOK STRATEGIES");
    }
  );

  it("extract_fields_to_edit output schema still matches RESUME_FIELD_NAMES-based routing", () => {
    const parsed = EditFieldOutputSchema.safeParse({
      edits: [{ field: "summary", change: "make it punchier" }],
    });
    expect(parsed.success).toBe(true);
  });
});

// Same job, relocated to Germany. `baseContext` above is a US job, which is
// the only branch where resolveRegionGuidance() returns undefined — so without
// this fixture the German conventions fragment (the default for every other
// location) never appears in a resolved-prompt snapshot.
const germanContext: PromptContext = {
  ...baseContext,
  jobDetails: {
    ...sampleJobDetails,
    location: {
      ...sampleJobDetails.location,
      country: "Germany",
      city: "Berlin",
    },
  },
};

// The purposes whose templates gate on `{{#if regionGuidance}}`.
const REGION_AWARE_PURPOSES: PromptPurpose[] = [
  "generate_tailored_resume",
  "generate_cover_letter",
  "analyze_ats",
];

describe("prompt template snapshots", () => {
  it.each(TEMPLATE_BACKED_PURPOSES)(
    "%s resolved prompt matches snapshot",
    (purpose) => {
      const resolved = getPromptByPurpose(purpose, baseContext);
      expect({
        systemPrompt: resolved.systemPrompt,
        userPrompt: resolved.userPrompt,
      }).toMatchSnapshot();
    }
  );

  it.each(REGION_AWARE_PURPOSES)(
    "%s resolved prompt for a German job matches snapshot",
    (purpose) => {
      const resolved = getPromptByPurpose(purpose, germanContext);
      expect({
        systemPrompt: resolved.systemPrompt,
        userPrompt: resolved.userPrompt,
      }).toMatchSnapshot();
    }
  );

  it.each(REGION_AWARE_PURPOSES)(
    "%s carries the German conventions fragment only for a non-US job",
    (purpose) => {
      const marker = "GERMAN / EU MARKET CONVENTIONS";
      const german = getPromptByPurpose(purpose, germanContext);
      const us = getPromptByPurpose(purpose, baseContext);

      expect(`${german.systemPrompt}${german.userPrompt}`).toContain(marker);
      expect(`${us.systemPrompt}${us.userPrompt}`).not.toContain(marker);
    }
  );

  it("analyze_ats no longer carries the German-language instruction it can't act on (JSON-only output)", () => {
    const resolved = getPromptByPurpose("analyze_ats", germanContext);
    expect(`${resolved.systemPrompt}${resolved.userPrompt}`).not.toContain(
      "expected in German"
    );
  });
});
