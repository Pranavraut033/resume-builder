/**
 * Live regression for two real Ollama-integration bugs, plus coverage for
 * the rest of the domainOps resume functions.
 *
 * Root cause 1 (generateCoverLetter): OllamaProvider left Ollama's `think`
 * param unset, so a hybrid-reasoning model (e.g. qwen3.5) could burn its
 * entire num_predict budget on the internal thinking trace and return empty
 * content (done_reason: "length"). Fixed in packages/llm-core by defaulting
 * `think: false` unless the caller opts in via a positive thinkingBudget.
 *
 * Root cause 2 (analyzeATS/parseJobDetails on large real prompts):
 * OllamaProvider never set `num_ctx`, so Ollama's small default context
 * window (independent of num_predict/maxTokens) silently truncated output
 * once prompt + output tokens hit it. Fixed by defaulting num_ctx to 8192.
 *
 * Runs the app's real prompt templates and domain ops against a real local
 * Ollama server, using real profile/resume/job data pulled from dev.db —
 * no mocking. Skips automatically when Ollama isn't reachable (e.g. CI).
 */
import Database from "better-sqlite3";
import path from "path";
import { describe, expect, it } from "vitest";

import { getProviderInstance } from "@pranavraut033/llm-core";
import "@pranavraut033/llm-core/providers/register-builtins";

import {
  analyzeATS,
  generateCoverLetter,
  generateResume,
  humanizeContent,
  parseJobDetails,
  parseResume,
} from "@/lib/llm/domainOps";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

const OLLAMA_URL = "http://localhost:11434";
const MODEL = "qwen3.5:9b";
const DB_PATH = path.resolve(__dirname, "../../dev.db");

async function ollamaReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    return res.ok;
  } catch {
    return false;
  }
}

async function getProvider() {
  return getProviderInstance("ollama", { keyResolver: async () => undefined });
}

function loadRealJobAndResume(): {
  jobDetails: JobDetailsJSON;
  resume: ResumeJSON;
  description: string;
} {
  const db = new Database(DB_PATH, { readonly: true });
  const row = db
    .prepare(
      `SELECT j.job_details_json, j.description, r.content_json
       FROM jobs j JOIN resumes r ON r.id = j.resume_id
       WHERE j.resume_id IS NOT NULL
       ORDER BY j.id LIMIT 1`
    )
    .get() as
    | { job_details_json: string; description: string; content_json: string }
    | undefined;
  db.close();

  if (!row) throw new Error("No job with an attached resume found in dev.db");

  return {
    jobDetails: JSON.parse(row.job_details_json),
    resume: JSON.parse(row.content_json),
    description: row.description,
  };
}

/**
 * Mirrors `profileDataToResumeJson()` in src/actions/profile.ts (that
 * function is unexported and lives in a "use server" file, so it's
 * reimplemented here rather than imported).
 */
function loadRealBaseProfile(): ResumeJSON {
  const db = new Database(DB_PATH, { readonly: true });
  const row = db
    .prepare(
      `SELECT name, email, phone, location, linkedin, github, website, summary,
              skills_json, experience_json, projects_json, education_json,
              certifications_json, publications_json, languages_json,
              volunteer_json, awards_json
       FROM profiles ORDER BY id LIMIT 1`
    )
    .get() as
    | {
        name: string;
        email: string;
        phone: string | null;
        location: string | null;
        linkedin: string | null;
        github: string | null;
        website: string | null;
        summary: string | null;
        skills_json: string;
        experience_json: string;
        projects_json: string;
        education_json: string;
        certifications_json: string;
        publications_json: string | null;
        languages_json: string | null;
        volunteer_json: string | null;
        awards_json: string | null;
      }
    | undefined;
  db.close();

  if (!row) throw new Error("No profile found in dev.db");

  return {
    header: {
      name: row.name,
      email: row.email,
      headline: "",
      phone: row.phone,
      location: row.location,
      linkedin: row.linkedin,
      github: row.github,
      website: row.website,
      workAuthorization: null,
      photoDataUrl: null,
    },
    summary: row.summary || "",
    experience: JSON.parse(row.experience_json),
    projects: JSON.parse(row.projects_json),
    skills: JSON.parse(row.skills_json),
    education: JSON.parse(row.education_json),
    certifications: JSON.parse(row.certifications_json),
    publications: row.publications_json
      ? JSON.parse(row.publications_json)
      : [],
    languages: row.languages_json ? JSON.parse(row.languages_json) : [],
    volunteer: row.volunteer_json ? JSON.parse(row.volunteer_json) : [],
    awards: row.awards_json ? JSON.parse(row.awards_json) : [],
    hobbies: [],
    sectionLayout: null,
  };
}

/** Flattens a real ResumeJSON into plain prose for parseResume — there's no
 *  raw-text resume column in dev.db, only structured JSON. */
function resumeToPlainText(resume: ResumeJSON): string {
  const lines = [
    resume.header.name,
    resume.header.email,
    resume.summary,
    "",
    "Experience:",
    ...resume.experience.map(
      (e) => `- ${e.role} at ${e.company}: ${e.achievements.join(" ")}`
    ),
    "",
    "Skills: " + resume.skills.join(", "),
  ];
  return lines.filter(Boolean).join("\n");
}

describe.skipIf(!(await ollamaReachable()))(
  "OllamaProvider domainOps (live, real data)",
  () => {
    it("generateCoverLetter returns non-empty HTML content for a real resume/job pair", async () => {
      const { jobDetails, resume } = loadRealJobAndResume();
      const provider = await getProvider();

      const { result } = await generateCoverLetter(
        provider,
        { jobDetails, resume },
        { model: MODEL }
      );

      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    }, 300_000);

    it("analyzeATS returns real scores/keywords for a real resume/job pair", async () => {
      const { jobDetails, resume } = loadRealJobAndResume();
      const provider = await getProvider();

      const { result } = await analyzeATS(
        provider,
        { jobDetails, resume },
        { model: MODEL }
      );

      expect(typeof result.summary).toBe("string");
      expect(result.summary.length).toBeGreaterThan(0);
      expect(Array.isArray(result.keyword_analysis)).toBe(true);
      expect(result.scores.composite_score).toBeGreaterThanOrEqual(0);
      expect(result.scores.composite_score).toBeLessThanOrEqual(100);
    }, 300_000);

    it("generateResume tailors a real base profile to a real job", async () => {
      const { jobDetails } = loadRealJobAndResume();
      const baseProfile = loadRealBaseProfile();
      const provider = await getProvider();

      const { result } = await generateResume(
        provider,
        { baseProfile, jobDetails, atsAnalysis: null },
        { model: MODEL }
      );

      expect(result.header.name).toBe(baseProfile.header.name);
      expect(typeof result.summary).toBe("string");
      expect(Array.isArray(result.experience)).toBe(true);
      expect(Array.isArray(result.skills)).toBe(true);
    }, 300_000);

    it("parseJobDetails extracts structured fields from a real raw job description", async () => {
      const { description } = loadRealJobAndResume();
      const provider = await getProvider();

      const { result } = await parseJobDetails(provider, description, {
        model: MODEL,
      });

      expect(typeof result.job.job_title).toBe("string");
      expect(result.job.job_title.length).toBeGreaterThan(0);
      expect(typeof result.company.company_name).toBe("string");
    }, 300_000);

    it("parseResume extracts structured fields from a real resume flattened to text", async () => {
      const { resume } = loadRealJobAndResume();
      const provider = await getProvider();
      const resumeText = resumeToPlainText(resume);

      const { result } = await parseResume(provider, resumeText, {
        model: MODEL,
      });

      expect(typeof result.header.name).toBe("string");
      expect(result.header.name.length).toBeGreaterThan(0);
      expect(Array.isArray(result.experience)).toBe(true);
    }, 300_000);

    it("humanizeContent rewrites a real resume summary and reports changes", async () => {
      const { resume } = loadRealJobAndResume();
      const provider = await getProvider();

      const { result } = await humanizeContent(provider, resume.summary, {
        model: MODEL,
      });

      expect(typeof result.rewritten).toBe("string");
      expect(result.rewritten.length).toBeGreaterThan(0);
      expect(Array.isArray(result.changes)).toBe(true);
    }, 300_000);
  }
);
