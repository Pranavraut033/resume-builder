/**
 * End-to-End LLM Integration Tests
 *
 * These tests run against REAL LLM APIs when enabled via environment variables.
 * By default, they are skipped to avoid API costs.
 *
 * To enable real API testing, set:
 *   USE_REAL_LLM_APIS=true
 *   TEST_OPENAI_API_KEY=your-api-key (optional)
 *   TEST_GEMINI_API_KEY=your-api-key (optional)
 *   TEST_GROK_API_KEY=your-api-key (optional)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  shouldUseRealLLMs,
  getTestApiKey,
  getTestModel,
} from "../config/test.config";
import { OpenAIProvider } from "@/lib/llm/providers/openai";
import { GeminiProvider } from "@/lib/llm/providers/gemini";
import { GrokProvider } from "@/lib/llm/providers/grok";
import { OllamaProvider } from "@/lib/llm/providers/ollama";
import { sampleBaseProfile, sampleJobDetails } from "../fixtures/data";

/**
 * Skip entire suite if real APIs not enabled
 */
const describeIfRealLLM = shouldUseRealLLMs() ? describe : describe.skip;

describeIfRealLLM("Real LLM API Integration Tests", () => {
  describe("OpenAI Provider", () => {
    const TEST_API_KEY = getTestApiKey("openai");
    const TEST_MODEL = getTestModel("openai");
    const skipIfNoKey =
      TEST_API_KEY && TEST_API_KEY !== "test-openai-key"
        ? describe
        : describe.skip;

    skipIfNoKey("OpenAI Real API Calls", () => {
      let provider: OpenAIProvider;

      beforeEach(() => {
        provider = new OpenAIProvider(TEST_API_KEY!);
      });

      it("should generate resume with real OpenAI API", async () => {
        const result = await provider.generateResume({
          baseProfile: sampleBaseProfile,
          jobDescription: sampleJobDetails.raw_description,
          jobRole: sampleJobDetails.job.job_title,
          company: sampleJobDetails.company.company_name,
          model: TEST_MODEL,
        });

        expect(result).toBeDefined();
        expect(result.header).toBeDefined();
        expect(result.header.name).toBeTruthy();
        expect(result.summary).toBeTruthy();
      });

      it("should generate cover letter with real OpenAI API", async () => {
        const result = await provider.generateCoverLetter({
          baseProfile: sampleBaseProfile,
          jobDescription: sampleJobDetails.raw_description,
          jobRole: sampleJobDetails.job.job_title,
          company: sampleJobDetails.company.company_name,
          resume: sampleBaseProfile,
          model: TEST_MODEL,
        });

        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
        expect(result).toContain("Dear"); // Should have proper greeting
      });

      it("should parse job details with real OpenAI API", async () => {
        const result = await provider.parseJobDetails(
          sampleJobDetails.raw_description,
          TEST_MODEL,
        );

        expect(result).toBeDefined();
        expect(result.job).toBeDefined();
        expect(result.company).toBeDefined();
        expect(result.job.job_title).toBeTruthy();
        expect(result.company.company_name).toBeTruthy();
      });
    });
  });

  describe("Gemini Provider", () => {
    const TEST_API_KEY = getTestApiKey("gemini");
    const TEST_MODEL = getTestModel("gemini");
    const skipIfNoKey =
      TEST_API_KEY && TEST_API_KEY !== "test-gemini-key"
        ? describe
        : describe.skip;

    skipIfNoKey("Gemini Real API Calls", () => {
      let provider: GeminiProvider;

      beforeEach(() => {
        provider = new GeminiProvider(TEST_API_KEY!, TEST_MODEL);
      });

      it("should generate resume with real Gemini API", async () => {
        const result = await provider.generateResume({
          baseProfile: sampleBaseProfile,
          jobDescription: sampleJobDetails.raw_description,
          jobRole: sampleJobDetails.job.job_title,
          company: sampleJobDetails.company.company_name,
          model: TEST_MODEL,
        });

        expect(result).toBeDefined();
        expect(result.header).toBeDefined();
        expect(result.header.name).toBeTruthy();
        expect(result.summary).toBeTruthy();
      });

      it("should generate cover letter with real Gemini API", async () => {
        const result = await provider.generateCoverLetter({
          baseProfile: sampleBaseProfile,
          jobDescription: sampleJobDetails.raw_description,
          jobRole: sampleJobDetails.job.job_title,
          company: sampleJobDetails.company.company_name,
          resume: sampleBaseProfile,
          model: TEST_MODEL,
        });

        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Grok Provider", () => {
    const TEST_API_KEY = getTestApiKey("grok");
    const TEST_MODEL = getTestModel("grok");
    const skipIfNoKey =
      TEST_API_KEY && TEST_API_KEY !== "test-grok-key"
        ? describe
        : describe.skip;

    skipIfNoKey("Grok Real API Calls", () => {
      let provider: GrokProvider;

      beforeEach(() => {
        provider = new GrokProvider(TEST_API_KEY!);
      });

      it("should generate resume with real Grok API", async () => {
        const result = await provider.generateResume({
          baseProfile: sampleBaseProfile,
          jobDescription: sampleJobDetails.raw_description,
          jobRole: sampleJobDetails.job.job_title,
          company: sampleJobDetails.company.company_name,
          model: TEST_MODEL,
        });

        expect(result).toBeDefined();
        expect(result.header).toBeDefined();
        expect(result.header.name).toBeTruthy();
      });

      it("should generate cover letter with real Grok API", async () => {
        const result = await provider.generateCoverLetter({
          baseProfile: sampleBaseProfile,
          jobDescription: sampleJobDetails.raw_description,
          jobRole: sampleJobDetails.job.job_title,
          company: sampleJobDetails.company.company_name,
          resume: sampleBaseProfile,
          model: TEST_MODEL,
        });

        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Ollama Provider", () => {
    const TEST_MODEL = getTestModel("ollama");
    let provider: OllamaProvider;

    beforeEach(() => {
      provider = new OllamaProvider();
    });

    it("should generate resume with local Ollama", async () => {
      try {
        const result = await provider.generateResume({
          baseProfile: sampleBaseProfile,
          jobDescription: sampleJobDetails.raw_description,
          jobRole: sampleJobDetails.job.job_title,
          company: sampleJobDetails.company.company_name,
          model: TEST_MODEL,
        });

        expect(result).toBeDefined();
        expect(result.header).toBeDefined();
      } catch (error) {
        // Skip if Ollama not running
        if (error instanceof Error && error.message.includes("ECONNREFUSED")) {
          expect(true).toBe(true); // Just pass if Ollama not available
        } else {
          throw error;
        }
      }
    });

    it("should generate cover letter with local Ollama", async () => {
      try {
        const result = await provider.generateCoverLetter({
          baseProfile: sampleBaseProfile,
          jobDescription: sampleJobDetails.raw_description,
          jobRole: sampleJobDetails.job.job_title,
          company: sampleJobDetails.company.company_name,
          resume: sampleBaseProfile,
          model: TEST_MODEL,
        });

        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
      } catch (error) {
        // Skip if Ollama not running
        if (error instanceof Error && error.message.includes("ECONNREFUSED")) {
          expect(true).toBe(true); // Just pass if Ollama not available
        } else {
          throw error;
        }
      }
    });
  });
});

describe("Real LLM Test Configuration", () => {
  it("should have test config helpers available", () => {
    expect(shouldUseRealLLMs).toBeDefined();
    expect(getTestApiKey).toBeDefined();
    expect(getTestModel).toBeDefined();
  });

  it("should report whether real LLMs are enabled", () => {
    const enabled = shouldUseRealLLMs();
    console.log(`\nReal LLM API testing: ${enabled ? "ENABLED" : "DISABLED"}`);
    console.log("To enable, set: USE_REAL_LLM_APIS=true");
    console.log(
      "With optional API keys: TEST_OPENAI_API_KEY, TEST_GEMINI_API_KEY, TEST_GROK_API_KEY",
    );
    expect(typeof enabled).toBe("boolean");
  });
});
