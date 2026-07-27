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

import { LLMProvider } from "@pranavraut033/llm-core";

import { LLMUsageInfo } from "@/actions/tokenUsage";
import {
  CoverLetterStyleId,
  resolveCoverLetterStyleGuide,
} from "@/lib/llm/prompts/coverLetterStyles";
import { ProviderFactory } from "@/lib/llm/providers/factory";
import { generateRequestId, trackTokenUsage } from "@/lib/llm/tokenTracker";
import { createLogger } from "@/lib/logger";
import { HumanizerJSON } from "@/types/humanizer";
import {
  ProviderType,
  LLMResult,
  JobParsingResult,
  ResumeParsingResult,
  CoverLetterGenerationResult,
  ATSAnalysisResult,
} from "@/types/llm";
import { ResumeJSON, JobDetailsJSON, ATSAnalysisJSON } from "@/types/resume";

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
}

// map each purpose to the keys from PromptContext that must be present
type RequiredKeysByPurpose = {
  generate_text: never;
  generate_summary: "resume";
  generate_experience: "resume" | "jobDetails";
  generate_skills: "resume" | "jobDetails";
  generate_projects: "resume" | "jobDetails";
  generate_education: "resume" | "jobDetails";
  generate_tailored_resume: "baseProfile" | "jobDetails" | "atsAnalysis";
  generate_cover_letter: "resume" | "jobDetails";
  parse_job: "jobDescription";
  parse_resume: "resumeText";
  analyze_ats: "resume" | "jobDetails";
  humanize_content: "userInput";
  extract_fields_to_edit: never;
  fix_ats_issues: "resume" | "jobDetails" | "userInput";
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
    options: LLMServiceOptions
  ): Promise<LLMResult<T>> {
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
        case "generate_text":
        case "generate_summary":
        case "generate_experience":
        case "generate_skills":
        case "generate_projects":
        case "generate_education": {
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
        case "analyze_ats": {
          ({ result, usage } = await domainOps.analyzeATS(
            provider,
            {
              resume: context.resume!,
              jobDetails: context.jobDetails!,
            },
            options
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
   * Generate resume field text with context awareness
   */
  static async generateFieldText(
    field: string,
    resume: ResumeJSON | null,
    jobData: JobDetailsJSON | null,
    jobDescription: string,
    options: LLMServiceOptions
  ): Promise<LLMResult<string>> {
    const normalizedField = field.toLowerCase();
    const fieldPurposeMap: Record<string, PromptPurpose> = {
      summary: "generate_summary",
      professional_summary: "generate_summary",
      experience: "generate_experience",
      job_description: "generate_experience",
      experience_description: "generate_experience",
      achievements: "generate_experience",
      skills: "generate_skills",
      projects: "generate_projects",
      project_description: "generate_projects",
      education: "generate_education",
      education_description: "generate_education",
    };

    const purpose = fieldPurposeMap[normalizedField] || "generate_summary";

    return this.executeCall(
      purpose,
      // @ts-expect-error - context typing is complex, we ensure required fields are present in the method signature
      {
        resume,
        jobDetails: jobData,
        jobDescription,
        field,
      },
      options
    );
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
    atsAnalysis: ATSAnalysisJSON | null,
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
    atsAnalysis: ATSAnalysisJSON | null,
    options: LLMServiceOptions
  ): Promise<VerifiedResumeResult> {
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

  static async analyzeATS(
    resume: ResumeJSON,
    jobDetails: JobDetailsJSON,
    options: LLMServiceOptions
  ): Promise<LLMResult<ATSAnalysisJSON>> {
    return this.executeCall("analyze_ats", { resume, jobDetails }, options);
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
    atsAnalysis: ATSAnalysisResult;
  }> {
    const jobDetails = await this.parseJob(jobDescription, {
      model,
      provider,
    });

    const atsAnalysis = await this.analyzeATS(profile, jobDetails.result, {
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
