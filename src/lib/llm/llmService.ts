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

import { LLMUsageInfo } from "@/actions/tokenUsage";
import { ProviderFactory } from "@/lib/llm/providers/factory";
import { generateRequestId, trackTokenUsage } from "@/lib/llm/tokenTracker";
import { createLogger } from "@/lib/logger";
import { ProviderType, LLMResult } from "@/types/llm";
import { ResumeJSON, JobDetailsJSON } from "@/types/resume";

import {
  PromptPurpose,
  PromptContext,
  PromptSystem,
  ResolvedPrompt,
} from "./prompts";
import { LLMProvider } from "./providers/LLMProvider";

const logger = createLogger("LLMService");

export interface LLMServiceOptions {
  provider: ProviderType;
  model: string;
  temperature?: number;
}

class LLMService {
  private static async getProvider(
    provider: ProviderType
  ): Promise<LLMProvider | null> {
    return ProviderFactory.getInstance(provider);
  }

  /**
   * Execute a standardized LLM call with prompt generation and token tracking
   */
  static async executeCall<T = string>(
    purpose: PromptPurpose,
    context: PromptContext,
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
            options
          ));
          break;
        }

        case "generate_cover_letter": {
          ({ result, usage } = await provider.generateCoverLetter(
            {
              resume: context.resume!,
              jobDetails: context.jobDetails!,
            },
            options
          ));
          saveUsageAndLog(usage);
          return { result: result as T, usage };
        }

        case "generate_tailored_resume": {
          ({ result, usage } = await provider.generateResume(
            {
              baseProfile: context.baseProfile!,
              jobDetails: context.jobDetails!,
            },
            options
          ));
          break;
        }

        case "parse_job": {
          ({ result, usage } = await provider.parseJobDetails(
            context.jobDescription!,
            options
          ));
          break;
        }

        case "parse_resume": {
          ({ result, usage } = await provider.parseResume(
            context.resumeText!,
            options
          ));
          break;
        }
        case "humanize_content": {
          ({ result, usage } = await provider.humanizeContent(
            context.userInput!,
            options
          ));
          break;
        }
        case "analyze_ats": {
          ({ result, usage } = await provider.analyzeATS(
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
    jobData: JobDetailsJSON,
    options: LLMServiceOptions
  ): Promise<LLMResult<string>> {
    return this.executeCall(
      "generate_cover_letter",
      { resume, jobDetails: jobData },
      options
    );
  }

  static async generateTailoredResume(
    baseProfile: ResumeJSON,
    jobData: JobDetailsJSON,
    options: LLMServiceOptions
  ): Promise<LLMResult<ResumeJSON>> {
    return this.executeCall(
      "generate_tailored_resume",
      {
        resume: baseProfile,
        jobDetails: jobData,
      },
      options
    );
  }

  static async analyzeATS(
    resumeText: string,
    jobDescription: string,
    options: LLMServiceOptions
  ): Promise<LLMResult<string>> {
    return this.executeCall(
      "analyze_ats",
      { resumeText, jobDescription },
      options
    );
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
}

export default LLMService;
