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

import { TokenUsagePurpose, TokenUsageProvider } from "@/actions/tokenUsage";
import { ProviderFactory } from "@/lib/llm/providers/factory";
import { createLogger } from "@/lib/logger";
import PromptSystem, {
  PromptPurpose,
  PromptContext,
  Prompt,
} from "@/lib/promptSystem";
import { trackTokenUsage, generateRequestId } from "@/lib/tokenTracker";
import { Providers, LLMProvider } from "@/types/llm";
import { ResumeJSON, JobDetails } from "@/types/resume";

const logger = createLogger("LLMService");

export interface LLMServiceOptions {
  provider: Providers;
  model: string;
  temperature?: number;
  purpose: PromptPurpose;
}

export interface LLMCallResult<T = string> {
  result: T;
  requestId: string;
  prompt: Prompt;
  tokensUsed?: {
    input: number;
    output: number;
  };
}

class LLMService {
  private static async getProvider(
    provider: Providers
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
  ): Promise<LLMCallResult<T>> {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
      logger.debug("Executing LLM call", {
        requestId,
        purpose,
        provider: options.provider,
        model: options.model,
      });

      // Generate unified prompt
      const prompt = PromptSystem.generatePrompt(purpose, context);

      // Get provider instance
      const provider = await this.getProvider(options.provider);
      if (!provider) {
        throw new Error(`Provider ${options.provider} not available`);
      }

      // Execute call based on purpose
      let result: T;

      switch (purpose) {
        case "generate_summary":
        case "generate_experience":
        case "generate_skills":
        case "generate_projects":
        case "generate_education":
          result = (await provider.generateText(
            prompt.systemPrompt,
            prompt.userPrompt,
            {
              model: options.model,
              temperature: options.temperature,
            }
          )) as T;
          break;

        case "parse_job":
          if (provider.parseJobDetails) {
            result = (await provider.parseJobDetails(
              context.jobDescription || "",
              options.model
            )) as T;
          } else {
            throw new Error(
              `Provider ${options.provider} does not support job parsing`
            );
          }
          break;

        case "parse_resume":
          if (provider.parseResume) {
            result = (await provider.parseResume(
              context.jobDescription || "",
              options.model
            )) as T;
          } else {
            throw new Error(
              `Provider ${options.provider} does not support resume parsing`
            );
          }
          break;

        case "analyze_ats":
          result = (await provider.generateText(
            prompt.systemPrompt,
            prompt.userPrompt,
            {
              model: options.model,
              temperature: options.temperature,
            }
          )) as T;
          break;

        default:
          throw new Error(`Unknown purpose: ${purpose}`);
      }

      const duration = Date.now() - startTime;

      // Track token usage
      await this.trackTokens(requestId, options, purpose, duration);

      logger.debug("LLM call completed successfully", {
        requestId,
        purpose,
        duration,
      });

      return {
        result,
        requestId,
        prompt,
      };
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
    jobData: JobDetails | null,
    jobDescription?: string,
    options?: LLMServiceOptions
  ): Promise<LLMCallResult<string>> {
    const purposeMap: Record<string, PromptPurpose> = {
      summary: "generate_summary",
      professional_summary: "generate_summary",
      experience: "generate_experience",
      skills: "generate_skills",
      projects: "generate_projects",
      project_description: "generate_projects",
      education: "generate_education",
    };

    const purpose = (purposeMap[field.toLowerCase()] ||
      "generate_summary") as PromptPurpose;

    return this.executeCall(
      purpose,
      {
        resume,
        jobData,
        jobDescription,
        field,
      },
      options || {
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.7,
        purpose,
      }
    );
  }

  /**
   * Parse job description
   */
  static async parseJob(
    jobDescription: string,
    options: LLMServiceOptions
  ): Promise<LLMCallResult<JobDetails>> {
    return this.executeCall(
      "parse_job",
      {
        jobDescription,
      },
      options
    );
  }

  /**
   * Analyze resume for ATS
   */
  static async analyzeATS(
    resumeText: string,
    jobDescription?: string,
    options?: LLMServiceOptions
  ): Promise<LLMCallResult<string>> {
    return this.executeCall(
      "analyze_ats",
      {
        jobDescription: resumeText,
        additionalInstructions: jobDescription,
      },
      options || {
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.3,
        purpose: "analyze_ats",
      }
    );
  }

  /**
   * Get the final prompt that will be sent to LLM
   */
  static getPromptPreview(
    purpose: PromptPurpose,
    context: PromptContext
  ): Prompt {
    return PromptSystem.generatePrompt(purpose, context);
  }

  /**
   * Track token usage for analytics
   */
  private static async trackTokens(
    requestId: string,
    options: LLMServiceOptions,
    purpose: PromptPurpose,
    duration: number
  ): Promise<void> {
    try {
      // Map prompt purpose to token usage purpose
      const purposeMap: Record<PromptPurpose, TokenUsagePurpose> = {
        generate_summary: "RESUME_GENERATION",
        generate_experience: "RESUME_GENERATION",
        generate_skills: "RESUME_GENERATION",
        generate_projects: "RESUME_GENERATION",
        generate_education: "RESUME_GENERATION",
        parse_job: "JOB_PARSING",
        parse_resume: "RESUME_PARSING",
        analyze_ats: "ATS_ANALYSIS",
      };

      // Map provider name to token usage provider
      const providerMap: Record<Providers, TokenUsageProvider> = {
        openai: "openai",
        gemini: "gemini",
        grok: "grok",
        perplexity: "perplexity",
        ollama: "ollama",
      };

      // Estimate tokens (rough approximation)
      // Actual token count would be returned from provider if available
      const estimatedInputTokens = Math.ceil(duration / 10); // Very rough estimate
      const estimatedOutputTokens = Math.ceil(duration / 15);

      await trackTokenUsage({
        provider: providerMap[options.provider],
        model: options.model,
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        purpose: purposeMap[purpose],
        requestId,
      });

      logger.debug("Token usage tracked", {
        requestId,
        provider: options.provider,
        model: options.model,
      });
    } catch (error) {
      // Log but don't throw - token tracking is optional
      logger.warn("Failed to track token usage", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

export default LLMService;
