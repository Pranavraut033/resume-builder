/**
 * Regression for a real bug: a provider (observed live with Ollama) can
 * return a structurally-valid but gutted resume (schema allows empty
 * arrays), which generateResume used to apply without question, wiping the
 * user's actual resume content. generateResume must now refuse to return a
 * tailored resume that has fewer populated sections than the profile it was
 * built from.
 */
import { LLMProvider } from "@pranavraut033/llm-core";
import { describe, expect, it } from "vitest";

import { generateResume } from "@/lib/llm/domainOps";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

const USAGE = { promptTokens: 10, completionTokens: 10 };

// Minimal fixture — jobDetailsToCompactPositional only touches optional
// sub-fields, so empty objects for each section satisfy it.
const JOB_DETAILS = {
  job: {},
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

function makeResume(overrides: Partial<ResumeJSON> = {}): ResumeJSON {
  return {
    header: { name: "Jane Doe", email: "jane@example.com", headline: "" },
    summary: "Experienced engineer.",
    experience: [
      {
        role: "Engineer",
        company: "Acme",
        achievements: ["Shipped things"],
      },
    ],
    projects: [],
    skills: ["TypeScript", "React"],
    education: [{ school: "State U", degree: "BS CS" }],
    certifications: [],
    publications: null,
    languages: null,
    volunteer: null,
    awards: null,
    sectionLayout: null,
    ...overrides,
  } as ResumeJSON;
}

function providerReturning(result: ResumeJSON): LLMProvider {
  return {
    runStructuredLLM: async () => ({ result, usage: USAGE }),
  } as unknown as LLMProvider;
}

describe("generateResume", () => {
  it("returns the tailored resume when sections are populated", async () => {
    const baseProfile = makeResume();
    const tailored = makeResume({ summary: "Tailored summary." });
    const provider = providerReturning(tailored);

    const { result } = await generateResume(
      provider,
      { baseProfile, jobDetails: JOB_DETAILS, atsAnalysis: null },
      { model: "test-model" }
    );

    expect(result.summary).toBe("Tailored summary.");
  });

  it("throws instead of applying a resume with experience emptied out", async () => {
    const baseProfile = makeResume();
    const gutted = makeResume({ experience: [] });
    const provider = providerReturning(gutted);

    await expect(
      generateResume(
        provider,
        { baseProfile, jobDetails: JOB_DETAILS, atsAnalysis: null },
        { model: "test-model" }
      )
    ).rejects.toThrow(/experience/);
  });

  it("throws when multiple sections are emptied out", async () => {
    const baseProfile = makeResume();
    const gutted = makeResume({ experience: [], skills: [], education: [] });
    const provider = providerReturning(gutted);

    await expect(
      generateResume(
        provider,
        { baseProfile, jobDetails: JOB_DETAILS, atsAnalysis: null },
        { model: "test-model" }
      )
    ).rejects.toThrow(/experience.*skills.*education/);
  });

  it("does not flag a section that was already empty in the base profile", async () => {
    const baseProfile = makeResume({ education: [] });
    const tailored = makeResume({ education: [] });
    const provider = providerReturning(tailored);

    await expect(
      generateResume(
        provider,
        { baseProfile, jobDetails: JOB_DETAILS, atsAnalysis: null },
        { model: "test-model" }
      )
    ).resolves.toBeTruthy();
  });

  it("ignores a model-invented sectionLayout that would hide every section but the header", async () => {
    // Regression: sectionLayout is a required (nullable) key in the
    // structured-output schema, but nothing in the tailoring prompt explains
    // it. A model can emit e.g. `{ order: ["header"] }`, which buildSections()
    // would then render as a resume with only the header visible — even
    // though summary/experience/skills/education all came back populated and
    // therefore never trip assertResumeNotGutted.
    const baseProfile = makeResume();
    const tailored = makeResume({
      sectionLayout: { order: ["header"], hidden: [], custom: [] },
    });
    const provider = providerReturning(tailored);

    const { result } = await generateResume(
      provider,
      { baseProfile, jobDetails: JOB_DETAILS, atsAnalysis: null },
      { model: "test-model" }
    );

    expect(result.sectionLayout).toBe(baseProfile.sectionLayout);
  });
});
