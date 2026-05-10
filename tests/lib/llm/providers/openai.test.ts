import { describe, it, expect, vi, beforeEach } from "vitest";

import { OpenAIProvider } from "@/lib/llm/providers/openai";

import {
  getTestApiKey,
  getTestModel,
  shouldUseRealLLMs,
} from "../../../config/test.config";
import { sampleBaseProfile, sampleJobDetails } from "../../../fixtures/data";

// Mock OpenAI SDK (skip if testing with real APIs)
if (!shouldUseRealLLMs()) {
  vi.mock("openai", () => {
    const mockCreate = vi.fn();
    const mockParse = vi.fn();
    const mockList = vi.fn();

    return {
      default: class MockOpenAI {
        chat = {
          completions: {
            create: mockCreate,
            parse: mockParse,
          },
        };
        models = {
          list: mockList,
        };
      },
    };
  });
}

describe("OpenAIProvider", () => {
  let provider: OpenAIProvider;
  let mockClient: unknown;
  const TEST_API_KEY = getTestApiKey("openai") || "test-api-key";
  const _TEST_MODEL = getTestModel("openai");
  const useRealAPIs =
    shouldUseRealLLMs() && TEST_API_KEY && TEST_API_KEY !== "test-api-key";

  beforeEach(() => {
    provider = new OpenAIProvider(TEST_API_KEY);
    if (!useRealAPIs) {
      mockClient = (provider as unknown as { client: unknown }).client;
    }
  });

  describe("generateResume", () => {
    it("should generate resume from base profile and job details", async () => {
      const mockResume = {
        header: { name: "John Doe", email: "john@example.com" },
        summary: "Tailored summary",
        experience: [],
        projects: [],
        skills: [],
        education: [],
        certifications: [],
      };

      mockClient.chat.completions.parse.mockResolvedValue({
        choices: [{ message: { parsed: mockResume } }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      });

      const result = await provider.generateResume(
        {
          baseProfile: sampleBaseProfile,
          jobDescription: sampleJobDetails.raw_description,
          jobRole: sampleJobDetails.job.job_title,
          company: sampleJobDetails.company.company_name,
        },
        { model: "gpt-4o" }
      );

      expect(result.result).toEqual(mockResume);
      expect(mockClient.chat.completions.parse).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o",
          temperature: 0.7, // gpt-4o supports custom temperature
        })
      );
    });

    it("should use default model when not specified", async () => {
      mockClient.chat.completions.parse.mockResolvedValue({
        choices: [{ message: { parsed: {} } }],
      });

      await provider.generateResume(
        {
          baseProfile: sampleBaseProfile,
          jobDescription: sampleJobDetails.raw_description,
          jobRole: sampleJobDetails.job.job_title,
          company: sampleJobDetails.company.company_name,
        },
        { model: "gpt-4o" }
      );

      expect(mockClient.chat.completions.parse).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o",
        })
      );
    });

    it("should omit temperature for o1 models", async () => {
      const testResume = {
        header: { name: "John Doe", email: "john@example.com" },
        summary: "Tailored summary",
        experience: [],
        projects: [],
        skills: [],
        education: [],
        certifications: [],
      };

      mockClient.chat.completions.parse.mockResolvedValue({
        choices: [{ message: { parsed: testResume } }],
      });

      await provider.generateResume(
        {
          baseProfile: sampleBaseProfile,
          jobDescription: sampleJobDetails.raw_description,
          jobRole: sampleJobDetails.job.job_title,
          company: sampleJobDetails.company.company_name,
        },
        { model: "o1-preview" }
      );

      const mockFn = mockClient.chat.completions.parse as ReturnType<
        typeof vi.fn
      >;
      const lastCallIndex = mockFn.mock.calls.length - 1;
      const callArgs = mockFn.mock.calls[lastCallIndex][0];
      expect(callArgs.model).toBe("o1-preview");
      expect(callArgs.temperature).toBeUndefined();
    });

    it("should throw error on API failure", async () => {
      mockClient.chat.completions.parse.mockRejectedValue(
        new Error("API Error")
      );

      await expect(
        provider.generateResume(
          {
            baseProfile: sampleBaseProfile,
            jobDescription: sampleJobDetails.raw_description,
            jobRole: sampleJobDetails.job.job_title,
            company: sampleJobDetails.company.company_name,
          },
          { model: "gpt-4o" }
        )
      ).rejects.toThrow("generateResume failed");
    });

    it("should throw error when response is empty (no parsed)", async () => {
      mockClient.chat.completions.parse.mockResolvedValue({
        choices: [{ message: { parsed: null } }],
      });

      await expect(
        provider.generateResume(
          {
            baseProfile: sampleBaseProfile,
            jobDescription: sampleJobDetails.raw_description,
            jobRole: sampleJobDetails.job.job_title,
            company: sampleJobDetails.company.company_name,
          },
          { model: "gpt-4o" }
        )
      ).rejects.toThrow("Failed to parse structured response");
    });
  });

  describe("generateCoverLetter", () => {
    it("should generate cover letter", async () => {
      const mockCoverLetter = "Dear Hiring Manager, ...";

      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: mockCoverLetter,
            },
          },
        ],
      });

      const result = await provider.generateCoverLetter(
        {
          baseProfile: sampleBaseProfile,
          jobDescription: sampleJobDetails.raw_description,
          jobRole: sampleJobDetails.job.job_title,
          company: sampleJobDetails.company.company_name,
          resume: sampleBaseProfile,
        },
        { model: "gpt-4o" }
      );

      expect(result.result).toBe(mockCoverLetter);
    });

    it("should return empty string when no content", async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      const result = await provider.generateCoverLetter(
        {
          baseProfile: sampleBaseProfile,
          jobDescription: sampleJobDetails.raw_description,
          jobRole: sampleJobDetails.job.job_title,
          company: sampleJobDetails.company.company_name,
          resume: sampleBaseProfile,
        },
        { model: "gpt-4o" }
      );

      expect(result.result).toBe("");
    });

    it("should handle API errors", async () => {
      mockClient.chat.completions.create.mockRejectedValue(
        new Error("Rate limit exceeded")
      );

      await expect(
        provider.generateCoverLetter(
          {
            baseProfile: sampleBaseProfile,
            jobDescription: sampleJobDetails.raw_description,
            jobRole: sampleJobDetails.job.job_title,
            company: sampleJobDetails.company.company_name,
            resume: sampleBaseProfile,
          },
          { model: "gpt-4o" }
        )
      ).rejects.toThrow();
    });
  });

  describe("fetchModels", () => {
    it("should fetch and filter GPT models", async () => {
      mockClient.models.list.mockResolvedValue({
        data: [
          { id: "gpt-4o" },
          { id: "gpt-3.5-turbo" },
          { id: "dall-e-3" },
          { id: "whisper-1" },
        ],
      });

      const result = await provider.fetchModels();

      expect(result).toEqual(["gpt-4o", "gpt-3.5-turbo"]);
    });

    it("should return fallback models on error", async () => {
      mockClient.models.list.mockRejectedValue(new Error("API Error"));

      const result = await provider.fetchModels();

      expect(result).toEqual(["gpt-4o", "gpt-3.5-turbo"]);
    });

    it("should handle empty model list", async () => {
      mockClient.models.list.mockResolvedValue({ data: [] });

      const result = await provider.fetchModels();

      expect(result).toEqual([]);
    });
  });

  describe("parseJobDetails", () => {
    it("should parse job description using structured outputs", async () => {
      mockClient.chat.completions.parse.mockResolvedValue({
        choices: [
          {
            message: {
              parsed: sampleJobDetails,
            },
          },
        ],
      });

      const result = await provider.parseJobDetails("Job description text", {
        model: "gpt-4o",
      });

      expect(result.result).toEqual(sampleJobDetails);
      expect(mockClient.chat.completions.parse).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o",
        })
      );
    });

    it("should use default model when not specified", async () => {
      mockClient.chat.completions.parse.mockResolvedValue({
        choices: [{ message: { parsed: sampleJobDetails } }],
      });

      await provider.parseJobDetails("Job description", { model: "gpt-4o" });

      expect(mockClient.chat.completions.parse).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o",
        })
      );
    });

    it("should throw error when parsing fails", async () => {
      mockClient.chat.completions.parse.mockResolvedValue({
        choices: [{ message: { parsed: null } }],
      });

      await expect(
        provider.parseJobDetails("Job description", { model: "gpt-4o" })
      ).rejects.toThrow("Failed to parse structured response");
    });
  });
});
