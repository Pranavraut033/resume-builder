/**
 * Provider Registration Tests
 * Tests that all providers are properly registered via the entry point
 */

import { describe, it, expect } from "vitest";

import { getRegistry, getAvailableProviders, getAvailableProviderTypes } from "@/lib/llm/providers/registry";
import { ProviderType } from "@/types/llm";

// Import the entry point to trigger all registrations
// This must happen before checking the registry
import "@/lib/llm/providers";

describe("Provider Registration via Entry Point", () => {
  describe("All Providers Registered", () => {
    it("should have all 5 providers registered", () => {
      const types = getAvailableProviderTypes();
      expect(types).toContain(ProviderType.OPENAI);
      expect(types).toContain(ProviderType.GEMINI);
      expect(types).toContain(ProviderType.GROK);
      expect(types).toContain(ProviderType.PERPLEXITY);
      expect(types).toContain(ProviderType.OLLAMA);
      expect(types.length).toBe(5);
    });

    it("should have metadata for all providers", () => {
      const providers = getAvailableProviders();
      expect(providers.length).toBe(5);

      // Check for required metadata fields
      for (const provider of providers) {
        expect(provider.type).toBeDefined();
        expect(provider.name).toBeDefined();
        expect(typeof provider.requiresAuth).toBe("boolean");
      }
    });
  });

  describe("Provider Metadata Correctness", () => {
    it("should have correct metadata for OpenAI", () => {
      const registry = getRegistry();
      const meta = registry.getMetadata(ProviderType.OPENAI);
      expect(meta).toBeDefined();
      expect(meta?.name).toBe("OpenAI");
      expect(meta?.requiresAuth).toBe(true);
      expect(meta?.isLocal).not.toBe(true);
      expect(meta?.defaultModels).toContain("gpt-4o");
    });

    it("should have correct metadata for Gemini", () => {
      const registry = getRegistry();
      const meta = registry.getMetadata(ProviderType.GEMINI);
      expect(meta).toBeDefined();
      expect(meta?.name).toBe("Google Gemini");
      expect(meta?.requiresAuth).toBe(true);
    });

    it("should have correct metadata for Grok", () => {
      const registry = getRegistry();
      const meta = registry.getMetadata(ProviderType.GROK);
      expect(meta).toBeDefined();
      expect(meta?.name).toBe("Grok (X.AI)");
      expect(meta?.requiresAuth).toBe(true);
    });

    it("should have correct metadata for Perplexity", () => {
      const registry = getRegistry();
      const meta = registry.getMetadata(ProviderType.PERPLEXITY);
      expect(meta).toBeDefined();
      expect(meta?.name).toBe("Perplexity");
      expect(meta?.requiresAuth).toBe(true);
    });

    it("should have correct metadata for Ollama", () => {
      const registry = getRegistry();
      const meta = registry.getMetadata(ProviderType.OLLAMA);
      expect(meta).toBeDefined();
      expect(meta?.name).toBe("Ollama");
      expect(meta?.requiresAuth).toBe(false);
      expect(meta?.isLocal).toBe(true);
    });
  });

  describe("Auth Requirements", () => {
    it("should identify cloud providers requiring auth", () => {
      const registry = getRegistry();
      const authRequired = registry.getAuthRequired();
      const types = authRequired.map((p) => p.type);

      expect(types).toContain(ProviderType.OPENAI);
      expect(types).toContain(ProviderType.GEMINI);
      expect(types).toContain(ProviderType.GROK);
      expect(types).toContain(ProviderType.PERPLEXITY);
      expect(types).not.toContain(ProviderType.OLLAMA);
    });
  });

  describe("Local vs Cloud Providers", () => {
    it("should identify Ollama as local-only provider", () => {
      const registry = getRegistry();
      const localProviders = registry.getLocalProviders();
      const types = localProviders.map((p) => p.type);

      expect(types).toContain(ProviderType.OLLAMA);
      expect(types.length).toBe(1);
    });

    it("should identify cloud-only providers", () => {
      const _registry = getRegistry();
      const cloudProviders = getAvailableProviders().filter((p) => !p.isLocal);
      const types = cloudProviders.map((p) => p.type);

      expect(types).toContain(ProviderType.OPENAI);
      expect(types).toContain(ProviderType.GEMINI);
      expect(types).toContain(ProviderType.GROK);
      expect(types).toContain(ProviderType.PERPLEXITY);
    });
  });

  describe("Provider Instantiation", () => {
    it("should be able to instantiate all registered providers", () => {
      const registry = getRegistry();
      const types = getAvailableProviderTypes();

      for (const type of types) {
        // Ollama doesn't require API key
        if (type === ProviderType.OLLAMA) {
          const instance = registry.getInstance(type);
          expect(instance).toBeDefined();
        } else {
          // Other providers need API key
          const instance = registry.getInstance(type, "test-api-key");
          expect(instance).toBeDefined();
        }
      }
    });
  });

  describe("Default Models", () => {
    it("should have default models defined for each provider", () => {
      const providers = getAvailableProviders();
      for (const provider of providers) {
        expect(provider.defaultModels).toBeDefined();
        expect(Array.isArray(provider.defaultModels)).toBe(true);
        expect(provider.defaultModels!.length).toBeGreaterThan(0);
      }
    });

    it("should have appropriate models for each provider", () => {
      const registry = getRegistry();

      const openaiMeta = registry.getMetadata(ProviderType.OPENAI);
      expect(openaiMeta?.defaultModels).toContain("gpt-4o");

      const geminMeta = registry.getMetadata(ProviderType.GEMINI);
      expect(geminMeta?.defaultModels?.some((m) => m.includes("gemini"))).toBe(true);

      const ollamaMeta = registry.getMetadata(ProviderType.OLLAMA);
      expect(ollamaMeta?.defaultModels?.some((m) => m.includes("llama"))).toBe(true);
    });
  });
});
