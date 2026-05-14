/**
 * Token Usage Tracking Utility
 *
 * Provides client-side utilities for tracking LLM token usage.
 * Usage data is sent to server actions for storage.
 */

import { v4 as uuidv4 } from "uuid";

import { createTokenUsage, LLMUsageInfo } from "@/actions/tokenUsage";
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
  console.log({ data });

  await createTokenUsage({
    ...data,
    requestId: data.requestId || generateRequestId(data.purpose),
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
