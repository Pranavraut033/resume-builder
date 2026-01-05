/**
 * Provider Registry Tests
 * Tests the singleton registry pattern, provider registration, and retrieval
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

import { BaseLLMProvider } from "@/lib/llm/providers/baseProvider";
import {
  ProviderRegistry,
  getRegistry,
  getAvailableProviders,
  getAvailableProviderTypes,
} from "@/lib/llm/providers/registry";
import { ProviderType } from "@/types/llm";
import { ResumeJSON } from "@/types/resume";

// Create a test provider for testing purposes
class TestProvider extends BaseLLMProvider {
  async runPrompt() {
    return { content: "test" };
  }

  async generateResume(): Promise<ResumeJSON> {
    return createMockResume();
  }

  async generateCoverLetter() {
    return "test";
  }

  async fetchModels() {
    return ["test-model"];
  }
}

function createMockResume(): ResumeJSON {
  return {
    header: { name: "Test User", email: "test@example.com" },
    summary: "Test summary",
    experience: [],
    projects: [],
    skills: [],
    education: [],
    certifications: [],
  };
}


describe("ProviderRegistry", () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    // Get singleton instance
    registry = getRegistry();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance on multiple calls", () => {
      const registry1 = getRegistry();
      const registry2 = getRegistry();
      expect(registry1).toBe(registry2);
    });

    it("should prevent direct instantiation", () => {
      // The constructor is private, so this should not be possible
      // @ts-expect-error - ProviderRegistry constructor is private
      const testFn = () => new ProviderRegistry();
      expect(testFn).toThrow();
    });
  });

  describe("Provider Registration", () => {
    it("should register a provider", () => {
      const testMeta = {
        name: "Test Provider",
        requiresAuth: false,
        description: "A test provider",
      };

      registry.register(
        ProviderType.OPENAI,
        testMeta,
        () => new TestProvider()
      );

      expect(registry.has(ProviderType.OPENAI)).toBe(true);
    });

    it("should warn when registering duplicate provider", () => {
      const consoleWarnSpy = vi.spyOn(console, "warn");
      const testMeta = {
        name: "Test Provider",
        requiresAuth: false,
      };

      registry.register(ProviderType.OPENAI, testMeta, () => new TestProvider());
      registry.register(ProviderType.OPENAI, testMeta, () => new TestProvider());

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("already registered")
      );
      consoleWarnSpy.mockRestore();
    });

    it("should create provider instance with correct metadata", () => {
      const testMeta = {
        name: "Test Provider",
        requiresAuth: false,
        description: "Test",
        defaultModels: ["model1", "model2"],
      };

      registry.register(
        ProviderType.OPENAI,
        testMeta,
        () => new TestProvider()
      );

      const instance = registry.getInstance(ProviderType.OPENAI);
      expect(instance).toBeInstanceOf(TestProvider);
    });
  });

  describe("Provider Retrieval", () => {
    beforeEach(() => {
      const testMeta = {
        name: "Test Provider",
        requiresAuth: false,
        description: "Test",
      };
      registry.register(
        ProviderType.OPENAI,
        testMeta,
        () => new TestProvider()
      );
    });

    it("should retrieve registered provider metadata", () => {
      const metadata = registry.getMetadata(ProviderType.OPENAI);
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe("Test Provider");
      expect(metadata?.type).toBe(ProviderType.OPENAI);
    });

    it("should return null for unregistered provider", () => {
      const metadata = registry.getMetadata(ProviderType.GEMINI);
      expect(metadata).toBeNull();
    });

    it("should throw error when getting instance of unregistered provider", () => {
      expect(() => {
        registry.getInstance(ProviderType.GEMINI);
      }).toThrow(
        expect.stringContaining("not registered")
      );
    });

    it("should check if provider is registered", () => {
      expect(registry.has(ProviderType.OPENAI)).toBe(true);
      expect(registry.has(ProviderType.GEMINI)).toBe(false);
    });
  });

  describe("Provider Listing", () => {
    beforeEach(() => {
      const openaiMeta = {
        name: "OpenAI",
        requiresAuth: true,
      };
      const ollamaMeta = {
        name: "Ollama",
        requiresAuth: false,
        isLocal: true,
      };

      registry.register(ProviderType.OPENAI, openaiMeta, () => new TestProvider());
      registry.register(ProviderType.OLLAMA, ollamaMeta, () => new TestProvider());
    });

    it("should get all registered providers", () => {
      const providers = registry.getAll();
      expect(providers.length).toBeGreaterThanOrEqual(2);
      expect(providers.map((p) => p.type)).toContain(ProviderType.OPENAI);
      expect(providers.map((p) => p.type)).toContain(ProviderType.OLLAMA);
    });

    it("should get all available provider types", () => {
      const types = registry.getAvailableTypes();
      expect(types).toContain(ProviderType.OPENAI);
      expect(types).toContain(ProviderType.OLLAMA);
    });

    it("should get only providers that require auth", () => {
      const authRequired = registry.getAuthRequired();
      const openaiMeta = authRequired.find((p) => p.type === ProviderType.OPENAI);
      expect(openaiMeta).toBeDefined();
      expect(openaiMeta?.requiresAuth).toBe(true);

      const ollamaMeta = authRequired.find((p) => p.type === ProviderType.OLLAMA);
      expect(ollamaMeta).toBeUndefined();
    });

    it("should get only local providers", () => {
      const local = registry.getLocalProviders();
      const ollamaMeta = local.find((p) => p.type === ProviderType.OLLAMA);
      expect(ollamaMeta).toBeDefined();
      expect(ollamaMeta?.isLocal).toBe(true);

      const openaiMeta = local.find((p) => p.type === ProviderType.OPENAI);
      expect(openaiMeta).toBeUndefined();
    });
  });

  describe("Convenience Functions", () => {
    beforeEach(() => {
      const testMeta = {
        name: "Test Provider",
        requiresAuth: false,
      };
      registry.register(
        ProviderType.OPENAI,
        testMeta,
        () => new TestProvider()
      );
    });

    it("getAvailableProviders should return all providers", () => {
      const providers = getAvailableProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    it("getAvailableProviderTypes should return all provider types", () => {
      const types = getAvailableProviderTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });
  });

  describe("Metadata Validation", () => {
    it("should include type in metadata when registered", () => {
      const testMeta = {
        name: "Test Provider",
        requiresAuth: true,
        description: "Test description",
      };

      registry.register(ProviderType.OPENAI, testMeta, () => new TestProvider());

      const meta = registry.getMetadata(ProviderType.OPENAI);
      expect(meta?.type).toBe(ProviderType.OPENAI);
      expect(meta?.name).toBe("Test Provider");
      expect(meta?.requiresAuth).toBe(true);
      expect(meta?.description).toBe("Test description");
    });

    it("should support optional metadata fields", () => {
      const testMeta = {
        name: "Test Provider",
        requiresAuth: false,
        icon: "test-icon",
        isLocal: true,
        defaultModels: ["model1", "model2"],
      };

      registry.register(
        ProviderType.OPENAI,
        testMeta,
        () => new TestProvider()
      );

      const meta = registry.getMetadata(ProviderType.OPENAI);
      expect(meta?.icon).toBe("test-icon");
      expect(meta?.isLocal).toBe(true);
      expect(meta?.defaultModels).toEqual(["model1", "model2"]);
    });
  });
});
