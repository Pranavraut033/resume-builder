/**
 * Client-side LLM operations
 * These functions run in the browser/Tauri context where API keys are accessible
 */

import { ProviderFactory } from "@/lib/llm/providers/factory";
import { createLogger } from "@/lib/logger";
import { ProviderType } from "@/types/llm";

export const EMPTY_MODELS_MAPS = Object.freeze({
  [ProviderType.OPENAI]: [],
  [ProviderType.GEMINI]: [],
  [ProviderType.GROK]: [],
  [ProviderType.PERPLEXITY]: [],
  [ProviderType.OLLAMA]: [],
  [ProviderType.ANTHROPIC]: [],
  [ProviderType.MANAGED]: [],
} as Record<ProviderType, string[]>);

const logger = createLogger("ClientLLM");

/**
 * Fetch available models from all configured providers
 *
 * @param providers Optional list of provider types to fetch models for (fetches all if empty)
 * @returns Map of provider type to array of model names
 */
export async function fetchModels(
  ...providers: ProviderType[]
): Promise<Record<ProviderType, string[]>> {
  const { getAvailableProviderTypes } = await import("@/lib/llm/providers");
  // Only the 6 builtins are ever registered (see providers/factory.ts), so
  // narrowing the package's open ProviderId back to our closed enum is safe.
  const providerTypes = getAvailableProviderTypes() as ProviderType[];
  const modelsMap: Record<ProviderType, string[]> = { ...EMPTY_MODELS_MAPS };

  // Initialize empty model array for each provider
  for (const providerType of providerTypes) {
    modelsMap[providerType] = [];
  }

  for (const name of Object.keys(
    providers.length > 0
      ? Object.fromEntries(providers.map((p) => [p, []]))
      : modelsMap
  ) as ProviderType[]) {
    try {
      const provider = await ProviderFactory.getInstance(name);
      if (provider) {
        // Provider successfully initialized, use static models
        modelsMap[name] = await provider.fetchModels();
        logger.debug(`Models loaded for ${name}`, {
          count: modelsMap[name].length,
        });
      } else {
        // Provider not available (likely no API key), return empty array
        modelsMap[name] = [];
        logger.debug(`Provider ${name} not available (no API key)`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(`Failed to initialize provider ${name}`, {
        error,
        errorMessage,
      });
      modelsMap[name] = [];
    }
  }

  return modelsMap;
}

/**
 * Validate connection to an LLM provider
 */
export async function validateProviderConnection(
  providerType: ProviderType
): Promise<{ success: boolean; message: string }> {
  try {
    const provider = await ProviderFactory.getInstance(providerType);
    if (!provider) {
      return {
        success: false,
        message: `Provider ${providerType} is not available`,
      };
    }

    const result = await provider.validateConnection();
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to validate connection: ${errorMessage}`,
    };
  }
}

// Export ProviderFactory for use in other modules (e.g., atsLLMClient)
export { ProviderFactory };
