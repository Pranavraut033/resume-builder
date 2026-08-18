import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { DocumentAnalysisJSON } from "@/types/documentAnalysis";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

// A dedicated on-disk SQLite file for this test suite, kept separate from the
// dev/app database so we never touch real user data. Must be set before any
// module that reads process.env.DATABASE_URL (src/lib/prisma.ts) is imported.
const REPO_ROOT = path.join(__dirname, "../../..");
const TEST_DB_PATH = path.join(REPO_ROOT, ".vitest-job-test.db");
process.env.DATABASE_URL = `file:${TEST_DB_PATH}`;

function cleanupDbFiles() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const p = TEST_DB_PATH + suffix;
    if (fs.existsSync(p)) fs.rmSync(p);
  }
}

let prisma: typeof import("@/lib/prisma").prisma;
let createJob: typeof import("./job").createJob;
let attachGeneratedMaterials: typeof import("./job").attachGeneratedMaterials;
let getJob: typeof import("./job").getJob;
let getResumeByJobId: typeof import("./job").getResumeByJobId;
let getCoverLetterByJobId: typeof import("./job").getCoverLetterByJobId;

beforeAll(async () => {
  cleanupDbFiles();
  execSync("npx prisma db push --accept-data-loss", {
    cwd: REPO_ROOT,
    env: { ...process.env, DATABASE_URL: `file:${TEST_DB_PATH}` },
    stdio: "pipe",
  });

  ({ prisma } = await import("@/lib/prisma"));
  ({
    createJob,
    attachGeneratedMaterials,
    getJob,
    getResumeByJobId,
    getCoverLetterByJobId,
  } = await import("./job"));
}, 60_000);

afterAll(async () => {
  await prisma.$disconnect();
  cleanupDbFiles();
});

async function wipeAllTables() {
  await prisma.tokenUsage.deleteMany();
  await prisma.resumeSnapshot.deleteMany();
  await prisma.job.deleteMany();
  await prisma.coverLetter.deleteMany();
  await prisma.resume.deleteMany();
  await prisma.aTSAnalysis.deleteMany();
  await prisma.fitCheck.deleteMany();
  await prisma.customization.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.profile.deleteMany();
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

const atsAnalysis: DocumentAnalysisJSON = {
  v: 2,
  findings: [
    {
      path: "/experience/0/achievements/0",
      original: "Cut checkout latency 40%.",
      suggestion: "Cut checkout latency 40% via Kafka-backed caching.",
      kind: "keyword",
      severity: "suggestion",
      why: "Missing the primary technology keyword from the job description.",
      source: "llm",
    },
  ],
  summary: "Strong coverage.",
};

describe("attachGeneratedMaterials", () => {
  beforeEach(async () => {
    await wipeAllTables();
  });

  it("attaches resume/cover letter/ATS analysis to a bookmark and flips status to DRAFT", async () => {
    const { jobId } = await createJob({ jobDetails, status: "BOOKMARKED" });

    const bookmarked = await getJob(jobId);
    expect(bookmarked.status).toBe("BOOKMARKED");

    const result = await attachGeneratedMaterials(jobId, {
      tailoredResume: makeResume(),
      coverLetterText: "some text",
      atsAnalysis,
      status: "DRAFT",
    });

    expect(result).toEqual({ success: true });

    const updated = await getJob(jobId);
    expect(updated.status).toBe("DRAFT");

    const resume = await getResumeByJobId(jobId);
    expect(resume.contentJson.header.name).toBe("Jamie Rivera");

    const coverLetter = await getCoverLetterByJobId(jobId);
    expect(coverLetter.contentText).toBe("some text");
  });
});

describe("getResumeByJobId — stale analysis blob", () => {
  beforeEach(async () => {
    await wipeAllTables();
  });

  it("falls back to atsAnalysis: null instead of throwing when the stored blob predates v: 2", async () => {
    // Regression: getResumeByJobId used a throwing DocumentAnalysisSchema.parse
    // with no try/catch, unlike getJob()'s baseProfileAnalysis right above it
    // in this file. A single stale (pre-v:2) row made the ENTIRE job-editor
    // page fail to load instead of the drawer showing its own "re-run"
    // empty state — exactly the crash the v:2 version-check design exists to
    // prevent.
    const { jobId } = await createJob({ jobDetails, status: "BOOKMARKED" });
    await attachGeneratedMaterials(jobId, {
      tailoredResume: makeResume(),
      status: "DRAFT",
    });

    const job = await getJob(jobId);
    const resumeId = (await getResumeByJobId(jobId)).id;

    // Write a pre-refactor-shaped blob directly, bypassing the app's own
    // write path (which always writes valid v:2 JSON) to simulate a row
    // that predates this schema.
    await prisma.aTSAnalysis.create({
      data: {
        contentJson: JSON.stringify({
          keyword_analysis: [],
          scores: { composite_score: 80 },
          improvements: [],
          summary: "old shape",
        }),
        resume: { connect: { id: resumeId } },
      },
    });

    const resume = await getResumeByJobId(jobId);
    expect(resume.atsAnalysis).toBeNull();
    expect(job.id).toBe(jobId);
  });
});
