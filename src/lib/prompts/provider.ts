/**
 * Template-Aware LLM Provider
 * Wraps LLM providers with template schema validation and structured output support
 */

import { zodResponseFormat } from "openai/helpers/zod";

import { createLogger } from "@/lib/logger";
import { resolveTemplate } from "@/lib/prompts/resolver";
import { PromptTemplate } from "@/lib/prompts/types";
import { validateTemplateResponse, getValidationSummary } from "@/lib/prompts/validation";
import { LLMProvider, ResumePromptInput, CoverLetterPromptInput } from "@/types/llm";
import { ResumeJSON } from "@/types/resume";

/**
 * Extended provider interface with template awareness
 */
export interface TemplateAwareLLMProvider extends LLMProvider {
  /**
   * Generate content using template with schema validation
   */
  generateWithTemplate<T = unknown>(
    template: PromptTemplate,
    context: Record<string, unknown>,
    options?: {
      model?: string;
      temperature?: number;
      validateResponse?: boolean;
    }
  ): Promise<T>;
}

/**
 * Wrapper factory for template-aware providers
 * Adds schema validation and structured output support to any LLM provider
 */
export class TemplateAwareProviderWrapper implements TemplateAwareLLMProvider {
  constructor(private baseProvider: LLMProvider) { }

  // Delegate to base provider
  async generateResume(input: ResumePromptInput): Promise<ResumeJSON> {
    return this.baseProvider.generateResume(input);
  }

  async generateCoverLetter(input: CoverLetterPromptInput): Promise<string> {
    return this.baseProvider.generateCoverLetter(input);
  }

  async parseJobDetails(description: string, model?: string): Promise<unknown> {
    return this.baseProvider.parseJobDetails(description, model);
  }

  async parseResume(resumeText: string, model?: string): Promise<unknown> {
    return this.baseProvider.parseResume(resumeText, model);
  }

  async listAvailableModels(): Promise<string[]> {
    return this.baseProvider.listAvailableModels();
  }

  /**
   * Generate content using template with built-in validation
   */
  async generateWithTemplate<T = unknown>(
    template: PromptTemplate,
    context: Record<string, unknown>,
    options?: {
      model?: string;
      temperature?: number;
      validateResponse?: boolean;
    }
  ): Promise<T> {
    const logger = createLogger("TemplateAwareProvider");
    const _opts = {
      model: "gpt-4o",
      validateResponse: true,
      ...options,
    };

    // Resolve template with context
    const resolved = resolveTemplate(template, context);

    // For now, return resolved for manual provider handling
    // In the future, this would call provider.generateWithResolvedPrompt()
    logger.warn(`[Template] Resolved prompt for template "${template.id}"`);
    logger.warn(`[Template] System: ${resolved.systemPrompt.substring(0, 100)}...`);
    logger.warn(`[Template] User: ${resolved.userPrompt.substring(0, 100)}...`);

    if (resolved.outputSchema) {
      const schemaType = (resolved.outputSchema as unknown as Record<string, unknown>)._def
        ?.typeName as string | undefined;
      logger.warn(`[Template] Schema available: ${schemaType}`);
    }

    // This would be implemented by the actual LLM provider
    throw new Error(
      "generateWithTemplate must be implemented by the LLM provider with actual API calls"
    );
  }
}

/**
 * Helper to create structured output configuration for OpenAI
 * Usage: const config = createStructuredOutputConfig(resolvedPrompt);
 */
export function createStructuredOutputConfig(
  resolvedPrompt: Record<string, unknown>
): {
  response_format: ReturnType<typeof zodResponseFormat>;
} | undefined {
  if (!resolvedPrompt.outputSchema) {
    return undefined;
  }

  // This is OpenAI-specific - other providers may differ
  return {
    response_format: zodResponseFormat(
      resolvedPrompt.outputSchema as Parameters<typeof zodResponseFormat>[0],
      (resolvedPrompt.purpose as string) || "output"
    ),
  };
}

/**
 * Helper to validate response after LLM call
 * Usage: await validateLLMResponse(response, resolvedPrompt);
 */
export async function validateLLMResponse<T = unknown>(
  response: unknown,
  resolvedPrompt: Record<string, unknown>
): Promise<T> {
  const logger = createLogger("ValidateLLMResponse");
  const result = await validateTemplateResponse<T>(
    response,
    resolvedPrompt as Parameters<typeof validateTemplateResponse>[1]
  );

  if (!result.valid) {
    logger.error(getValidationSummary(result));
    throw new Error(`LLM response validation failed for template`);
  }

  return result.data as T;
}
