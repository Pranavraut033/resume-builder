/**
 * Host shim around @pranavraut033/llm-core's provider factory.
 *
 * Registers the 6 built-in providers, injects API-key retrieval from
 * `keyStorage` as the package's `keyResolver`, and keeps the legacy
 * `ProviderFactory.getInstance` caching API so existing call sites
 * (clientLLM, llmService, atsLLMClient, Chatbot) don't need to change.
 */

import {
  getProviderInstance as coreGetProviderInstance,
  LLMProvider,
} from "@pranavraut033/llm-core";

import { getApiKey } from "@/lib/keyStorage";
import { ProviderType } from "@/types/llm";

// Side-effect import: registers the 6 built-in providers with the shared
// registry. MUST happen before any getInstance calls.
import "@pranavraut033/llm-core/providers/register-builtins";
// Side-effect import: registers the managed (paid) provider.
import "./managedProvider";

/**
 * Get a provider instance by type.
 * Handles API key retrieval for cloud providers via keyStorage.
 */
export async function getProviderInstance(
  type: ProviderType
): Promise<LLMProvider> {
  return coreGetProviderInstance(type, { keyResolver: getApiKey });
}

/**
 * Legacy factory for backwards compatibility during migration.
 * Prefer getProviderInstance() for new code.
 */
export class ProviderFactory {
  private static instances: Map<string, LLMProvider> = new Map();

  static async getInstance(providerName: string): Promise<LLMProvider | null> {
    try {
      const type = providerName as ProviderType;

      const cacheKey = type;
      if (this.instances.has(cacheKey)) {
        return this.instances.get(cacheKey)!;
      }

      const instance = await getProviderInstance(type);
      this.instances.set(cacheKey, instance);
      return instance;
    } catch (error) {
      console.error(
        `Failed to get provider instance for ${providerName}:`,
        error
      );
      return null;
    }
  }

  static clearCache(): void {
    this.instances.clear();
  }
}
