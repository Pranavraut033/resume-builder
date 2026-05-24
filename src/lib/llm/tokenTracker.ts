/**
 * Token Usage Tracking Utility
 *
 * Provides client-side utilities for tracking LLM token usage.
 * Usage data is sent to server actions for storage.
 */

import { v4 as uuidv4 } from "uuid";

import {
  createTokenUsage,
  LLMUsageInfo,
  MultiPurpose,
} from "@/actions/tokenUsage";
import { createLogger } from "@/lib/logger";

const logger = createLogger("TokenTracker");

/**
 * Track token usage from an LLM response
 * Extracts usage data and sends to server for storage
 */
export async function trackTokenUsage(data: LLMUsageInfo): Promise<void> {
  logger.debug("Saving token usage", {
    provider: data.provider,
    model: data.model,
    tokens: (data.promptTokens || 0) + (data.completionTokens || 0),
  });

  await createTokenUsage({
    ...data,
    requestId: data.requestId || generateRequestId(data.purpose.toString()),
  });
}

/**
 * Generate a unique request ID for grouping related LLM calls
 */
export function generateRequestId(purpose?: string): string {
  return purpose ? `${purpose}-${uuidv4()}` : uuidv4();
}

/**
 * Estimate token count for text (rough approximation)
 * Uses ~4 characters per token as a general rule
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function mergeLLMUsageInfo(
  usage1: LLMUsageInfo,
  ...additionalUsageInfo: LLMUsageInfo[]
): LLMUsageInfo {
  for (const usage of additionalUsageInfo) {
    if (usage1.provider !== usage.provider) {
      throw new Error(
        `Cannot merge LLMUsageInfo with different providers: ${usage1.provider} vs ${usage.provider}`
      );
    }
    if (usage1.model !== usage.model) {
      throw new Error(
        `Cannot merge LLMUsageInfo with different models: ${usage1.model} vs ${usage.model}`
      );
    }
  }

  return {
    provider: usage1.provider,
    model: usage1.model,
    purpose: [
      usage1.purpose,
      ...additionalUsageInfo.map((u) => u.purpose),
    ] as MultiPurpose,
    promptTokens: additionalUsageInfo.reduce(
      (sum, u) => sum + (u.promptTokens || 0),
      usage1.promptTokens
    ),
    completionTokens: additionalUsageInfo.reduce(
      (sum, u) => sum + (u.completionTokens || 0),
      usage1.completionTokens
    ),
    totalTokens: additionalUsageInfo.reduce(
      (sum, u) => sum + (u.totalTokens || 0),
      usage1.totalTokens || 0
    ),
    costUSD: additionalUsageInfo.reduce(
      (sum, u) => sum + (u.costUSD || 0),
      usage1.costUSD || 0
    ),
    cacheReadTokens: additionalUsageInfo.reduce(
      (sum, u) => sum + (u.cacheReadTokens || 0),
      usage1.cacheReadTokens || 0
    ),
    cacheCreationTokens: additionalUsageInfo.reduce(
      (sum, u) => sum + (u.cacheCreationTokens || 0),
      usage1.cacheCreationTokens || 0
    ),
    reasoningTokens: additionalUsageInfo.reduce(
      (sum, u) => sum + (u.reasoningTokens || 0),
      usage1.reasoningTokens || 0
    ),
    durationMs: additionalUsageInfo.reduce(
      (sum, u) => sum + (u.durationMs || 0),
      usage1.durationMs || 0
    ),
  };
}
