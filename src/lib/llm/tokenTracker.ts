/**
 * Token Usage Tracking Utility
 *
 * Provides client-side utilities for tracking LLM token usage.
 * Usage data is sent to server actions for storage.
 */

import { v4 as uuidv4 } from "uuid";

import {
  createTokenUsage,
  TokenUsagePurpose,
  TokenUsageProvider,
} from "@/actions/tokenUsage";
import { createLogger } from "@/lib/logger";

const logger = createLogger("TokenTracker");

export interface TokenUsageData {
  model: string;
  provider: TokenUsageProvider;
  inputTokens: number;
  outputTokens: number;
  purpose: TokenUsagePurpose;
  requestId?: string;
}

/**
 * Track token usage from an LLM response
 * Extracts usage data and sends to server for storage
 */
export async function trackTokenUsage(data: TokenUsageData): Promise<void> {
  try {
    await createTokenUsage({
      model: data.model,
      provider: data.provider,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      purpose: data.purpose,
      requestId: data.requestId || uuidv4(),
    });

    logger.debug("Token usage tracked", {
      provider: data.provider,
      model: data.model,
      tokens: data.inputTokens + data.outputTokens,
    });
  } catch (error) {
    logger.error("Failed to track token usage", { error, data });
    // Don't throw - token tracking failures shouldn't break the app
  }
}

/**
 * Generate a unique request ID for grouping related LLM calls
 */
export function generateRequestId(): string {
  return uuidv4();
}

/**
 * Estimate token count for text (rough approximation)
 * Uses ~4 characters per token as a general rule
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
