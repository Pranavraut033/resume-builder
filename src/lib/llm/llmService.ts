/**
 * Unified LLM Service Layer
 * Provides standardized, context-aware LLM operations with built-in token tracking
 *
 * All LLM calls flow through this layer to ensure:
 * - Consistent prompt generation
 * - Token usage tracking
 * - Error handling and logging
 * - Provider/model management
 * - Request ID tracking for analytics
 */

import { LLMProvider, ReasoningEffort } from "@pranavraut033/llm-core";

import { LLMUsageInfo } from "@/actions/tokenUsage";
import {
  CoverLetterStyleId,
  resolveCoverLetterStyleGuide,
} from "@/lib/llm/prompts/coverLetterStyles";
import { ProviderFactory } from "@/lib/llm/providers/factory";
import { generateRequestId, trackTokenUsage } from "@/lib/llm/tokenTracker";
import { createLogger } from "@/lib/logger";
import { useModelStore } from "@/store/modelStore";
import { DocumentAnalysisJSON } from "@/types/documentAnalysis";
import { FitCheckJSON } from "@/types/fitCheck";
import { HumanizerJSON } from "@/types/humanizer";
import {
  ProviderType,
  LLMResult,
  JobParsingResult,
  ResumeParsingResult,
  CoverLetterGenerationResult,
  DocumentAnalysisResult,
} from "@/types/llm";
import { ResumeJSON, JobDetailsJSON } from "@/types/resume";

import * as domainOps from "./domainOps";
import {
  PromptPurpose,
  PromptContext,
  PromptSystem,
  ResolvedPrompt,
} from "./prompts";
import { generateVerifiedResume, VerifiedResumeResult } from "./verifiedResume";

const logger = createLogger("LLMService");

export interface LLMServiceOptions {
  provider: ProviderType;
  model: string;
  temperature?: number;
  topP?: number;
  reasoningEffort?: ReasoningEffort;
}

/**
 * Fills in `reasoningEffort` from the user's model-selector preference
 * (src/store/modelStore.ts) when a call site didn't set one explicitly.
 * Providers already no-op reasoningEffort on non-reasoning models, so no
 * capability check is needed here.
 */
function withReasoningEffort(options: LLMServiceOptions): LLMServiceOptions {
  if (options.reasoningEffort !== undefined) return options;
  const reasoningEffort = useModelStore
    .getState()
    .getReasoningEffort(options.provider, options.model);
  return reasoningEffort ? { ...options, reasoningEffort } : options;
}

/**
 * Fills in `temperature` from the user's model-selector preference the same
 * way `withReasoningEffort` does. Providers already no-op temperature on
 * models that reject it (`LLMProvider.resolveTemperature`), so no capability
 * check is needed here either.
 */
function withTemperature(options: LLMServiceOptions): LLMServiceOptions {
  if (options.temperature !== undefined) return options;
  const temperature = useModelStore
    .getState()
    .getTemperature(options.provider, options.model);
  return temperature !== null ? { ...options, temperature } : options;
}

/**
 * Fills in `topP` from the user's model-selector preference the same way
 * `withTemperature` does. Providers already no-op topP on models that reject
 * it (`OpenAICompatibleProvider.toOpenAISamplingParams`), so no capability
 * check is needed here either.
 */
function withTopP(options: LLMServiceOptions): LLMServiceOptions {
  if (options.topP !== undefined) return options;
  const topP = useModelStore
    .getState()
    .getTopP(options.provider, options.model);
  return topP !== null ? { ...options, topP } : options;
}

/**
 * Resolves the user's per-model lite/full preference (src/store/modelStore.ts)
 * the same way `withReasoningEffort` resolves reasoning effort — except this
 * isn't an `LLMGenerationOptions` field, it's a `PromptContext` flag only
 * `analyze_document` reads (see `templates/deep-analysis.ts`'s `{{#if
 * fullMode}}` block), so it's applied directly at that one call site instead
 * of folded into the generic `options` pipeline above. Default "full" —
 * today's behavior, so no existing user silently degrades.
 */
function resolvePromptDepth(options: LLMServiceOptions): "lite" | "full" {
  return useModelStore
    .getState()
    .getPromptDepth(options.provider, options.model);
}

// map each purpose to the keys from PromptContext that must be present
type RequiredKeysByPurpose = {
  generate_text: never;
  generate_tailored_resume: "baseProfile" | "jobDetails" | "atsAnalysis";
  generate_cover_letter: "resume" | "jobDetails";
  parse_job: "jobDescription";
  parse_resume: "resumeText";
  analyze_fit: "resume" | "jobDetails";
  // jobDetails is required here (not optional, unlike the old proofread
  // purpose) — the deep-analysis template's `keyword`/`title` finding kinds
  // are both judged against the target job, see
  // DocumentAnalysisPromptInput's doc comment.
  analyze_document: "resumeFull" | "jobDetails";
  humanize_content: "userInput";
  extract_fields_to_edit: never;
};

// Helper type to enforce required context fields based on purpose, error here means RequiredKeysByPurpose is not properly defined to match PromptContext keys - this is a compile-time check to ensure our RequiredKeysByPurpose mapping is correct
type RequiredFor<P extends PromptPurpose> =
  RequiredKeysByPurpose[P] extends never
    ? PromptContext
    : PromptContext &
        Required<
          Pick<
            PromptContext,
            Extract<RequiredKeysByPurpose[P], keyof PromptContext>
          >
        >;

class LLMService {
  private static async getProvider(
    provider: ProviderType
  ): Promise<LLMProvider | null> {
    return ProviderFactory.getInstance(provider);
  }

  /**
   * Execute a standardized LLM call with prompt generation and token tracking
   */
  static async executeCall<P extends PromptPurpose, T = string>(
    purpose: P,
    context: RequiredFor<P>,
    rawOptions: LLMServiceOptions
  ): Promise<LLMResult<T>> {
    const options = withTopP(withTemperature(withReasoningEffort(rawOptions)));
    const requestId = generateRequestId(purpose);
    const startTime = Date.now();

    const saveUsageAndLog = (usage: LLMUsageInfo) => {
      const duration = Date.now() - startTime;

      // Track token usage
      trackTokenUsage({ requestId, durationMs: duration, ...usage });

      logger.debug("LLM call completed successfully", {
        requestId,
        purpose,
        duration,
      });
    };

    logger.debug("Executing LLM call", {
      requestId,
      purpose,
      provider: options.provider,
      model: options.model,
    });

    // Generate unified prompt

    // Get provider instance
    const provider = await this.getProvider(options.provider);
    if (!provider) {
      throw new Error(`Provider ${options.provider} not available`);
    }

    let result: unknown; // Placeholder, will be set in if blocks below
    let usage: LLMUsageInfo = {} as LLMUsageInfo; // Placeholder

    try {
      switch (purpose) {
        case "generate_text": {
          const prompt = PromptSystem.generatePrompt(purpose, context);
          ({ result, usage } = await provider.generateText(
            prompt.systemPrompt,
            prompt.userPrompt,
            { ...options, stream: false }
          ));
          break;
        }

        case "generate_cover_letter": {
          ({ result, usage } = await domainOps.generateCoverLetter(
            provider,
            {
              resume: context.resume!,
              jobDetails: context.jobDetails!,
              customInstructions: context.additionalInstructions,
              styleGuide: context.styleGuide,
            },
            options
          ));
          saveUsageAndLog(usage);
          return { result: result as T, usage };
        }

        case "generate_tailored_resume": {
          ({ result, usage } = await domainOps.generateResume(
            provider,
            {
              baseProfile: context.baseProfile!,
              jobDetails: context.jobDetails!,
              atsAnalysis: context.atsAnalysis ?? null,
            },
            options
          ));
          break;
        }

        case "parse_job": {
          ({ result, usage } = await domainOps.parseJobDetails(
            provider,
            context.jobDescription!,
            options
          ));
          break;
        }

        case "parse_resume": {
          ({ result, usage } = await domainOps.parseResume(
            provider,
            context.resumeText!,
            options
          ));
          break;
        }
        case "humanize_content": {
          ({ result, usage } = await domainOps.humanizeContent(
            provider,
            context.userInput!,
            options
          ));
          break;
        }
        case "analyze_fit": {
          ({ result, usage } = await domainOps.analyzeFit(
            provider,
            {
              resume: context.resume!,
              jobDetails: context.jobDetails!,
            },
            options
          ));
          break;
        }
        case "analyze_document": {
          ({ result, usage } = await domainOps.analyzeDocument(
            provider,
            {
              resumeFull: context.resumeFull!,
              jobDetails: context.jobDetails!,
              baseProfile: context.baseProfile ?? null,
            },
            { ...options, fullMode: resolvePromptDepth(options) === "full" }
          ));
          break;
        }
      }

      saveUsageAndLog(usage);

      return { result: result as T, usage };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error("LLM call failed", {
        requestId,
        purpose,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Parse job description
   */
  static async parseJob(
    jobDescription: string,
    options: LLMServiceOptions
  ): Promise<LLMResult<JobDetailsJSON>> {
    return this.executeCall("parse_job", { jobDescription }, options);
  }

  /**
   * Parse resume text
   */
  static async parseResume(
    resumeText: string,
    options: LLMServiceOptions
  ): Promise<LLMResult<ResumeJSON>> {
    return this.executeCall("parse_resume", { resumeText }, options);
  }

  static async generateCoverLetter(
    resume: ResumeJSON | null,
    jobDetails: JobDetailsJSON,
    options: LLMServiceOptions,
    customInstructions?: string,
    styleId?: CoverLetterStyleId
  ): Promise<LLMResult<string>> {
    return this.executeCall(
      "generate_cover_letter",
      {
        resume,
        jobDetails,
        additionalInstructions: customInstructions,
        styleGuide: resolveCoverLetterStyleGuide(styleId),
      },
      options
    );
  }

  static async generateTailoredResume(
    baseProfile: ResumeJSON,
    jobDetails: JobDetailsJSON,
    atsAnalysis: DocumentAnalysisJSON | null,
    options: LLMServiceOptions
  ): Promise<LLMResult<ResumeJSON>> {
    return this.executeCall(
      "generate_tailored_resume",
      { baseProfile, jobDetails, atsAnalysis },
      options
    );
  }

  /**
   * Tailor the resume, then fact-check it against the base profile and
   * correct any unsupported claims before returning. Slower (up to 3 LLM
   * calls vs. 1) but catches fabrication that plain tailoring doesn't guard
   * against — see src/lib/llm/verifiedResume.ts.
   */
  static async generateVerifiedTailoredResume(
    baseProfile: ResumeJSON,
    jobDetails: JobDetailsJSON,
    atsAnalysis: DocumentAnalysisJSON | null,
    rawOptions: LLMServiceOptions
  ): Promise<VerifiedResumeResult> {
    const options = withTopP(withTemperature(withReasoningEffort(rawOptions)));
    const requestId = generateRequestId("generate_tailored_resume");
    const startTime = Date.now();

    const provider = await this.getProvider(options.provider);
    if (!provider) {
      throw new Error(`Provider ${options.provider} not available`);
    }

    const verified = await generateVerifiedResume(
      provider,
      { baseProfile, jobDetails, atsAnalysis },
      options
    );

    trackTokenUsage({
      requestId,
      durationMs: Date.now() - startTime,
      ...verified.usage,
    });

    return verified;
  }

  static async humanizeContent(
    text: string,
    options: LLMServiceOptions
  ): Promise<LLMResult<HumanizerJSON>> {
    return this.executeCall("humanize_content", { userInput: text }, options);
  }

  /**
   * "What do I change in the document?" — merges the old ATS-analysis and
   * proofread purposes (see domainOps.analyzeDocument). `jobDetails` is
   * required (not optional like the old proofreadResume's) — see
   * DocumentAnalysisPromptInput's doc comment.
   */
  static async analyzeDocument(
    resume: ResumeJSON,
    jobDetails: JobDetailsJSON,
    options: LLMServiceOptions,
    baseProfile?: ResumeJSON | null
  ): Promise<DocumentAnalysisResult> {
    return this.executeCall(
      "analyze_document",
      { resumeFull: resume, jobDetails, baseProfile: baseProfile ?? null },
      options
    );
  }

  /**
   * "Should I apply, and what's blocking me?" — see domainOps.analyzeFit.
   */
  static async analyzeFit(
    resume: ResumeJSON,
    jobDetails: JobDetailsJSON,
    options: LLMServiceOptions
  ): Promise<LLMResult<FitCheckJSON>> {
    return this.executeCall("analyze_fit", { resume, jobDetails }, options);
  }

  /**
   * Get the final prompt that will be sent to LLM
   */
  static getPromptPreview(
    purpose: PromptPurpose,
    context: PromptContext
  ): ResolvedPrompt {
    return PromptSystem.generatePrompt(purpose, context);
  }

  static async generateApplicationMaterials({
    profile,
    jobDescription,
    model,
    provider,
  }: {
    profile: ResumeJSON;
    jobDescription: string;
    model: string;
    provider: ProviderType;
  }): Promise<{
    jobDetails: JobParsingResult;
    resume: ResumeParsingResult;
    coverLetter: CoverLetterGenerationResult;
    // Field name kept as `atsAnalysis` (not renamed to `documentAnalysis`)
    // since it feeds `generateTailoredResume`'s `atsAnalysis` param below —
    // same "historically ATS, now Deep Analysis" naming call as
    // PromptContext.atsAnalysis (see src/lib/llm/prompts/types.ts).
    atsAnalysis: DocumentAnalysisResult;
  }> {
    const jobDetails = await this.parseJob(jobDescription, {
      model,
      provider,
    });

    // Deep Analysis, not Fit Check — this feeds resume-tailoring.ts as
    // "hints for wording and ordering", which is what analyze_document
    // findings (keywords/title/impact) are; a fit judgment (analyze_fit)
    // isn't guidance the tailoring prompt knows how to use.
    const atsAnalysis = await this.analyzeDocument(profile, jobDetails.result, {
      model,
      provider,
    });

    const [resume, coverLetter] = await Promise.all([
      this.generateTailoredResume(
        profile,
        jobDetails.result,
        atsAnalysis.result,
        {
          model,
          provider,
        }
      ),
      this.generateCoverLetter(profile, jobDetails.result, {
        model,
        provider,
      }),
    ]);

    return { jobDetails, resume, coverLetter, atsAnalysis };
  }
}

export default LLMService;
