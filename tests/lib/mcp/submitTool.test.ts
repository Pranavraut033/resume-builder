import { describe, expect, it, vi } from "vitest";

import { getDraft } from "@/mcp/draft";
import { getPromptTool, McpDeps, submitTool } from "@/mcp/server";
import { DEFAULT_CUSTOMIZATION } from "@/types/customization";
import { ATSAnalysisJSON, JobDetailsJSON, ResumeJSON } from "@/types/resume";

function makeResume(overrides: Partial<ResumeJSON> = {}): ResumeJSON {
  return {
    header: {
      name: "Jamie Rivera",
      headline: "Backend Engineer",
      email: "jamie@example.com",
      phone: "555-0100",
      location: "Austin, TX",
      linkedin: null,
      github: null,
      website: null,
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
        achievements: ["Cut checkout latency 40%."],
      },
    ],
    projects: [],
    skills: [{ name: "TypeScript", category: "Languages", tier: "primary" }],
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
    ...overrides,
  };
}

const jobDetails: JobDetailsJSON = {
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
    ci_cd_experience: null,
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

const atsAnalysis: ATSAnalysisJSON = {
  keyword_analysis: [
    { keyword: "Kafka", match_type: "exact", match_status: "present" },
  ],
  missing_keywords: ["Kubernetes"],
  formatting_issues: [],
  scores: {
    keyword_match_score: 80,
    formatting_score: 100,
    content_quality_score: 70,
    composite_score: 75,
  },
  improvements: [],
  knockout_risks: [],
  title_alignment: {
    resume_title: "Backend Engineer",
    target_title: "Staff Backend Engineer",
    verdict: "below",
    note: "One level below target.",
  },
  summary: "Strong coverage.",
};

function makeDeps(overrides: Partial<McpDeps> = {}): McpDeps {
  return {
    getJob: vi.fn().mockRejectedValue(new Error("not found")),
    getResumeByJobId: vi.fn().mockRejectedValue(new Error("not found")),
    getCoverLetterByJobId: vi.fn().mockRejectedValue(new Error("not found")),
    getAllJob: vi.fn().mockResolvedValue([]),
    getProfileById: vi
      .fn()
      .mockResolvedValue({ ...makeResume(), label: "Jamie" }),
    getAllProfiles: vi.fn().mockResolvedValue([{ id: 1, label: "Jamie" }]),
    createJob: vi.fn().mockResolvedValue({ jobId: 42 }),
    findJobByUrl: vi.fn().mockResolvedValue(null),
    updateResume: vi.fn().mockResolvedValue({ success: true }),
    saveAtsAnalysis: vi.fn().mockResolvedValue({ success: true }),
    updateCoverLetter: vi.fn().mockResolvedValue({ success: true }),
    ...overrides,
  } as unknown as McpDeps;
}

describe("submitTool — add_job draft chain", () => {
  it("walks parse_job -> analyze_ats -> generate_tailored_resume -> generate_cover_letter via a single draftId, creating the job only at the end", async () => {
    const deps = makeDeps();

    const step1 = await submitTool(deps, {
      purpose: "parse_job",
      result: jobDetails,
    });
    expect(step1.ok).toBe(true);
    if (!step1.ok) throw new Error("unreachable");
    expect(step1.jobId).toBeNull();
    expect(step1.draftId).toBeDefined();
    expect(step1.next).toBe("analyze_ats");
    expect(step1.nextPrompt).toBeDefined();
    const draftId = step1.draftId!;
    expect(getDraft(draftId)?.jobDetails).toEqual(jobDetails);

    const step2 = await submitTool(deps, {
      purpose: "analyze_ats",
      draftId,
      result: atsAnalysis,
    });
    expect(step2.ok).toBe(true);
    if (!step2.ok) throw new Error("unreachable");
    expect(step2.jobId).toBeNull();
    expect(step2.next).toBe("generate_tailored_resume");
    expect(deps.saveAtsAnalysis).not.toHaveBeenCalled();
    expect(getDraft(draftId)?.atsAnalysis).toEqual(atsAnalysis);

    const tailored = makeResume({ summary: "Tailored summary." });
    const step3 = await submitTool(deps, {
      purpose: "generate_tailored_resume",
      draftId,
      result: tailored,
    });
    expect(step3.ok).toBe(true);
    if (!step3.ok) throw new Error("unreachable");
    expect(step3.jobId).toBeNull();
    expect(step3.next).toBe("generate_cover_letter");
    expect(deps.updateResume).not.toHaveBeenCalled();
    expect(getDraft(draftId)?.tailoredResume?.summary).toBe(
      "Tailored summary."
    );

    const step4 = await submitTool(deps, {
      purpose: "generate_cover_letter",
      draftId,
      result: "<p>Cover letter.</p>",
    });
    expect(step4.ok).toBe(true);
    if (!step4.ok) throw new Error("unreachable");
    expect(step4.jobId).toBe(42);
    expect(step4.next).toBeNull();
    expect(step4.nextPrompt).toBeUndefined();

    expect(deps.createJob).toHaveBeenCalledTimes(1);
    const created = (deps.createJob as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(created.jobDetails).toEqual(jobDetails);
    expect(created.tailoredResume.summary).toBe("Tailored summary.");
    expect(created.coverLetterText).toBe("<p>Cover letter.</p>");
    expect(created.atsAnalysis).toEqual(atsAnalysis);
    expect(created.profileId).toBe(1);

    // Draft is cleared once the job is actually created.
    expect(getDraft(draftId)).toBeNull();
  });

  it("includes a hint reminding the caller to reuse draftId on every draft-phase response", async () => {
    const deps = makeDeps();

    const step1 = await submitTool(deps, {
      purpose: "parse_job",
      result: jobDetails,
    });
    if (!step1.ok) throw new Error("unreachable");
    expect(step1.hint).toContain(step1.draftId!);
    expect(step1.hint).toMatch(/not carried automatically/);
  });

  it("errors clearly instead of silently dropping data when draftId doesn't resolve to anything", async () => {
    const deps = makeDeps();

    const result = await submitTool(deps, {
      purpose: "analyze_ats",
      draftId: "not-a-real-draft-id",
      result: atsAnalysis,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.errors[0]).toMatch(/was not found/);
    expect(result.errors[0]).toMatch(/not-a-real-draft-id/);
  });

  it("still honors an explicit input.* override over the draft (back-compat)", async () => {
    const deps = makeDeps();

    const step1 = await submitTool(deps, {
      purpose: "parse_job",
      result: jobDetails,
    });
    if (!step1.ok) throw new Error("unreachable");
    const draftId = step1.draftId!;

    const overrideJobDetails = {
      ...jobDetails,
      job: { ...jobDetails.job, job_title: "Overridden Title" },
    };
    const overrideResume = makeResume({ summary: "Override resume." });

    const step4 = await submitTool(deps, {
      purpose: "generate_cover_letter",
      draftId,
      result: "<p>Letter.</p>",
      input: { jobDetails: overrideJobDetails, tailoredResume: overrideResume },
    });
    expect(step4.ok).toBe(true);

    const created = (deps.createJob as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(created.jobDetails.job.job_title).toBe("Overridden Title");
    expect(created.tailoredResume.summary).toBe("Override resume.");
  });
});

describe("submitTool — client-stringified result", () => {
  it("unwraps a JSON-stringified object result instead of failing with 'Expected object, received string'", async () => {
    const deps = makeDeps();

    const result = await submitTool(deps, {
      purpose: "analyze_ats",
      result: JSON.stringify(atsAnalysis),
    });

    expect(result.ok).toBe(true);
  });

  it("still treats a real string result as a string for generate_cover_letter (no double-unwrap)", async () => {
    const deps = makeDeps({
      getJob: vi.fn().mockResolvedValue({ id: 1, profileId: 1 }),
      getCoverLetterByJobId: vi.fn().mockResolvedValue({
        customizations: { ...DEFAULT_CUSTOMIZATION, id: 1 },
      }),
    });

    const result = await submitTool(deps, {
      purpose: "generate_cover_letter",
      jobId: 1,
      result: "<p>Not JSON, just HTML.</p>",
    });

    expect(result.ok).toBe(true);
    expect(deps.updateCoverLetter).toHaveBeenCalledWith(
      1,
      "<p>Not JSON, just HTML.</p>",
      expect.anything()
    );
  });

  it("leaves a genuinely malformed string result as-is, surfacing the real schema error", async () => {
    const deps = makeDeps();

    const result = await submitTool(deps, {
      purpose: "analyze_ats",
      result: "not json at all",
    });

    expect(result.ok).toBe(false);
  });

  it("gives a transport-truncation hint (not the generic 'expected object' message) for malformed non-JSON string input", async () => {
    const deps = makeDeps();

    const result = await submitTool(deps, {
      purpose: "analyze_ats",
      result: "{ this is not valid json and looks truncated",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.errors[0]).toMatch(/truncated or malformed in transit/);
  });
});

describe("get_prompt — humanize_content requires input.userInput", () => {
  it("throws a clear error instead of silently rendering an empty CONTENT block", async () => {
    const deps = makeDeps();

    await expect(
      getPromptTool(deps, { purpose: "humanize_content" })
    ).rejects.toThrow(/requires input.userInput/);
  });

  it("succeeds and inlines the text once input.userInput is supplied", async () => {
    const deps = makeDeps();

    const result = await getPromptTool(deps, {
      purpose: "humanize_content",
      input: { userInput: "Successfully leveraged Go to build a queue." },
    });

    expect(result.userPrompt).toContain(
      "Successfully leveraged Go to build a queue."
    );
  });
});

describe("submitTool — validation and guards", () => {
  it("returns { ok: false, errors } for a schema failure and writes nothing", async () => {
    const deps = makeDeps();

    const result = await submitTool(deps, {
      purpose: "analyze_ats",
      result: { not: "valid" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(deps.saveAtsAnalysis).not.toHaveBeenCalled();
  });

  it("rejects a gutted tailored resume via the guard, without persisting", async () => {
    const deps = makeDeps({
      getJob: vi.fn().mockResolvedValue({ id: 1, profileId: 1 }),
      getResumeByJobId: vi.fn().mockResolvedValue({
        id: 1,
        contentJson: makeResume(),
        customizations: { ...DEFAULT_CUSTOMIZATION, id: 1 },
        atsAnalysis: null,
      }),
    });

    const gutted = makeResume({
      experience: [],
      skills: [],
      education: [],
      summary: "",
    });

    const result = await submitTool(deps, {
      purpose: "generate_tailored_resume",
      jobId: 1,
      result: gutted,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.errors[0]).toMatch(/emptied out/);
    expect(deps.updateResume).not.toHaveBeenCalled();
  });

  it("reports guardChanges when sectionLayout is carried over from the base profile", async () => {
    const deps = makeDeps({
      getJob: vi.fn().mockResolvedValue({ id: 1, profileId: 1 }),
      getResumeByJobId: vi.fn().mockResolvedValue({
        id: 1,
        contentJson: makeResume(),
        customizations: { ...DEFAULT_CUSTOMIZATION, id: 1 },
        atsAnalysis: null,
      }),
      getProfileById: vi.fn().mockResolvedValue({
        ...makeResume({
          sectionLayout: { order: ["header"], hidden: [], custom: [] },
        }),
        label: "Jamie",
      }),
    });

    const tailored = makeResume({ sectionLayout: null });

    const result = await submitTool(deps, {
      purpose: "generate_tailored_resume",
      jobId: 1,
      result: tailored,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.guardChanges).toBeDefined();
    expect(result.guardChanges![0]).toMatch(/sectionLayout/);
    expect(deps.updateResume).toHaveBeenCalledTimes(1);
  });
});

describe("submitTool — generate_cover_letter edge cases", () => {
  it("rejects when jobId is given but no cover letter exists yet", async () => {
    const deps = makeDeps({
      getJob: vi.fn().mockResolvedValue({ id: 1, profileId: 1 }),
      getCoverLetterByJobId: vi.fn().mockRejectedValue(new Error("missing")),
    });

    const result = await submitTool(deps, {
      purpose: "generate_cover_letter",
      jobId: 1,
      result: "<p>Letter.</p>",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.errors[0]).toMatch(/No cover letter exists yet/);
    expect(deps.updateCoverLetter).not.toHaveBeenCalled();
  });

  it("rejects job creation when multiple profiles exist and none was specified", async () => {
    const deps = makeDeps({
      getAllProfiles: vi.fn().mockResolvedValue([
        { id: 1, label: "Jamie" },
        { id: 2, label: "Alex" },
      ]),
    });

    const step1 = await submitTool(deps, {
      purpose: "parse_job",
      result: jobDetails,
    });
    if (!step1.ok) throw new Error("unreachable");
    const draftId = step1.draftId!;

    await submitTool(deps, {
      purpose: "generate_tailored_resume",
      draftId,
      result: makeResume(),
    });

    const result = await submitTool(deps, {
      purpose: "generate_cover_letter",
      draftId,
      result: "<p>Letter.</p>",
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.errors[0]).toMatch(/Multiple profiles exist/);
    expect(deps.createJob).not.toHaveBeenCalled();
  });

  it("auto-picks the single profile when exactly one exists", async () => {
    const deps = makeDeps();

    const step1 = await submitTool(deps, {
      purpose: "parse_job",
      result: jobDetails,
    });
    if (!step1.ok) throw new Error("unreachable");
    const draftId = step1.draftId!;

    await submitTool(deps, {
      purpose: "generate_tailored_resume",
      draftId,
      result: makeResume(),
    });

    const result = await submitTool(deps, {
      purpose: "generate_cover_letter",
      draftId,
      result: "<p>Letter.</p>",
    });

    expect(result.ok).toBe(true);
    const created = (deps.createJob as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(created.profileId).toBe(1);
  });
});

describe("submitTool — bookmark flow", () => {
  it("creates a BOOKMARKED job from parse_job + input.bookmark/url, with no tailored resume, and stops (next: null)", async () => {
    const deps = makeDeps();

    const result = await submitTool(deps, {
      purpose: "parse_job",
      result: jobDetails,
      input: { bookmark: true, url: "https://example.com/jobs/1" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.jobId).toBe(42);
    expect(result.next).toBeNull();
    expect(result.duplicate).toBeUndefined();

    expect(deps.createJob).toHaveBeenCalledTimes(1);
    const created = (deps.createJob as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(created.jobDetails).toEqual(jobDetails);
    expect(created.tailoredResume).toBeUndefined();
    expect(created.status).toBe("BOOKMARKED");
    expect(created.url).toBe("https://example.com/jobs/1");
    expect(created.profileId).toBe(1);
  });

  it("returns the existing job as a duplicate instead of creating a second row for an already-bookmarked URL", async () => {
    const deps = makeDeps({
      findJobByUrl: vi.fn().mockResolvedValue({ id: 7 }),
    });

    const result = await submitTool(deps, {
      purpose: "parse_job",
      result: jobDetails,
      input: { bookmark: true, url: "https://example.com/jobs/1" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.jobId).toBe(7);
    expect(result.duplicate).toBe(true);
    expect(deps.createJob).not.toHaveBeenCalled();
  });

  it("rejects input.bookmark without input.url", async () => {
    const deps = makeDeps();

    const result = await submitTool(deps, {
      purpose: "parse_job",
      result: jobDetails,
      input: { bookmark: true },
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.errors[0]).toMatch(/requires input.url/);
    expect(deps.createJob).not.toHaveBeenCalled();
  });

  it("rejects bookmark job creation when multiple profiles exist and none was specified", async () => {
    const deps = makeDeps({
      getAllProfiles: vi.fn().mockResolvedValue([
        { id: 1, label: "Jamie" },
        { id: 2, label: "Alex" },
      ]),
    });

    const result = await submitTool(deps, {
      purpose: "parse_job",
      result: jobDetails,
      input: { bookmark: true, url: "https://example.com/jobs/1" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.errors[0]).toMatch(/Multiple profiles exist/);
    expect(deps.createJob).not.toHaveBeenCalled();
  });

  it("does not affect a normal (non-bookmark) parse_job submit — still drafts and returns next: analyze_ats", async () => {
    const deps = makeDeps();

    const result = await submitTool(deps, {
      purpose: "parse_job",
      result: jobDetails,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(result.jobId).toBeNull();
    expect(result.next).toBe("analyze_ats");
    expect(deps.createJob).not.toHaveBeenCalled();
  });
});

describe("submitTool — nextPrompt", () => {
  it("includes nextPrompt only when next is non-null", async () => {
    const deps = makeDeps();

    const withNext = await submitTool(deps, {
      purpose: "parse_job",
      result: jobDetails,
    });
    if (!withNext.ok) throw new Error("unreachable");
    expect(withNext.next).not.toBeNull();
    expect(withNext.nextPrompt).toBeDefined();
    expect(withNext.nextPrompt?.systemPrompt).toBeTruthy();

    const terminal = await submitTool(deps, {
      purpose: "humanize_content",
      result: { rewritten: "Rewritten text.", changes: [] },
    });
    if (!terminal.ok) throw new Error("unreachable");
    expect(terminal.next).toBeNull();
    expect(terminal.nextPrompt).toBeUndefined();
  });
});
