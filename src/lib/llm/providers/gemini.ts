import { GoogleGenAI } from "@google/genai";
import { zodToJsonSchema } from "zod-to-json-schema";

import { createLogger } from "@/lib/logger";
import {
  LLMProvider,
  ResumePromptInput,
  CoverLetterPromptInput,
  ProviderType,
  ResumeGenerationResult,
  CoverLetterGenerationResult,
  JobParsingResult,
  ResumeParsingResult,
  LLMGenerationOptions,
  LLMResult,
  PromptMessage,
} from "@/types/llm";
import {
  ResumeJSON,
  JobDetailsSchema,
  ResumeGenerationSchema,
} from "@/types/resume";

import { BaseLLMProvider } from "./baseProvider";

const logger = createLogger("Gemini");

export class GeminiProvider extends BaseLLMProvider implements LLMProvider {
  private client: GoogleGenAI;
  private apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
    this.client = new GoogleGenAI({ apiKey });
  }

  textGenModelRegex =
    /^models\/gemini-\d+(\.\d+)?-(pro|flash)(-(latest|lite|preview)){0,2}$/;

  async generateResume(
    input: ResumePromptInput,
    options: LLMGenerationOptions
  ): Promise<ResumeGenerationResult> {
    const resolvedPrompt = this.getGenerateResumePromptTemplate(input);
    const promptText = this.combinePromptText(resolvedPrompt);

    try {
      const response = await this.client.models.generateContent({
        model: options.model,
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          // @ts-expect-error - zodToJsonSchema types are not fully compatible with Gemini's expected schema format, but it should work for our simple cases
          responseSchema: zodToJsonSchema(ResumeGenerationSchema),
        },
      });

      const content = response.text;
      if (!content) throw new Error("No response from Gemini");

      const result = JSON.parse(content) as ResumeJSON;
      const usage = this.estimateTokenUsage(promptText, content);

      return { result, usage, prompt: resolvedPrompt };
    } catch (err: unknown) {
      const error = err as Record<string, unknown>;
      logger.error("generateResume failed", {
        error: err,
        message: error?.message,
      });
      throw new Error(
        `Gemini generateResume failed: ${String(error?.message) || err}`
      );
    }
  }

  async generateCoverLetter(
    input: CoverLetterPromptInput,
    options: LLMGenerationOptions
  ): Promise<CoverLetterGenerationResult> {
    const resolvedPrompt = this.getGenerateCoverLetterPromptTemplate(input);
    const messages = this.toPromptMessages(resolvedPrompt);

    const { result, usage } = await this.runLLM<string>(messages, options);

    return { result, prompt: resolvedPrompt, usage };
  }

  async parseJobDetails(
    description: string,
    options: LLMGenerationOptions
  ): Promise<JobParsingResult> {
    const template = this.getParseJobPromptTemplate(description);
    const promptText = this.combinePromptText(template);

    try {
      const response = await this.client.models.generateContent({
        model: options.model,
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          // @ts-expect-error - zodToJsonSchema types are not fully compatible with Gemini's expected schema format, but it should work for our simple cases
          responseSchema: zodToJsonSchema(JobDetailsSchema),
        },
      });

      const content = response.text;
      if (!content) throw new Error("No response from Gemini");

      const result = JobDetailsSchema.parse(JSON.parse(content));
      const usage = this.estimateTokenUsage(promptText, content);

      return { result, usage, prompt: template };
    } catch (err: unknown) {
      const error = err as Record<string, unknown>;
      logger.error("parseJobDetails failed", {
        error: err,
        message: error?.message,
      });
      throw new Error(
        `Gemini parseJobDetails failed: ${String(error?.message) || err}`
      );
    }
  }

  async parseResume(
    resumeText: string,
    options: LLMGenerationOptions
  ): Promise<ResumeParsingResult> {
    const template = this.getParseResumePromptTemplate(resumeText);
    const promptText = this.combinePromptText(template);

    try {
      const response = await this.client.models.generateContent({
        model: options.model,
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          // @ts-expect-error - zodToJsonSchema types are not fully compatible with Gemini's expected schema format, but it should work for our simple cases
          responseSchema: zodToJsonSchema(ResumeGenerationSchema),
        },
      });

      const content = response.text;
      if (!content) throw new Error("No response from Gemini");

      const result = JSON.parse(content) as ResumeJSON;
      const usage = this.estimateTokenUsage(promptText, content);

      return { result, usage, prompt: template };
    } catch (err: unknown) {
      const error = err as Record<string, unknown>;
      logger.error("parseResume failed", {
        error: err,
        message: error?.message,
      });
      throw new Error(
        `Gemini parseResume failed: ${String(error?.message) || err}`
      );
    }
  }

  async runLLM<T>(
    messages: PromptMessage[],
    options: LLMGenerationOptions
  ): Promise<LLMResult<T>> {
    // Gemini doesn't have separate system messages, combine them
    const promptText = messages.map((m) => m.content).join("\n\n");

    try {
      const response = await this.client.models.generateContent({
        model: options.model,
        contents: promptText,
      });

      const content = response.text || "";
      const usage = this.estimateTokenUsage(promptText, content);

      return {
        result: content as T,
        usage,
      };
    } catch (err: unknown) {
      const error = err as Record<string, unknown>;
      logger.error("runLLM failed", {
        error: err,
        message: error?.message,
      });
      throw new Error(`Gemini runLLM failed: ${String(error?.message) || err}`);
    }
  }

  async fetchModels(): Promise<string[]> {
    try {
      logger.debug("Fetching models from Gemini API");
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models",
        { headers: { "x-goog-api-key": this.apiKey } }
      );
      const data = await response.json();

      if (!data.models || !Array.isArray(data.models)) {
        throw new Error("Invalid response from Gemini models API");
      }

      const textGenerationModels = data.models
        .map((model: { name: string }) => model.name)
        .filter((name: string) => this.textGenModelRegex.test(name));

      return textGenerationModels;
    } catch (error) {
      logger.error("Error fetching models", { error });
      return ["gemini-2.5-flash", "gemini-2.0-pro", "gemini-1.5-pro"]; // fallback
    }
  }

  protected getProviderName(): string {
    return "Gemini";
  }

  async validateConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models",
        { headers: { "x-goog-api-key": this.apiKey } }
      );
      const data = await response.json();

      if (!response.ok || !data.models) {
        throw new Error(data.error?.message || "Failed to fetch models");
      }

      const modelCount = data.models.length;
      return {
        success: true,
        message: `Connected successfully. Found ${modelCount} available models.`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Connection failed: ${errorMessage}`,
      };
    }
  }
}
/**
 * Register Gemini provider
 */
BaseLLMProvider.register(
  ProviderType.GEMINI,
  {
    name: "Google Gemini",
    requiresAuth: true,
    icon: "gemini",
    description: "Google Gemini models",
  },
  (apiKey?: string) => {
    if (!apiKey) {
      throw new Error("Gemini API key is required");
    }
    return new GeminiProvider(apiKey);
  }
);
