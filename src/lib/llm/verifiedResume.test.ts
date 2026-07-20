import { LLMProvider } from "@pranavraut033/llm-core";
import { describe, expect, it } from "vitest";

import { LLMUsageInfo } from "@/actions/tokenUsage";
import { ProviderType, ResumePromptInput } from "@/types/llm";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

import { ResumeFactFlag } from "./verifiedResume";
import { generateVerifiedResume, VerifiedResumeDeps } from "./verifiedResume";

const usage: LLMUsageInfo = {
  promptTokens: 10,
  completionTokens: 5,
  totalTokens: 15,
  provider: ProviderType.OPENAI,
  model: "test-model",
  purpose: "generate_text",
};

const baseProfile = {
  header: { headline: "Engineer" },
  summary: "Base summary",
  experience: [{ company: "Acme", role: "Eng", achievements: ["did a thing"] }],
  skills: [{ name: "React" }],
} as unknown as ResumeJSON;

const tailored = {
  ...baseProfile,
  summary: "Tailored summary",
} as unknown as ResumeJSON;

const jobDetails = {} as unknown as JobDetailsJSON;

const input: ResumePromptInput = {
  baseProfile,
  jobDetails,
  atsAnalysis: null,
};

// fake provider — never touched because deps are injected
const provider = {} as unknown as LLMProvider;

function makeDeps(
  flags: ResumeFactFlag[],
  scores: [number, number]
): { deps: VerifiedResumeDeps; correctCalls: () => number } {
  let correctCalls = 0;
  let scoreCalls = 0;
  const deps: VerifiedResumeDeps = {
    generateResume: async () => ({ result: tailored, usage }),
    checkResumeHallucinations: async () => ({ flags, usage }),
    correctResume: async () => {
      correctCalls++;
      return { result: { ...tailored, summary: "Corrected summary" }, usage };
    },
    scoreResume: () => ({ score: scores[scoreCalls++] ?? 0 }),
  };
  return {
    deps,
    correctCalls: () => correctCalls,
  };
}

describe("generateVerifiedResume", () => {
  it("makes no corrective pass when the first fact-check is clean", async () => {
    const { deps, correctCalls } = makeDeps([], [50, 50]);

    const result = await generateVerifiedResume(
      provider,
      input,
      { model: "m" },
      deps
    );

    expect(correctCalls()).toBe(0);
    expect(result.result).toBe(tailored);
    expect(result.flags).toEqual([]);
  });

  it("runs exactly one corrective pass when flags are found, no loop", async () => {
    const flag: ResumeFactFlag = {
      field: "summary",
      claim: "led a team of 50",
      issue: "not in base profile",
    };
    const { deps, correctCalls } = makeDeps([flag], [40, 70]);

    const result = await generateVerifiedResume(
      provider,
      input,
      { model: "m" },
      deps
    );

    expect(correctCalls()).toBe(1);
    expect(result.result.summary).toBe("Corrected summary");
    expect(result.flags).toEqual([flag]);
  });

  it("reports before/after ATS delta and merges usage from all LLM calls", async () => {
    const { deps } = makeDeps([], [40, 75]);

    const result = await generateVerifiedResume(
      provider,
      input,
      { model: "m" },
      deps
    );

    expect(result.atsBefore).toBe(40);
    expect(result.atsAfter).toBe(75);
    // generateResume + checkResumeHallucinations, each 10 prompt tokens
    expect(result.usage.promptTokens).toBe(20);
  });
});
