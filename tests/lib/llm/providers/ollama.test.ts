import { describe, it, expect, vi, beforeEach, Mock } from "vitest";

import { OllamaProvider } from "@/lib/llm/providers/ollama";

import { getTestModel, shouldUseRealLLMs } from "../../../config/test.config";
import {
  sampleBaseProfile,
  sampleJobDetails,
  sampleTailoredResume,
} from "../../../fixtures/data";

// Mock fetch globally (skip if testing with real APIs)
if (!shouldUseRealLLMs()) {
  global.fetch = vi.fn();
}

describe("OllamaProvider", () => {
  let provider: OllamaProvider;
  const _TEST_MODEL = getTestModel("ollama");
  const useRealAPIs = shouldUseRealLLMs();

  beforeEach(() => {
    provider = new OllamaProvider();
    if (!useRealAPIs) {
      vi.clearAllMocks();
    }
  });

  describe("generateResume", () => {
    it("should generate resume using Ollama API", async () => {
      const mockResume = {
        header: { name: "John Doe", email: "john@example.com" },
        summary: "Tailored summary",
        experience: [],
        projects: [],
        skills: [],
        education: [],
        certifications: [],
      };

      (
        global.fetch as unknown as MockedFunction<typeof fetch>
      ).mockResolvedValue({
        ok: true,
        json: async () => ({
          response: JSON.stringify(sampleTailoredResume),
        }),
        text: async () => "",
      } as Response);

      const result = await provider.generateResume(
        {
          baseProfile: sampleBaseProfile,
          jobDescription: sampleJobDetails.raw_description,
          jobRole: sampleJobDetails.job.job_title,
          company: sampleJobDetails.company.company_name,
        },
        { model: "llama3" }
      );

      expect(result.result).toEqual(sampleTailoredResume);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:11434/api/generate",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("should use default model when not specified", async () => {
      const sampleResume = {
        header: { name: "John Doe", email: "john@example.com" },
        summary: "Tailored summary",
        experience: [],
        projects: [],
        skills: [],
        education: [],
        certifications: [],
      };
      (global.fetch as unknown as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          response: JSON.stringify(sampleTailoredResume),
        }),
        text: async () => "",
      });

      await provider.generateResume(
        {
          baseProfile: sampleBaseProfile,
          jobDescription: sampleJobDetails.raw_description,
          jobRole: sampleJobDetails.job.job_title,
          company: sampleJobDetails.company.company_name,
        },
        { model: "llama2" }
      );

      const callBody = JSON.parse(
        (
          (global.fetch as unknown as Mock).mock
            .calls[0]?.[1] as unknown as Record<string, string>
        ).body
      );
      expect(callBody.model).toBe("llama2");
    });

    it("should throw error on API failure", async () => {
      (global.fetch as unknown as Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => "Internal Server Error",
      });

      await expect(
        provider.generateResume(
          {
            baseProfile: sampleBaseProfile,
            jobDescription: sampleJobDetails.raw_description,
            jobRole: sampleJobDetails.job.job_title,
            company: sampleJobDetails.company.company_name,
          },
          { model: "llama3" }
        )
      ).rejects.toThrow("Ollama API error");
    });

    it("should throw error on invalid JSON response", async () => {
      (global.fetch as unknown as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          response: "invalid json",
        }),
      });

      await expect(
        provider.generateResume(
          {
            baseProfile: sampleBaseProfile,
            jobDescription: sampleJobDetails.raw_description,
            jobRole: sampleJobDetails.job.job_title,
            company: sampleJobDetails.company.company_name,
          },
          { model: "llama3" }
        )
      ).rejects.toThrow("Ollama generateResume failed");
    });

    it("should throw error on network failure", async () => {
      (global.fetch as unknown as Mock).mockRejectedValue(
        new Error("Network error")
      );

      await expect(
        provider.generateResume(
          {
            baseProfile: sampleBaseProfile,
            jobDescription: sampleJobDetails.raw_description,
            jobRole: sampleJobDetails.job.job_title,
            company: sampleJobDetails.company.company_name,
          },
          { model: "llama3" }
        )
      ).rejects.toThrow("Ollama generateResume failed");
    });
  });

  describe("generateCoverLetter", () => {
    it("should generate cover letter using Ollama API", async () => {
      const mockCoverLetter = "Dear Hiring Manager, ...";

      (global.fetch as unknown as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          response: mockCoverLetter,
        }),
        text: async () => "",
      });

      const result = await provider.generateCoverLetter(
        {
          baseProfile: sampleBaseProfile,
          jobDescription: sampleJobDetails.raw_description,
          jobRole: sampleJobDetails.job.job_title,
          company: sampleJobDetails.company.company_name,
          resume: sampleBaseProfile,
        },
        { model: "llama3" }
      );

      expect(result.result).toBe(mockCoverLetter);
    });

    it("should handle empty response (throws)", async () => {
      (global.fetch as unknown as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          response: "",
        }),
        text: async () => "",
      });

      await expect(
        provider.generateCoverLetter(
          {
            baseProfile: sampleBaseProfile,
            jobDescription: sampleJobDetails.raw_description,
            jobRole: sampleJobDetails.job.job_title,
            company: sampleJobDetails.company.company_name,
            resume: sampleBaseProfile,
          },
          { model: "llama2" }
        )
      ).rejects.toThrow("No response from Ollama");
    });
  });

  describe("fetchModels", () => {
    it("should fetch available models from Ollama", async () => {
      (global.fetch as unknown as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            { name: "llama3:latest" },
            { name: "codellama:latest" },
            { name: "mistral:latest" },
          ],
        }),
      });

      const result = await provider.fetchModels();

      expect(result).toEqual([
        "llama3:latest",
        "codellama:latest",
        "mistral:latest",
      ]);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:11434/api/tags"
      );
    });

    it("should return fallback message on error", async () => {
      (global.fetch as unknown as Mock).mockRejectedValue(
        new Error("Connection refused")
      );

      const result = await provider.fetchModels();

      expect(result).toEqual(["llama2", "llama3", "mistral", "neural-chat"]);
    });

    it("should handle empty model list", async () => {
      (global.fetch as unknown as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [],
        }),
      });

      const result = await provider.fetchModels();

      expect(result).toEqual([]);
    });
  });
});
