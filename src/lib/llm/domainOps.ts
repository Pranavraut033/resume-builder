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
import { LLMProvider } from "@pranavraut033/llm-core";

import { PromptSystem, ResolvedPrompt } from "@/lib/llm/prompts";
import { HumanizerSchema } from "@/types/humanizer";
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
import {
  JobDetailsSchema,
  ATSAnalysisSchema,
  ATSAnalysisJSON,
  ResumeSchema,
  ResumeJSON,
} from "@/types/resume";

// ponytail: ResumeSchema allows empty arrays (a resume mid-edit is valid), so
// Zod alone can't catch a model that silently drops every section — observed
// live with Ollama, where a truncated/degenerate structured-output response
// still parses as a "valid" empty resume and overwrites the real one. Refuse
// to apply a tailored resume that has fewer populated sections than the
// profile it was built from, rather than trusting schema validity alone.
export function assertResumeNotGutted(base: ResumeJSON, tailored: ResumeJSON) {
  const gutted = (
    [
      ["summary", base.summary.trim(), tailored.summary.trim()],
      ["experience", base.experience.length, tailored.experience.length],
      ["skills", base.skills.length, tailored.skills.length],
      ["education", base.education.length, tailored.education.length],
    ] as const
  )
    .filter(([, baseHasContent, tailoredHasContent]) =>
      typeof baseHasContent === "string"
        ? baseHasContent && !tailoredHasContent
        : baseHasContent > 0 && tailoredHasContent === 0
    )
    .map(([field]) => field);

  if (gutted.length > 0) {
    throw new Error(
      `Model returned a resume with ${gutted.join(", ")} emptied out — refusing to apply. This usually means the output got truncated (try a model/provider with a larger context window).`
    );
  }
}

export async function generateResume(
  provider: LLMProvider,
  input: ResumePromptInput,
  options: LLMGenerationOptions
): Promise<ResumeGenerationResult> {
  const resolvedPrompt = PromptSystem.generatePrompt(
    "generate_tailored_resume",
    {
      baseProfile: input.baseProfile,
      jobDetails: input.jobDetails,
      atsAnalysis: input.atsAnalysis ?? undefined,
    }
  );

  const { result, usage } = await provider.runStructuredLLM(
    resolvedPrompt,
    options,
    ResumeSchema,
    "ResumeSchema"
  );

  // ponytail: sectionLayout is a required key in the structured-output schema
  // (nullable, not optional) but the prompt never explains it — nothing tells
  // the model what "order"/"hidden" mean. A model left to guess can emit e.g.
  // `{ order: ["header"] }`, which buildSections() then renders as a resume
  // with only the header section visible, even though every other field came
  // back fully populated. This is a display concern the model has no
  // business touching, so always carry over the base profile's layout
  // instead of trusting whatever the model invented for it.
  result.sectionLayout = input.baseProfile.sectionLayout;

  assertResumeNotGutted(input.baseProfile, result);

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
    styleGuide: input.styleGuide,
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
  // ponytail: same reasoning as generateResume above — a freshly parsed
  // resume has no prior layout to inherit, so force the default rather than
  // whatever the model guessed for this UI-only field.
  result.sectionLayout = null;
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
