/**
 * ATS LLM Client Adapter
 * Implements ats-checker's LLMClient using existing provider system.
 * This enables enhanced suggestions via analyzeResumeAsync while keeping scoring deterministic.
 */

"use client";

import { ProviderFactory } from "@/lib/llm/clientLLM";
import { trackTokenUsage, generateRequestId } from "@/lib/llm/tokenTracker";
import { ProviderType } from "@/types/llm";

import type { LLMClient, JSONSchema } from "@pranavraut033/ats-checker";

/**
 * Create an LLMClient backed by any available LLM provider. Returns null if no provider available.
 */
export async function createLLMClient(
  providerName: ProviderType,
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
      // Use the provider's runLLM method
      const response = await provider.runLLM(input.messages, {
        model: input.model,
        maxTokens: input.max_tokens,
        temperature: 0, // Deterministic output for ATS suggestions
      });

      await trackTokenUsage({
        ...response.usage,
        requestId: trackingRequestId,
      });

      return {
        content: response.result,
        usage: {
          prompt_tokens: response.usage.promptTokens,
          completion_tokens: response.usage.completionTokens,
          total_tokens: response.usage.totalTokens,
        },
      };
    },
  };

  return llmClient;
}
