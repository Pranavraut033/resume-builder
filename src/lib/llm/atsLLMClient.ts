/**
 * ATS LLM Client Adapter
 * Implements ats-checker's LLMClient using existing provider system.
 * This enables enhanced suggestions via analyzeResumeAsync while keeping scoring deterministic.
 */

"use client";

import { TokenUsageProvider } from "@/actions/tokenUsage";
import { ProviderFactory } from "@/lib/llm/clientLLM";
import { trackTokenUsage, generateRequestId } from "@/lib/llm/tokenTracker";
import { createLogger } from "@/lib/logger";

import type { LLMClient, JSONSchema } from "@pranavraut033/ats-checker";

const logger = createLogger("ATSLLMClient");

/**
 * Create an LLMClient backed by any available LLM provider. Returns null if no provider available.
 */
export async function createLLMClient(
  providerName: string,
  requestId?: string
): Promise<LLMClient | null> {
  const provider = await ProviderFactory.getInstance(providerName);
  if (!provider) return null;

  const trackingRequestId = requestId || generateRequestId();

  const llmClient: LLMClient = {
    async createCompletion(input: {
      model: string;
      messages: { role: "system" | "user"; content: string }[];
      max_tokens: number;
      response_format: JSONSchema;
    }): Promise<{
      content: unknown;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    }> {
      // Use the provider's runPrompt method
      const response = await provider.runPrompt(
        input.messages,
        input.model,
        input.max_tokens
      );

      // Track token usage if available
      if (response.usage?.prompt_tokens && response.usage?.completion_tokens) {
        try {
          await trackTokenUsage({
            model: input.model,
            provider: providerName as TokenUsageProvider,
            inputTokens: response.usage.prompt_tokens,
            outputTokens: response.usage.completion_tokens,
            purpose: "RESUME_FIELD_IMPROVEMENT", // ATS suggestions are improvements
            requestId: trackingRequestId,
          });
          logger.debug("ATS token usage tracked", {
            model: input.model,
            provider: providerName,
            tokens: response.usage.total_tokens,
          });
        } catch (error) {
          logger.error("Failed to track ATS token usage", { error });
          // Don't throw - token tracking failures shouldn't break ATS
        }
      }

      const contentStr = response.content || "";
      let parsed: unknown = contentStr;
      try {
        parsed = JSON.parse(contentStr);
      } catch (_) {
        // Non-JSON content; allow downstream validator to handle.
      }

      return {
        content: parsed,
        usage: response.usage,
      };
    },
  };

  return llmClient;
}
