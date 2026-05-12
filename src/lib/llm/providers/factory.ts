/**
 * Unified Provider Factory
 *
 * Single source of truth for provider instantiation.
 * Uses registry to look up providers instead of hard-coded switch statements.
 * Ensures all providers are registered before any instance retrieval.
 */

import { getApiKey } from "@/lib/keyStorage";
import { ProviderType } from "@/types/llm";

import { LLMProvider } from "./LLMProvider";
import { getRegistry } from "./registry";

// Import entry point to trigger all provider registrations
// This MUST happen before any getInstance calls
import "./index";

/**
 * Get a provider instance by type
 * Handles API key retrieval for cloud providers and instance caching
 */
export async function getProviderInstance(
  type: ProviderType,
  _options?: { noCache?: boolean }
): Promise<LLMProvider> {
  const registry = getRegistry();

  // Verify provider is registered
  if (!registry.has(type)) {
    const available = registry.getAvailableTypes().join(", ");
    throw new Error(
      `Provider ${type} is not registered. Available: ${available}`
    );
  }

  // Get metadata to check if auth is required
  const metadata = registry.getMetadata(type);
  if (!metadata) {
    throw new Error(`No metadata found for provider ${type}`);
  }

  // Retrieve API key if provider requires auth
  let apiKey: string | undefined;
  if (metadata.requiresAuth) {
    try {
      const key = await getApiKey(type);
      apiKey = key || undefined;
      if (!apiKey) {
        throw new Error(
          `No API key configured for ${metadata.name}. Please set it in settings.`
        );
      }
    } catch (error) {
      throw new Error(
        `Failed to retrieve API key for ${metadata.name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Create and return provider instance
  return registry.getInstance(type, apiKey);
}

/**
 * Legacy factory for backwards compatibility during migration
 * Prefer getProviderInstance() for new code
 */
export class ProviderFactory {
  private static instances: Map<string, LLMProvider> = new Map();

  static async getInstance(providerName: string): Promise<LLMProvider | null> {
    try {
      const type = providerName as ProviderType;
      if (!getRegistry().has(type)) {
        return null;
      }

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
