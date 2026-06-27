/**
 * Multi-agent resume tailoring pipeline.
 *
 * The orchestrator IS the agent graph: a linear chain (requirements → rewrite →
 * verify → score) with one bounded verification loop around rewrite/verify.
 *
 * ponytail: no node/edge framework — a graph this small is an async generator
 * with a for-loop. Reach for a real graph lib only if the topology grows beyond
 * a linear chain plus one loop.
 */
import { LLMUsageInfo } from "@/actions/tokenUsage";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

import {
  checkHallucinations,
  extractRequirements,
  HallucinationFlag,
  rewriteBullets,
  scoreResume,
} from "./agents";
import { LLMProvider } from "@pranavraut033/llm-core";
import { mergeLLMUsageInfo } from "../../tokenTracker";

export type PipelineStageEvent =
  | { stage: "requirements"; requirements: string[] }
  | { stage: "rewrite"; iteration: number }
  | { stage: "verify"; iteration: number; flags: HallucinationFlag[] }
  | { stage: "score"; before: number; after: number }
  | {
      stage: "done";
      updatedResume: ResumeJSON;
      usage: LLMUsageInfo;
      atsBefore: number;
      atsAfter: number;
    }
  | { stage: "error"; message: string };

// ponytail: this seam exists only so the loop is unit-testable offline without a
// real provider — not speculative flexibility. The defaults are the real agents.
export type PipelineDeps = {
  extractRequirements: typeof extractRequirements;
  rewriteBullets: typeof rewriteBullets;
  scoreResume: typeof scoreResume;
  checkHallucinations: typeof checkHallucinations;
};

const defaultDeps: PipelineDeps = {
  extractRequirements,
  rewriteBullets,
  scoreResume,
  checkHallucinations,
};

export async function* runTailoringPipeline(
  provider: LLMProvider,
  params: {
    resume: ResumeJSON;
    jobDetails: JobDetailsJSON;
    options: { model: string };
    maxIterations?: number;
    deps?: PipelineDeps;
  }
): AsyncGenerator<PipelineStageEvent> {
  const {
    resume,
    jobDetails,
    options,
    maxIterations = 2,
    deps = defaultDeps,
  } = params;

  try {
    const atsBefore = deps.scoreResume(resume, jobDetails).score;

    const requirements = deps.extractRequirements(jobDetails);
    yield { stage: "requirements", requirements };

    let working = resume;
    const usages: LLMUsageInfo[] = [];
    let flags: HallucinationFlag[] = [];

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      yield { stage: "rewrite", iteration };
      const rewrite = await deps.rewriteBullets(
        provider,
        { experiences: working.experience, requirements, flags },
        options
      );
      usages.push(rewrite.usage);
      working = { ...working, experience: rewrite.experiences };

      // verify against the ORIGINAL resume so every iteration is checked from
      // ground truth, not the prior (possibly fabricated) attempt.
      const verify = await deps.checkHallucinations(
        provider,
        { original: resume, rewritten: working },
        options
      );
      usages.push(verify.usage);
      flags = verify.flags;
      yield { stage: "verify", iteration, flags };

      if (flags.length === 0) break;
    }

    const atsAfter = deps.scoreResume(working, jobDetails).score;
    yield { stage: "score", before: atsBefore, after: atsAfter };

    const usage = mergeLLMUsageInfo(usages[0], ...usages.slice(1));
    yield {
      stage: "done",
      updatedResume: working,
      usage,
      atsBefore,
      atsAfter,
    };
  } catch (error) {
    yield {
      stage: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
