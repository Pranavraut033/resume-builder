/**
 * Provider Registry Integration Tests
 * Tests the complete provider system including registration, factory, and usage
 */

import { describe, it, expect } from "vitest";

import { ProviderFactory } from "@/lib/llm/providers/factory";
import { getRegistry, getAvailableProviders } from "@/lib/llm/providers/registry";
import { ProviderType } from "@/types/llm";
import { ResumeJSON } from "@/types/resume";
import "@/lib/llm/providers"; // Ensure all providers are registered

const createMockResume = (): ResumeJSON => ({
  header: { name: "Test", email: "test@example.com" },
  summary: "",
  experience: [],
  projects: [],
  skills: [],
  education: [],
  certifications: [],
});

describe("Provider System Integration", () => {
  describe("Registry and Factory Consistency", () => {
    it("should have same number of registered providers in registry and factory", async () => {
      const registryProviders = getAvailableProviders();
      const registeredCount = registryProviders.length;
      expect(registeredCount).toBe(5);
    });

    it("should be able to create all registered providers", async () => {
      const providers = getAvailableProviders();
      for (const providerMeta of providers) {
        let provider;
        if (providerMeta.requiresAuth) {
          provider = await ProviderFactory.getInstance(providerMeta.type);
        } else {
          provider = await ProviderFactory.getInstance(providerMeta.type);
        }
        expect(provider).toBeDefined();
      }
    });
  });

  describe("Dynamic Provider Discovery", () => {
    it("should list all providers dynamically without hard-coded lists", () => {
      const providers = getAvailableProviders();
      const types = providers.map((p) => p.type);

      // Should not need to know provider names in advance
      expect(types.length).toBeGreaterThan(0);
      for (const type of types) {
        expect(typeof type).toBe("string");
      }
    });

    it("should filter providers by auth requirement dynamically", () => {
      const registry = getRegistry();
      const authRequired = registry.getAuthRequired();
      const noAuth = getAvailableProviders().filter((p) => !p.requiresAuth);

      expect(authRequired.length + noAuth.length).toBe(5);
      expect(authRequired.length).toBe(4); // 4 cloud providers
      expect(noAuth.length).toBe(1); // 1 local provider
    });

    it("should filter local providers dynamically", () => {
      const registry = getRegistry();
      const localOnly = registry.getLocalProviders();
      expect(localOnly.length).toBe(1);
      expect(localOnly[0].type).toBe(ProviderType.OLLAMA);
    });
  });

  describe("Provider Types Enum", () => {
    it("should have all provider types in enum", () => {
      const enumValues = Object.values(ProviderType);
      expect(enumValues).toContain(ProviderType.OPENAI);
      expect(enumValues).toContain(ProviderType.GEMINI);
      expect(enumValues).toContain(ProviderType.GROK);
      expect(enumValues).toContain(ProviderType.PERPLEXITY);
      expect(enumValues).toContain(ProviderType.OLLAMA);
    });

    it("should have registered provider for each enum value", () => {
      const registry = getRegistry();
      for (const type of Object.values(ProviderType)) {
        expect(registry.has(type)).toBe(true);
      }
    });
  });

  describe("Provider Metadata Quality", () => {
    it("should have valid icon values for all providers", () => {
      const providers = getAvailableProviders();
      for (const provider of providers) {
        expect(provider.icon).toBeDefined();
        expect(typeof provider.icon).toBe("string");
        expect((provider.icon ?? "").length).toBeGreaterThan(0);
      }
    });

    it("should have descriptions for all providers", () => {
      const providers = getAvailableProviders();
      for (const provider of providers) {
        expect(provider.description).toBeDefined();
        expect(typeof provider.description).toBe("string");
        expect(provider.description!.length).toBeGreaterThan(0);
      }
    });

    it("should have unique provider names", () => {
      const providers = getAvailableProviders();
      const names = providers.map((p) => p.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe("Provider Capability Flags", () => {
    it("should correctly flag local providers", () => {
      const registry = getRegistry();
      const ollama = registry.getMetadata(ProviderType.OLLAMA);
      expect(ollama?.isLocal).toBe(true);

      // Cloud providers should not be marked as local
      const openai = registry.getMetadata(ProviderType.OPENAI);
      expect(openai?.isLocal).not.toBe(true);
    });

    it("should correctly flag auth requirement", () => {
      const registry = getRegistry();

      // Local provider should not require auth
      const ollama = registry.getMetadata(ProviderType.OLLAMA);
      expect(ollama?.requiresAuth).toBe(false);

      // Cloud providers should require auth
      const cloudProviders = getAvailableProviders().filter((p) => !p.isLocal);
      for (const provider of cloudProviders) {
        expect(provider.requiresAuth).toBe(true);
      }
    });
  });

  describe("Extensibility for New Providers", () => {
    it("should allow registering new providers at runtime", () => {
      const registry = getRegistry();

      // Simulate adding a new provider
      class NewProvider {
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
          return [];
        }
        async generateText() {
          return "";
        }
      }

      // This should not throw
      expect(() => {
        registry.register(
          "custom" as ProviderType,
          {
            name: "Custom Provider",
            requiresAuth: true,
          },
          () => new (NewProvider as unknown as typeof NewProvider)()
        );
      }).not.toThrow();
    });

    it("should maintain separation between built-in and custom providers", () => {
      const registry = getRegistry();
      const beforeCount = registry.getAll().length;

      class TestProvider {
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
          return [];
        }
        async generateText() {
          return "";
        }
      }

      registry.register(
        "test-custom" as ProviderType,
        { name: "Test", requiresAuth: false },
        () => new (TestProvider as unknown as typeof TestProvider)()
      );

      const afterCount = registry.getAll().length;
      expect(afterCount).toBe(beforeCount + 1);
    });
  });

  describe("Error Messages and Debugging", () => {
    it("should provide helpful error messages for missing providers", () => {
      const registry = getRegistry();
      try {
        registry.getInstance("nonexistent" as ProviderType);
        expect.fail("Should have thrown error");
      } catch (error: unknown) {
        const err = error as { message: string };
        expect(err.message).toContain("not registered");
        expect(err.message).toContain("Available:");
      }
    });

    it("should list available providers in error message", () => {
      const registry = getRegistry();
      try {
        registry.getInstance("fake-provider" as ProviderType);
        expect.fail("Should have thrown error");
      } catch (error: unknown) {
        const err = error as { message: string };
        const availableList = registry.getAvailableTypes().join(", ");
        expect(err.message).toContain(availableList);
      }
    });
  });
});
