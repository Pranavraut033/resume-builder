/**
 * Provider Registration Entry Point
 *
 * This file is the single explicit entry point that ensures all providers
 * are imported and registered with the registry.
 *
 * This prevents the risk of providers failing to register if their files
 * are never imported elsewhere in the codebase.
 *
 * All provider imports must happen here before the registry is used.
 */

// Import all providers - this triggers their registration
import "./openai";
import "./gemini";
import "./grok";
import "./perplexity";
import "./ollama";

// Export registry and factory for consumers
export {
  ProviderRegistry,
  getRegistry,
  getAvailableProviders,
  getAvailableProviderTypes,
} from "./registry";
export { ProviderFactory } from "./factory";
export type { ProviderMetadata } from "./registry";
