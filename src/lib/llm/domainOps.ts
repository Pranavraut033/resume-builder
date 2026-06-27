/**
 * Resume-domain LLM operations.
 *
 * @pranavraut033/llm-core's `LLMProvider` base class is domain-agnostic and
 * only ships `runLLM`/`runStructuredLLM`/`generateText`. The resume-specific
 * operations (generate resume, analyze ATS, etc.) that used to live as
 * methods on the project's own base class are free functions here instead —
 * they take a provider instance and use only its public API plus the
 * domain prompt system and Zod schemas.
 */
import { PromptSystem, ResolvedPrompt } from "@/lib/llm/prompts";
import {
  ResumePromptInput,
  CoverLetterPromptInput,
  LLMGenerationOptions,
  LLMResult,
  CoverLetterGenerationResult,
  JobParsingResult,
  PromptMessage,
  ResumeGenerationResult,
  ResumeParsingResult,
  HumanizeContentResult,
  ATSAnalysisPromptInput,
} from "@/types/llm";
import { HumanizerSchema } from "@/types/humanizer";
import {
  JobDetailsSchema,
  ATSAnalysisSchema,
  ATSAnalysisJSON,
  ResumeSchema,
} from "@/types/resume";

import { LLMProvider } from "@pranavraut033/llm-core";

export async function generateResume(
  provider: LLMProvider,
  input: ResumePromptInput,
  options: LLMGenerationOptions
): Promise<ResumeGenerationResult> {
  const resolvedPrompt = PromptSystem.generatePrompt(
    "generate_tailored_resume",
    { baseProfile: input.baseProfile, jobDetails: input.jobDetails }
  );

  const { result, usage } = await provider.runStructuredLLM(
    resolvedPrompt,
    options,
    ResumeSchema,
    "ResumeSchema"
  );

  return { result, usage };
}

export function analyzeATS(
  provider: LLMProvider,
  input: ATSAnalysisPromptInput,
  options: LLMGenerationOptions
): Promise<LLMResult<ATSAnalysisJSON>> {
  const prompt = PromptSystem.generatePrompt("analyze_ats", input);

  return provider.runStructuredLLM(
    prompt,
    options,
    ATSAnalysisSchema,
    "ATSAnalysisSchema"
  );
}

export async function generateCoverLetter(
  provider: LLMProvider,
  input: CoverLetterPromptInput,
  options: Omit<LLMGenerationOptions, "stream" | "onUsage">
): Promise<CoverLetterGenerationResult> {
  const resolvedPrompt = PromptSystem.generatePrompt("generate_cover_letter", {
    jobDetails: input.jobDetails,
    resume: input.resume,
    additionalInstructions: input.customInstructions,
  });
  const messages = toPromptMessages(resolvedPrompt);

  const { result, usage } = await provider.runLLM(messages, options);

  return { result, usage };
}

export async function parseJobDetails(
  provider: LLMProvider,
  description: string,
  options: LLMGenerationOptions
): Promise<JobParsingResult> {
  const template = PromptSystem.generatePrompt("parse_job", {
    jobDescription: description,
  });

  const { result, usage } = await provider.runStructuredLLM(
    template,
    options,
    JobDetailsSchema,
    "JobDetailsSchema"
  );
  return { result, usage };
}

export async function parseResume(
  provider: LLMProvider,
  resumeText: string,
  options: LLMGenerationOptions
): Promise<ResumeParsingResult> {
  const template = PromptSystem.generatePrompt("parse_resume", {
    resumeText,
  });
  const { result, usage } = await provider.runStructuredLLM(
    template,
    options,
    ResumeSchema,
    "ResumeSchema"
  );
  return { result, usage };
}

export async function humanizeContent(
  provider: LLMProvider,
  input: string,
  options: LLMGenerationOptions
): Promise<HumanizeContentResult> {
  const template = PromptSystem.generatePrompt("humanize_content", {
    userInput: input,
  });
  const { result, usage } = await provider.runStructuredLLM(
    template,
    options,
    HumanizerSchema,
    "HumanizerSchema"
  );
  return { result, usage };
}

// ponytail: LLMProvider.toPromptMessages is protected on the package's base
// class (an instance can't call it from outside), so this tiny conversion
// is duplicated here rather than exposed as a new public method upstream.
function toPromptMessages(resolved: ResolvedPrompt): PromptMessage[] {
  const withMessages = resolved as ResolvedPrompt & {
    messages?: PromptMessage[];
  };

  if (Array.isArray(withMessages.messages) && withMessages.messages.length) {
    return withMessages.messages;
  }

  const messages: PromptMessage[] = [];
  if (resolved.systemPrompt) {
    messages.push({ role: "system", content: resolved.systemPrompt });
  }
  if (resolved.userPrompt) {
    messages.push({ role: "user", content: resolved.userPrompt });
  }
  return messages;
}
