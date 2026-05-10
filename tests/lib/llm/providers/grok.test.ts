import { describe, it, expect, vi, beforeEach } from "vitest";

import { GrokProvider } from "@/lib/llm/providers/grok";

import {
  getTestApiKey,
  getTestModel,
  shouldUseRealLLMs,
} from "../../../config/test.config";
import { sampleBaseProfile, sampleJobDetails } from "../../../fixtures/data";

// Mock OpenAI SDK (Grok uses OpenAI SDK) (skip if testing with real APIs)
const mockChatCompletionsParse = vi.fn();
const mockChatCompletionsCreate = vi.fn();
const mockModelsList = vi.fn();

if (!shouldUseRealLLMs()) {
  vi.mock("openai", () => {
    return {
      default: vi.fn().mockImplementation(function (this: unknown) {
        const self = this as unknown as { chat: unknown; models: unknown };
        self.chat = {
          completions: {
            create: mockChatCompletionsCreate,
            parse: mockChatCompletionsParse,
          },
        };
        self.models = {
          list: mockModelsList,
        };
        return this;
      }),
    };
  });
}

describe("GrokProvider", () => {
  let provider: GrokProvider;
  const TEST_API_KEY = getTestApiKey("grok") || "test-api-key";
  const _TEST_MODEL = getTestModel("grok");
  const useRealAPIs =
    shouldUseRealLLMs() && TEST_API_KEY && TEST_API_KEY !== "test-api-key";

  beforeEach(() => {
    if (!useRealAPIs) {
      vi.clearAllMocks();
    }
    provider = new GrokProvider(TEST_API_KEY);
  });

  describe("generateResume", () => {
    it("should generate resume using Grok API", async () => {
      const mockResume = {
        header: { name: "John Doe", email: "john@example.com" },
        summary: "Tailored summary",
        experience: [],
        projects: [],
        skills: [],
        education: [],
        certifications: [],
      };

      mockChatCompletionsParse.mockResolvedValue({
        choices: [{ message: { parsed: mockResume } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      });

      const result = await provider.generateResume(
        { baseProfile: sampleBaseProfile, jobDetails: sampleJobDetails },
        { model: "grok-4-1-fast-reasoning" }
      );

      expect(result.result).toEqual(mockResume);
    });

    it("should use default model when not specified", async () => {
      const mockResume = {
        header: { name: "Test", email: "test@example.com" },
        summary: "",
        experience: [],
        projects: [],
        skills: [],
        education: [],
        certifications: [],
      };

      mockChatCompletionsParse.mockResolvedValue({
        choices: [{ message: { parsed: mockResume } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      });

      await provider.generateResume(
        { baseProfile: sampleBaseProfile, jobDetails: sampleJobDetails },
        { model: "grok-4-1-fast-reasoning" }
      );

      expect(mockChatCompletionsParse).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "grok-4-1-fast-reasoning",
        })
      );
    });

    it("should throw error on API failure", async () => {
      mockChatCompletionsParse.mockRejectedValue(
        new Error("Rate limit exceeded")
      );

      await expect(
        provider.generateResume(
          { baseProfile: sampleBaseProfile, jobDetails: sampleJobDetails },
          { model: "grok-4-1-fast-reasoning" }
        )
      ).rejects.toThrow("Grok generateResume failed");
    });

    it("should throw error on invalid JSON", async () => {
      mockChatCompletionsParse.mockResolvedValue({
        choices: [{ message: { parsed: undefined } }],
      });

      await expect(
        provider.generateResume(
          { baseProfile: sampleBaseProfile, jobDetails: sampleJobDetails },
          { model: "grok-4-1-fast-reasoning" }
        )
      ).rejects.toThrow("Grok generateResume failed");
    });
  });

  describe("generateCoverLetter", () => {
    it("should generate cover letter", async () => {
      const mockCoverLetter = "Dear Hiring Manager, ...";

      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: mockCoverLetter } }],
      });

      const result = await provider.generateCoverLetter(
        {
          baseProfile: sampleBaseProfile,
          jobDetails: sampleJobDetails,
          resume: sampleBaseProfile,
        },
        { model: "grok-4-1-fast-reasoning" }
      );

      expect(result.result).toBe(mockCoverLetter);
    });

    it("should handle empty response", async () => {
      mockChatCompletionsCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      const result = await provider.generateCoverLetter(
        {
          baseProfile: sampleBaseProfile,
          jobDetails: sampleJobDetails,
          resume: sampleBaseProfile,
        },
        { model: "grok-4-1-fast-reasoning" }
      );

      expect(result.result).toBe("");
    });
  });

  describe("fetchModels", () => {
    it("should fetch models from Grok API", async () => {
      mockModelsList.mockResolvedValue({
        data: [{ id: "grok-4-1-fast-reasoning" }, { id: "grok-3-mini" }],
      });

      const result = await provider.fetchModels();

      expect(result).toEqual(["grok-4-1-fast-reasoning", "grok-3-mini"]);
    });

    it("should return fallback models on error", async () => {
      mockModelsList.mockRejectedValue(new Error("API Error"));

      const result = await provider.fetchModels();

      expect(result).toEqual(["grok-4-1-fast-reasoning", "grok-3-mini"]);
    });
  });
});
