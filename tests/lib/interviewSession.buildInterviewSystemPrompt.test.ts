/**
 * buildInterviewSystemPrompt is pure string-building (no LLM call) — this
 * confirms it produces a non-empty prompt that actually carries the job
 * title through from jobDetailsToCompactPositional, and that the resolved
 * tone-preset's distinguishing language + any custom instructions are
 * spliced in, without needing a live LLM call.
 */
import { describe, expect, it } from "vitest";

import { buildInterviewSystemPrompt } from "@/lib/llm/interview/interviewSession";
import { resolveInterviewStyleGuide } from "@/lib/llm/prompts/interviewStyles";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

// Minimal fixture — jobDetailsToCompactPositional only touches optional
// sub-fields, so empty objects for each section satisfy it (same pattern as
// tests/lib/domainOps.generateResume.test.ts).
const JOB_DETAILS = {
  job: { job_title: "Senior Backend Engineer" },
  company: {},
  location: {},
  responsibilities: {},
  requirements: {},
  nice_to_have: {},
  tech_stack: {},
  benefits: {},
  contact: {},
  raw_description: "",
} as unknown as JobDetailsJSON;

function makeResume(): ResumeJSON {
  return {
    header: {
      name: "Jane Doe",
      headline: null,
      email: "jane@example.com",
      phone: null,
      location: null,
      linkedin: null,
      github: null,
      website: null,
      photoDataUrl: null,
    },
    summary: "Experienced backend engineer.",
    experience: [
      {
        company: "Acme",
        role: "Engineer",
        startDate: "2020",
        endDate: null,
        description: "Built things.",
        achievements: ["Shipped things"],
      },
    ],
    projects: [],
    skills: [{ name: "TypeScript", category: null, tier: null }],
    education: [
      {
        institution: "State U",
        degree: "BS",
        field: "CS",
        startDate: "2016",
        endDate: "2020",
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
}

describe("buildInterviewSystemPrompt", () => {
  it("produces a non-empty prompt containing the job title and the selected style's distinguishing language", () => {
    const prompt = buildInterviewSystemPrompt({
      jobDetails: JOB_DETAILS,
      resume: makeResume(),
      styleGuide: resolveInterviewStyleGuide("tough"),
    });

    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain("Senior Backend Engineer");
    expect(prompt).toContain("FAANG-style");
  });

  it("splices custom instructions in alongside the resolved style guide", () => {
    const prompt = buildInterviewSystemPrompt({
      jobDetails: JOB_DETAILS,
      resume: makeResume(),
      styleGuide: resolveInterviewStyleGuide("honest"),
      customInstructions: "Focus heavily on system design.",
    });

    expect(prompt).toContain("unvarnished");
    expect(prompt).toContain("Focus heavily on system design.");
  });

  it("never leaves the interviewer's voice-friendly formatting instruction out", () => {
    const prompt = buildInterviewSystemPrompt({
      jobDetails: JOB_DETAILS,
      resume: makeResume(),
      styleGuide: resolveInterviewStyleGuide(),
    });

    expect(prompt.toLowerCase()).toContain("markdown");
    expect(prompt).toMatch(/one question at a time/i);
  });
});
