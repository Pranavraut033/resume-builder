/**
 * Provider Factory Tests
 * Tests provider instantiation and factory pattern
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import { BaseLLMProvider } from "@/lib/llm/providers/baseProvider";
import { ProviderFactory, getProviderInstance } from "@/lib/llm/providers/factory";
import { getRegistry } from "@/lib/llm/providers/registry";
import { ProviderType } from "@/types/llm";
import { ResumeJSON } from "@/types/resume";

// Mock keyStorage to avoid actual key retrieval
vi.mock("@/lib/keyStorage", () => ({
  getApiKey: vi.fn(async (provider: string) => {
    // Return test keys for providers that require auth
    const keys: Record<string, string> = {
      openai: "test-openai-key",
      gemini: "test-gemini-key",
      grok: "test-grok-key",
      perplexity: "test-perplexity-key",
    };
    return keys[provider] || null;
  }),
}));

class MockProvider extends BaseLLMProvider {
  constructor(public apiKey?: string) {
    super();
  }

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
    header: { name: "Test", email: "test@example.com" },
    summary: "",
    experience: [],
    projects: [],
    skills: [],
    education: [],
    certifications: [],
  };
}

describe("ProviderFactory", () => {
  let registry = getRegistry();

  beforeEach(() => {
    registry = getRegistry();
    // Register mock providers
    registry.register(
      ProviderType.OPENAI,
      {
        name: "OpenAI",
        requiresAuth: true,
      },
      (apiKey?: string) => new MockProvider(apiKey)
    );

    registry.register(
      ProviderType.OLLAMA,
      {
        name: "Ollama",
        requiresAuth: false,
        isLocal: true,
      },
      () => new MockProvider()
    );
  });

  describe("getInstance", () => {
    it("should return a provider instance for registered provider", async () => {
      const provider = await ProviderFactory.getInstance("openai");
      expect(provider).toBeDefined();
      expect(provider).toBeInstanceOf(MockProvider);
    });

    it("should return null for unregistered provider", async () => {
      const provider = await ProviderFactory.getInstance("unknown");
      expect(provider).toBeNull();
    });

    it("should cache provider instances", async () => {
      const provider1 = await ProviderFactory.getInstance("openai");
      const provider2 = await ProviderFactory.getInstance("openai");
      expect(provider1).toBe(provider2);
    });

    it("should handle provider creation errors gracefully", async () => {
      const provider = await ProviderFactory.getInstance("nonexistent");
      expect(provider).toBeNull();
    });
  });

  describe("clearCache", () => {
    it("should clear the provider cache", async () => {
      const provider1 = await ProviderFactory.getInstance("openai");
      ProviderFactory.clearCache();
      const provider2 = await ProviderFactory.getInstance("openai");
      expect(provider1).not.toBe(provider2);
    });
  });

  describe("Legacy Compatibility", () => {
    it("ProviderFactory should work with legacy string provider names", async () => {
      const provider = await ProviderFactory.getInstance("openai");
      expect(provider).toBeDefined();
    });
  });
});

describe("getProviderInstance", () => {
  let registry = getRegistry();

  beforeEach(() => {
    registry = getRegistry();
    registry.register(
      ProviderType.OPENAI,
      {
        name: "OpenAI",
        requiresAuth: true,
      },
      (apiKey?: string) => {
        if (!apiKey) throw new Error("API key required");
        return new MockProvider(apiKey);
      }
    );

    registry.register(
      ProviderType.OLLAMA,
      {
        name: "Ollama",
        requiresAuth: false,
        isLocal: true,
      },
      () => new MockProvider()
    );
  });

  describe("Provider Creation", () => {
    it("should create instance for auth-required provider", async () => {
      const provider = await getProviderInstance(ProviderType.OPENAI);
      expect(provider).toBeInstanceOf(MockProvider);
      expect((provider as MockProvider).apiKey).toBe("test-openai-key");
    });

    it("should create instance for local provider without auth", async () => {
      const provider = await getProviderInstance(ProviderType.OLLAMA);
      expect(provider).toBeInstanceOf(MockProvider);
    });

    it("should throw error for unregistered provider", async () => {
      await expect(getProviderInstance(ProviderType.GEMINI)).rejects.toThrow(
        /not registered/
      );
    });
  });

  describe("Error Handling", () => {
    it("should throw error when API key is missing for auth-required provider", async () => {
      // Override the mock to return null for openai
      const { getApiKey } = await import("@/lib/keyStorage");
      vi.mocked(getApiKey).mockResolvedValueOnce(null);

      await expect(getProviderInstance(ProviderType.OPENAI)).rejects.toThrow(
        /API key configured/
      );
    });
  });

  describe("Metadata Access", () => {
    it("should provide error message with available providers", async () => {
      try {
        await getProviderInstance(ProviderType.GEMINI);
      } catch (error: unknown) {
        const err = error as Record<string, unknown>;
        expect(String(err.message)).toContain("Available:");
      }
    });
  });
});
