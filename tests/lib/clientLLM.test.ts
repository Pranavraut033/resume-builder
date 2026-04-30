import { describe, it, expect, vi, beforeEach } from "vitest";

// Import mocks FIRST before importing the module under test
import {
  parseJobDescription,
  generateResume,
  generateCoverLetter,
  ProviderFactory,
} from "@/lib/llm/clientLLM";

import { shouldUseRealLLMs } from "../config/test.config";
import {
  sampleBaseProfile,
  sampleJobDetails,
  sampleTailoredResume,
} from "../fixtures/data";
import { mockGetApiKey } from "../mocks/llm";

// Create mock implementations before mocking
const mockParseJobDetails = vi.fn();
const mockGenerateResume = vi.fn();
const mockGenerateCoverLetter = vi.fn();

// Mock all provider modules with proper class constructors (skip if testing with real APIs)
if (!shouldUseRealLLMs()) {
  vi.mock("@/lib/llm/providers/openai", () => ({
    OpenAIProvider: class {
      constructor(_apiKey: string) {}
      parseJobDetails = mockParseJobDetails;
      generateResume = mockGenerateResume;
      generateCoverLetter = mockGenerateCoverLetter;
    },
  }));

  vi.mock("@/lib/llm/providers/gemini", () => ({
    GeminiProvider: class {
      constructor(_apiKey: string, _model?: string) {}
      generateResume = mockGenerateResume;
      generateCoverLetter = mockGenerateCoverLetter;
    },
  }));

  vi.mock("@/lib/llm/providers/grok", () => ({
    GrokProvider: class {
      constructor(_apiKey: string) {}
      generateResume = mockGenerateResume;
      generateCoverLetter = mockGenerateCoverLetter;
    },
  }));

  vi.mock("@/lib/llm/providers/ollama", () => ({
    OllamaProvider: class {
      constructor() {}
      generateResume = mockGenerateResume;
      generateCoverLetter = mockGenerateCoverLetter;
    },
  }));
}

describe("Client LLM Functions", () => {
  const useRealAPIs = shouldUseRealLLMs();

  beforeEach(async () => {
    if (!useRealAPIs) {
      mockParseJobDetails.mockClear();
      mockGenerateResume.mockClear();
      mockGenerateCoverLetter.mockClear();
      mockGetApiKey.mockResolvedValue("test-api-key");
    }

    // Clear provider factory cache before each test
    ProviderFactory.clearCache();
  });

  describe("parseJobDescription", () => {
    it("should parse job description using OpenAI provider", async () => {
      mockParseJobDetails.mockResolvedValue(sampleJobDetails);

      const result = await parseJobDescription(
        "Job description text",
        "gpt-4o",
        "openai"
      );

      expect(result).toEqual({
        ...sampleJobDetails,
        raw_description: "Job description text",
      });
      expect(mockParseJobDetails).toHaveBeenCalledWith(
        "Job description text",
        "gpt-4o"
      );
    });

    it("should use fallback parsing for non-OpenAI providers", async () => {
      const result = await parseJobDescription(
        "Software Engineer at Google Inc",
        "llama3",
        "ollama"
      );

      expect(result.job.job_title).toBeTruthy();
      expect(result.company.company_name).toBeTruthy();
      expect(result.raw_description).toBe("Software Engineer at Google Inc");
    });

    it("should extract company name from job description", async () => {
      const result = await parseJobDescription(
        "We are looking for a Backend Developer at Microsoft to join our team",
        "llama3",
        "ollama"
      );

      expect(result.company.company_name).toContain("Microsoft");
    });

    it("should extract job title from job description", async () => {
      const result = await parseJobDescription(
        "Senior Frontend Engineer position at Acme Corp",
        "llama3",
        "ollama"
      );

      expect(result.job.job_title).toBeTruthy();
    });

    it("should throw error when no provider is available", async () => {
      mockGetApiKey.mockResolvedValue(null);

      await expect(
        parseJobDescription("Job description", "model", "openai")
      ).rejects.toThrow("No provider available for parsing");
    });

    it("should handle structured parsing errors gracefully", async () => {
      mockParseJobDetails.mockRejectedValue(new Error("API Error"));

      // Should fallback to simple parsing
      const result = await parseJobDescription(
        "Software Engineer at TechCorp",
        "gpt-4o",
        "openai"
      );

      expect(result.raw_description).toBe("Software Engineer at TechCorp");
      expect(result.company.company_name).toBeTruthy();
    });
  });

  describe("generateResume", () => {
    it("should generate resume using specified provider", async () => {
      mockGenerateResume.mockResolvedValue(sampleTailoredResume);

      const result = await generateResume(
        sampleBaseProfile,
        sampleJobDetails.raw_description,
        sampleJobDetails.job.job_title,
        sampleJobDetails.company.company_name,
        "gpt-4o",
        "openai"
      );

      expect(result).toEqual(sampleTailoredResume);
      expect(mockGenerateResume).toHaveBeenCalled();
    });

    it("should work with Ollama provider", async () => {
      mockGenerateResume.mockResolvedValue(sampleTailoredResume);

      const result = await generateResume(
        sampleBaseProfile,
        sampleJobDetails.raw_description,
        sampleJobDetails.job.job_title,
        sampleJobDetails.company.company_name,
        "llama3",
        "ollama"
      );

      expect(result).toEqual(sampleTailoredResume);
    });

    it("should throw error when no provider is available", async () => {
      mockGetApiKey.mockResolvedValue(null);

      await expect(
        generateResume(
          sampleBaseProfile,
          sampleJobDetails.raw_description,
          sampleJobDetails.job.job_title,
          sampleJobDetails.company.company_name,
          "model",
          "openai"
        )
      ).rejects.toThrow("Provider not available");
    });

    it("should propagate provider errors", async () => {
      mockGenerateResume.mockRejectedValue(new Error("API Error"));

      await expect(
        generateResume(
          sampleBaseProfile,
          sampleJobDetails.raw_description,
          sampleJobDetails.job.job_title,
          sampleJobDetails.company.company_name,
          "gpt-4o",
          "openai"
        )
      ).rejects.toThrow("API Error");
    });
  });

  describe("generateCoverLetter", () => {
    it("should generate cover letter using specified provider", async () => {
      mockGenerateCoverLetter.mockResolvedValue("Dear Hiring Manager...");

      const result = await generateCoverLetter(
        sampleBaseProfile,
        sampleTailoredResume,
        sampleJobDetails.raw_description,
        sampleJobDetails.job.job_title,
        sampleJobDetails.company.company_name,
        "gemini-pro",
        "gemini"
      );

      expect(result).toBe("Dear Hiring Manager...");
      expect(mockGenerateCoverLetter).toHaveBeenCalled();
    });

    it("should work with Grok provider", async () => {
      mockGenerateCoverLetter.mockResolvedValue("Cover letter text");

      const result = await generateCoverLetter(
        sampleBaseProfile,
        sampleTailoredResume,
        sampleJobDetails.raw_description,
        sampleJobDetails.job.job_title,
        sampleJobDetails.company.company_name,
        "grok-4-1-fast-reasoning",
        "grok"
      );

      expect(result).toBe("Cover letter text");
    });

    it("should throw error when no provider is available", async () => {
      mockGetApiKey.mockResolvedValue(null);

      await expect(
        generateCoverLetter(
          sampleBaseProfile,
          sampleTailoredResume,
          sampleJobDetails.raw_description,
          sampleJobDetails.job.job_title,
          sampleJobDetails.company.company_name,
          "model",
          "openai"
        )
      ).rejects.toThrow("Provider not available");
    });
  });

  describe("ProviderFactory", () => {
    it("should cache provider instances", async () => {
      mockGenerateResume.mockResolvedValue(sampleTailoredResume);

      await generateResume(
        sampleBaseProfile,
        sampleJobDetails.raw_description,
        sampleJobDetails.job.job_title,
        sampleJobDetails.company.company_name,
        "gpt-4o",
        "openai"
      );
      await generateResume(
        sampleBaseProfile,
        sampleJobDetails.raw_description,
        sampleJobDetails.job.job_title,
        sampleJobDetails.company.company_name,
        "gpt-4o",
        "openai"
      );

      // Both calls should succeed
      expect(mockGenerateResume).toHaveBeenCalledTimes(2);
    });
  });
});
