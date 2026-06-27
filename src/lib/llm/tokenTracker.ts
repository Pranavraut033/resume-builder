/**
 * Token Usage Tracking — host shim around @pranavraut033/llm-core.
 *
 * `generateRequestId`/`estimateTokenCount`/`mergeLLMUsageInfo` are drop-in
 * re-exports. `trackTokenUsage` is wrapped to inject the `createTokenUsage`
 * server action as the persistence sink — the package itself never reads
 * or writes a database.
 */

import { createTokenUsage, LLMUsageInfo } from "@/actions/tokenUsage";

import {
  trackTokenUsage as coreTrackTokenUsage,
  generateRequestId,
  estimateTokenCount,
  mergeLLMUsageInfo,
} from "@pranavraut033/llm-core";

export { generateRequestId, estimateTokenCount, mergeLLMUsageInfo };

export async function trackTokenUsage(data: LLMUsageInfo): Promise<void> {
  await coreTrackTokenUsage(data, {
    sink: async (usage) => {
      await createTokenUsage(usage);
    },
  });
}
