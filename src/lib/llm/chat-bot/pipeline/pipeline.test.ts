import { describe, expect, it } from "vitest";

import { LLMUsageInfo } from "@/actions/tokenUsage";
import { ProviderType } from "@/types/llm";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

import { HallucinationFlag } from "./agents";
import { PipelineDeps, runTailoringPipeline } from "./pipeline";
import { LLMProvider } from "@pranavraut033/llm-core";

const usage: LLMUsageInfo = {
  promptTokens: 10,
  completionTokens: 5,
  totalTokens: 15,
  provider: ProviderType.OPENAI,
  model: "test-model",
  purpose: "generate_text",
};

const resume = {
  experience: [{ company: "Acme", role: "Eng", achievements: ["did a thing"] }],
} as unknown as ResumeJSON;

const jobDetails = {} as unknown as JobDetailsJSON;

// fake provider — never touched because deps are injected
const provider = {} as unknown as LLMProvider;

function makeDeps(
  flagSequence: HallucinationFlag[][],
  scores: number[]
): { deps: PipelineDeps; rewriteCalls: () => number } {
  let rewriteCalls = 0;
  let verifyCalls = 0;
  let scoreCalls = 0;
  const deps: PipelineDeps = {
    extractRequirements: () => ["React", "TypeScript"],
    rewriteBullets: async (_p, input) => {
      rewriteCalls++;
      return { experiences: input.experiences, usage };
    },
    checkHallucinations: async () => {
      const flags = flagSequence[verifyCalls] ?? [];
      verifyCalls++;
      return { flags, usage };
    },
    scoreResume: () => ({ score: scores[scoreCalls++] ?? 0 }),
  };
  return { deps, rewriteCalls: () => rewriteCalls };
}

async function collect(gen: AsyncGenerator<unknown>) {
  const events = [];
  for await (const e of gen) events.push(e);
  return events as Array<Record<string, unknown>>;
}

describe("runTailoringPipeline", () => {
  it("loops once when iteration 1 flags and iteration 2 is clean", async () => {
    const flag: HallucinationFlag = {
      experienceIndex: 0,
      bullet: "x",
      issue: "made up",
    };
    const { deps, rewriteCalls } = makeDeps([[flag], []], [50, 80]);

    const events = await collect(
      runTailoringPipeline(provider, {
        resume,
        jobDetails,
        options: { model: "m" },
        deps,
      })
    );

    expect(rewriteCalls()).toBe(2);
    const verifyEvents = events.filter((e) => e.stage === "verify");
    expect(verifyEvents).toHaveLength(2);
    expect((verifyEvents[1].flags as unknown[]).length).toBe(0);
    expect(events.at(-1)?.stage).toBe("done");
  });

  it("stops at maxIterations when flags never clear", async () => {
    const flag: HallucinationFlag = {
      experienceIndex: 0,
      bullet: "x",
      issue: "made up",
    };
    const { deps, rewriteCalls } = makeDeps([[flag], [flag], [flag]], [50, 60]);

    const events = await collect(
      runTailoringPipeline(provider, {
        resume,
        jobDetails,
        options: { model: "m" },
        maxIterations: 2,
        deps,
      })
    );

    expect(rewriteCalls()).toBe(2); // capped, no infinite loop
    expect(events.at(-1)?.stage).toBe("done");
  });

  it("reports before/after ATS delta and merges usage from all LLM calls", async () => {
    const { deps } = makeDeps([[]], [40, 75]);

    const events = await collect(
      runTailoringPipeline(provider, {
        resume,
        jobDetails,
        options: { model: "m" },
        deps,
      })
    );

    const score = events.find((e) => e.stage === "score");
    expect(score).toMatchObject({ before: 40, after: 75 });

    const done = events.find((e) => e.stage === "done") as Record<
      string,
      unknown
    >;
    const mergedUsage = done.usage as LLMUsageInfo;
    // one rewrite + one verify call, each 10 prompt tokens
    expect(mergedUsage.promptTokens).toBe(20);
  });
});
