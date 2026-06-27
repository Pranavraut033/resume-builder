/**
 * Provider barrel.
 *
 * Re-exports the registry/factory primitives from `@pranavraut033/llm-core`
 * (which ships the 6 concrete providers), plus the host's `ProviderFactory`
 * shim. Importing this barrel (transitively, via `./factory`) registers all
 * 6 built-in providers.
 */

export {
  ProviderRegistry,
  getRegistry,
  getAvailableProviders,
  getAvailableProviderTypes,
  LLMProvider,
} from "@pranavraut033/llm-core";
export type {
  ProviderMetadata,
  StructureResult,
} from "@pranavraut033/llm-core";

export { ProviderFactory, getProviderInstance } from "./factory";
