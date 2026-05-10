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

import { z } from "zod";

import { TokenUsagePurpose, TokenUsageProvider } from "@/actions/tokenUsage";
import { ProviderFactory } from "@/lib/llm/providers/factory";
import { trackTokenUsage, generateRequestId } from "@/lib/llm/tokenTracker";
import { createLogger } from "@/lib/logger";
import {
  LLMProvider,
  ProviderType,
  LLMResult,
  LLMUsageInfo,
} from "@/types/llm";
import { ResumeJSON, JobDetails, ResumeParsingSchema } from "@/types/resume";

import {
  PromptPurpose,
  PromptContext,
  PromptSystem,
  ResolvedPrompt,
} from "./prompts";

const logger = createLogger("LLMService");

export interface LLMServiceOptions {
  provider: ProviderType;
  model: string;
  temperature?: number;
}

const ResumeChatEditSchema = z.object({
  assistantReply: z.string().min(1),
  changeSummary: z.array(z.string()),
  rejectedRequests: z.array(z.string()),
  updatedResume: ResumeParsingSchema,
});

export type ResumeChatEditResult = z.infer<typeof ResumeChatEditSchema>;

class LLMService {
  private static mergeUsage(
    first?: LLMUsageInfo,
    second?: LLMUsageInfo
  ): LLMUsageInfo | undefined {
    if (!first && !second) return undefined;
    return {
      inputTokens: (first?.inputTokens ?? 0) + (second?.inputTokens ?? 0),
      outputTokens: (first?.outputTokens ?? 0) + (second?.outputTokens ?? 0),
    };
  }

  private static getJsonCandidates(rawText: string): string[] {
    const text = rawText.trim();
    const candidates: string[] = [];

    const addCandidate = (candidate?: string) => {
      const trimmed = candidate?.trim();
      if (!trimmed) return;
      if (!candidates.includes(trimmed)) {
        candidates.push(trimmed);
      }
    };

    addCandidate(text);

    // Handle fenced JSON/code blocks.
    const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    addCandidate(fencedMatch?.[1]);

    // Handle prose wrapped around a JSON object.
    const firstObjectIndex = text.indexOf("{");
    const lastObjectIndex = text.lastIndexOf("}");
    if (firstObjectIndex !== -1 && lastObjectIndex > firstObjectIndex) {
      addCandidate(text.slice(firstObjectIndex, lastObjectIndex + 1));
    }

    // Handle prose wrapped around a JSON array.
    const firstArrayIndex = text.indexOf("[");
    const lastArrayIndex = text.lastIndexOf("]");
    if (firstArrayIndex !== -1 && lastArrayIndex > firstArrayIndex) {
      addCandidate(text.slice(firstArrayIndex, lastArrayIndex + 1));
    }

    return candidates;
  }

  private static buildResumeChatRepairPrompt(rawText: string): string {
    return `The following response is intended to be JSON but is invalid or does not match the required shape.

Fix it and return ONLY valid JSON that matches this exact shape:
{
  "assistantReply": string,
  "changeSummary": string[],
  "rejectedRequests": string[],
  "updatedResume": {
    "header": object,
    "summary": string,
    "experience": array,
    "projects": array,
    "skills": array,
    "education": array,
    "certifications": array,
    "publications": array|null,
    "languages": array|null,
    "volunteer": array|null,
    "awards": array|null
  }
}

Rules:
- No markdown code fences.
- No explanation text.
- Preserve the intended meaning from the original response.
- If a required field is missing, use safe defaults (empty string, empty array, or null as appropriate).

Original response:
${rawText}`;
  }

  private static buildSafeChatEditFallback(
    rawResult: string,
    currentResume: ResumeJSON,
    request: string
  ): ResumeChatEditResult {
    const compactText = rawResult
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const assistantReply = compactText
      ? `I received a response, but it was not in a reliable structured format for this model. No resume changes were applied.\n\nRaw assistant output:\n${compactText.slice(0, 500)}`
      : "I could not get a reliable structured response from this model. No resume changes were applied.";

    const trimmedRequest = request.trim();

    return {
      assistantReply,
      changeSummary: [],
      rejectedRequests: [
        trimmedRequest
          ? `Could not safely apply request due to invalid model response: ${trimmedRequest}`
          : "Could not safely apply request due to invalid model response.",
      ],
      updatedResume: currentResume,
    };
  }

  private static parseStructuredJson<T>(
    rawText: string,
    schema: z.ZodType<T>
  ): T {
    const candidates = this.getJsonCandidates(rawText);
    const errors: string[] = [];

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate) as unknown;
        return schema.parse(parsed);
      } catch (error) {
        if (error instanceof z.ZodError) {
          errors.push(`Schema validation failed: ${error.issues[0]?.message}`);
        } else if (error instanceof Error) {
          errors.push(error.message);
        } else {
          errors.push("Unknown parsing error");
        }
      }
    }

    throw new Error(
      `LLM returned invalid JSON for chat edit request. ${errors[0] ?? "No parse candidates found."}`
    );
  }

  private static async parseOrRepairChatEditResult(
    provider: LLMProvider,
    rawResult: string,
    options: LLMServiceOptions,
    fallback: { currentResume: ResumeJSON; request: string }
  ): Promise<{ parsed: ResumeChatEditResult; usage?: LLMUsageInfo }> {
    try {
      return {
        parsed: this.parseStructuredJson(rawResult, ResumeChatEditSchema),
      };
    } catch (initialError) {
      logger.warn("Chat edit response was not valid JSON, attempting repair", {
        provider: options.provider,
        model: options.model,
        error:
          initialError instanceof Error
            ? initialError.message
            : "Unknown parse error",
      });

      let repairUsage: LLMUsageInfo | undefined;

      try {
        const repairResult = await provider.generateText(
          "You are a strict JSON repair assistant.",
          this.buildResumeChatRepairPrompt(rawResult),
          {
            model: options.model,
            temperature: 0,
          }
        );
        repairUsage = repairResult.usage;

        return {
          parsed: this.parseStructuredJson(
            repairResult.result,
            ResumeChatEditSchema
          ),
          usage: repairUsage,
        };
      } catch (repairError) {
        logger.warn(
          "Chat edit repair pass failed, returning safe fallback response",
          {
            provider: options.provider,
            model: options.model,
            error:
              repairError instanceof Error
                ? repairError.message
                : "Unknown repair error",
          }
        );

        return {
          parsed: this.buildSafeChatEditFallback(
            rawResult,
            fallback.currentResume,
            fallback.request
          ),
          usage: repairUsage,
        };
      }
    }
  }

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
      let usage: LLMUsageInfo | undefined;

      switch (purpose) {
        case "generate_cover_letter":
          ({ result, usage } = await provider.generateCoverLetter({
            ...context,
            model: options.model,
          }));
          break;
        case "generate_tailored_resume":
          ({ result, usage } = (await provider.generateResume({
            ...context,
            model: options.model,
          })) as { result: T; usage?: LLMUsageInfo });
          break;
        case "generate_summary":
        case "generate_experience":
        case "generate_skills":
        case "generate_projects":
        case "generate_education":
          ({ result, usage } = (await provider.generateText(
            prompt.systemPrompt,
            prompt.userPrompt,
            {
              model: options.model,
              temperature: options.temperature,
            }
          )) as { result: T; usage?: LLMUsageInfo });
          break;

        case "edit_resume_chat": {
          const textResult = await provider.generateText(
            prompt.systemPrompt,
            prompt.userPrompt,
            {
              model: options.model,
              temperature: options.temperature ?? 0.2,
            }
          );

          const { parsed, usage: repairUsage } =
            await this.parseOrRepairChatEditResult(
              provider,
              textResult.result,
              options,
              {
                currentResume: context.resume as ResumeJSON,
                request: context.additionalInstructions || "",
              }
            );

          result = parsed as T;
          usage = this.mergeUsage(textResult.usage, repairUsage);
          break;
        }

        case "parse_job":
          if (provider.parseJobDetails) {
            ({ result, usage } = (await provider.parseJobDetails(
              context.jobDescription || "",
              options.model
            )) as { result: T; usage?: LLMUsageInfo });
          } else {
            throw new Error(
              `Provider ${options.provider} does not support job parsing`
            );
          }
          break;

        case "parse_resume":
          if (provider.parseResume) {
            ({ result, usage } = (await provider.parseResume(
              context.jobDescription || "",
              options.model
            )) as { result: T; usage?: LLMUsageInfo });
          } else {
            throw new Error(
              `Provider ${options.provider} does not support resume parsing`
            );
          }
          break;

        case "analyze_ats":
          ({ result, usage } = (await provider.generateText(
            prompt.systemPrompt,
            prompt.userPrompt,
            {
              model: options.model,
              temperature: options.temperature,
            }
          )) as { result: T; usage?: LLMUsageInfo });
          break;

        default:
          throw new Error(`Unknown purpose: ${purpose}`);
      }

      const duration = Date.now() - startTime;

      // Track token usage
      await this.trackTokens({
        requestId,
        options,
        purpose,
        usage,
        input: prompt.userPrompt,
        result,
      });

      logger.debug("LLM call completed successfully", {
        requestId,
        purpose,
        duration,
      });

      return {
        result,
        requestId,
        prompt,
        tokensUsed: usage,
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
  ): Promise<LLMResult<string>> {
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
      }
    );
  }

  /**
   * Parse job description
   */
  static async parseJob(
    jobDescription: string,
    options: LLMServiceOptions
  ): Promise<LLMResult<JobDetails>> {
    return this.executeCall(
      "parse_job",
      {
        jobDescription,
      },
      options
    );
  }

  /**
   * Parse resume text
   */
  static async parseResume(
    resumeText: string,
    options: LLMServiceOptions
  ): Promise<LLMResult<ResumeJSON>> {
    return this.executeCall(
      "parse_resume",
      {
        resumeText: resumeText,
      },
      options
    );
  }

  static async generateCoverLetter(
    resume: ResumeJSON | null,
    jobData: JobDetails,
    options?: LLMServiceOptions
  ): Promise<LLMResult<string>> {
    return this.executeCall(
      "generate_cover_letter",
      { resume, jobData },
      options || {
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.7,
      }
    );
  }

  static async generateTailoredResume(
    baseProfile: ResumeJSON | null,
    jobData: JobDetails,
    options: LLMServiceOptions
  ): Promise<LLMResult<ResumeJSON>> {
    return this.executeCall(
      "generate_tailored_resume",
      {
        resume: baseProfile,
        jobData: jobData,
      },
      options
    );
  }

  static async editResumeFromChat(
    resume: ResumeJSON,
    jobData: JobDetails | null,
    jobDescription: string | undefined,
    request: string,
    options: LLMServiceOptions
  ): Promise<LLMResult<ResumeChatEditResult>> {
    return this.executeCall<ResumeChatEditResult>(
      "edit_resume_chat",
      {
        resume,
        jobData,
        jobDescription,
        additionalInstructions: request,
      },
      {
        ...options,
        temperature: options.temperature ?? 0.2,
      }
    );
  }

  /**
   * Analyze resume for ATS
   */
  static async analyzeATS(
    resumeText: string,
    jobDescription?: string,
    options?: LLMServiceOptions
  ): Promise<LLMResult<string>> {
    return this.executeCall(
      "analyze_ats",
      {
        jobDescription: resumeText,
      },
      options || {
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.3,
      }
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

  /**
   * Track token usage for analytics
   */
  private static async trackTokens({
    requestId,
    options,
    purpose,
    usage,
    input,
    result,
  }: {
    requestId: string;
    options: LLMServiceOptions;
    purpose: PromptPurpose;
    result: unknown;
    input: string;
    usage?: LLMUsageInfo;
  }): Promise<void> {
    try {
      // Map prompt purpose to token usage purpose
      const purposeMap: Record<PromptPurpose, TokenUsagePurpose> = {
        analyze_ats: "ATS_ANALYSIS",
        generate_cover_letter: "COVER_LETTER_GENERATION",
        generate_education: "RESUME_GENERATION",
        generate_experience: "RESUME_GENERATION",
        generate_projects: "RESUME_GENERATION",
        edit_resume_chat: "RESUME_GENERATION",
        generate_skills: "RESUME_GENERATION",
        generate_summary: "RESUME_GENERATION",
        generate_tailored_resume: "RESUME_GENERATION",
        parse_job: "JOB_PARSING",
        parse_resume: "RESUME_PARSING",
      };

      // Map provider name to token usage provider
      const providerMap: Record<ProviderType, TokenUsageProvider> = {
        [ProviderType.GEMINI]: "gemini",
        [ProviderType.GROK]: "grok",
        [ProviderType.OLLAMA]: "ollama",
        [ProviderType.OPENAI]: "openai",
        [ProviderType.PERPLEXITY]: "perplexity",
      };

      // Prefer actual usage from provider; fall back to estimate based on text length
      // Rough estimation: ~4 characters per token
      const estimatedInputTokens = Math.ceil(input.length / 4);
      const resultText =
        typeof result === "string" ? result : JSON.stringify(result);
      const estimatedOutputTokens = Math.ceil(resultText.length / 4);

      const inputTokens = usage?.inputTokens ?? estimatedInputTokens;
      const outputTokens = usage?.outputTokens ?? estimatedOutputTokens;

      const providerKey = options.provider as ProviderType;

      await trackTokenUsage({
        provider: providerMap[providerKey],
        model: options.model,
        inputTokens,
        outputTokens,
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
