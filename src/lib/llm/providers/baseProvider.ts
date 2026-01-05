/**
 * Base LLM Provider with shared prompt generation utilities.
 * This eliminates prompt duplication across different LLM providers.
 *
 * Providers should register themselves using the static register() method
 * to allow dynamic provider discovery and instantiation.
 */

import { templateRegistry } from "@/lib/prompts/registry";
import { resolveTemplate } from "@/lib/prompts/resolver";
import {
  ResumePromptInput,
  CoverLetterPromptInput,
  LLMGenerationOptions,
  ProviderType,
  LLMProvider,
} from "@/types/llm";
import { ResumeJSON } from "@/types/resume";

import { ProviderRegistry, ProviderMetadata } from "./registry";

export abstract class BaseLLMProvider {
  /**
   * Get temperature settings based on model compatibility.
   * Some models (like OpenAI o1) don't support custom temperature.
   */
  protected getTemperatureConfig(
    model?: string,
    temperature?: number
  ): { temperature?: number } {
    // OpenAI o1/o3 models don't support custom temperature
    if (model && (model.includes("o1") || model.includes("o3"))) {
      return {}; // Omit temperature parameter
    }

    // Use provided temperature or default
    return { temperature: temperature };
  }

  /**
   * Generate text from system and user prompts
   * Default implementation uses runPrompt - override for custom behavior
   */
  async generateText(
    systemPrompt: string,
    userPrompt: string,
    options?: LLMGenerationOptions
  ): Promise<string> {
    // Default implementation using runPrompt - providers can override
    const response = await this.runPrompt(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      options?.model,
      options?.maxTokens
    );
    return response.content;
  }

  /**
   * Parse job details from description
   * Must be implemented by subclasses or use parseJobDescription if available
   */
  async parseJobDetails(_description: string, _model?: string): Promise<Record<string, unknown>> {
    throw new Error("parseJobDetails not implemented for this provider");
  }

  /**
   * Parse resume text
   * Optional method - not all providers support this
   */
  async parseResume?(resumeText: string, model?: string): Promise<ResumeJSON>;

  /**
   * Run a prompt and get response
   * Must be implemented by subclasses
   */
  abstract runPrompt(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    model?: string,
    maxTokens?: number
  ): Promise<{
    content: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  }>;
  /**
   * Generate a resume tailoring prompt using template system
   */
  protected generateResumePrompt(input: ResumePromptInput): string {
    const template = templateRegistry.get("tailor_resume");
    if (!template) {
      throw new Error("Resume tailoring template not found");
    }

    const resolved = resolveTemplate(template, {
      baseProfile: input.baseProfile,
      jobDescription: input.jobDescription,
      jobRole: input.jobRole,
      company: input.company,
    });

    // Return combined prompt (providers typically expect single prompt string)
    return `${resolved.systemPrompt}\n\n${resolved.userPrompt}`;
  }

  /**
   * Generate a cover letter writing prompt using template system
   */
  protected generateCoverLetterPrompt(input: CoverLetterPromptInput): string {
    const template = templateRegistry.get("generate_cover_letter");
    if (!template) {
      throw new Error("Cover letter template not found");
    }

    const resolved = resolveTemplate(template, {
      baseProfile: input.baseProfile,
      jobDescription: input.jobDescription,
      jobRole: input.jobRole,
      company: input.company,
      resume: input.resume,
    });

    // Return combined prompt (providers typically expect single prompt string)
    return `${resolved.systemPrompt}\n\n${resolved.userPrompt}`;
  }

  /**
   * Generate a job details extraction prompt (for structured parsing)
   * Returns only system prompt - user prompt is the job description itself
   */
  protected generateJobParsingSystemPrompt(): string {
    const template = templateRegistry.get("parse_job");
    if (!template) {
      throw new Error("Job parsing template not found");
    }

    // For parsing operations, we only need the system prompt
    // The actual job description is passed as user message by the provider
    return template.systemPrompt;
  }

  /**
   * Generate a resume parsing prompt (for structured output)
   * Returns only system prompt - user prompt is the resume text itself
   */
  protected generateResumeParsingSystemPrompt(): string {
    const template = templateRegistry.get("parse_resume");
    if (!template) {
      throw new Error("Resume parsing template not found");
    }

    // For parsing operations, we only need the system prompt
    // The actual resume text is passed as user message by the provider
    return template.systemPrompt;
  }

  /**
   * Register this provider with the registry
   * Should be called at module load time from provider implementations
   *
   * @param type - Provider type enum
   * @param metadata - Provider metadata (name, auth requirement, etc.)
   * @param constructor - Constructor function that returns provider instance
   */
  static register(
    type: ProviderType,
    metadata: Omit<ProviderMetadata, "type">,
    constructor: (apiKey?: string) => LLMProvider
  ): void {
    ProviderRegistry.getInstance().register(type, metadata, constructor);
  }
}
