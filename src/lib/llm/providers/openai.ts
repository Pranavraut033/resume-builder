import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";

import { createLogger } from "@/lib/logger";
import {
  LLMProvider,
  ResumePromptInput,
  CoverLetterPromptInput,
  ProviderType,
} from "@/types/llm";
import {
  ResumeJSON,
  JobDetails,
  JobDetailsSchema,
  ParsedResume,
  ResumeParsingSchema,
  ResumeGenerationSchema,
} from "@/types/resume";

import { BaseLLMProvider } from "./baseProvider";

const logger = createLogger("OpenAI");

export class OpenAIProvider extends BaseLLMProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    super();
    this.client = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true, // Safe in Tauri desktop app with local encrypted storage
    });
  }

  async generateResume(input: ResumePromptInput): Promise<ResumeJSON> {
    const prompt = this.generateResumePrompt(input);

    let response;
    try {
      response = await this.client.chat.completions.parse({
        model: input.model || "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: zodResponseFormat(ResumeGenerationSchema, "resume_json"),
        ...this.getTemperatureConfig(input.model),
      });
    } catch (err: unknown) {
      const error = err as Record<string, unknown>;
      logger.error("generateResume failed", {
        error: err,
        message: error?.message,
      });
      throw new Error(`OpenAI generateResume failed: ${String(error?.message) || err}`);
    }

    if (!response.choices[0]?.message?.parsed) {
      throw new Error("Failed to parse resume from OpenAI structured output");
    }

    return response.choices[0].message.parsed as ResumeJSON;
  }

  async generateCoverLetter(input: CoverLetterPromptInput): Promise<string> {
    const prompt = this.generateCoverLetterPrompt(input);

    let response;
    try {
      response = await this.client.chat.completions.create({
        model: input.model || "gpt-4o",
        messages: [{ role: "user", content: prompt }],
      });
    } catch (err: unknown) {
      const error = err as Record<string, unknown>;
      logger.error("generateCoverLetter failed", {
        error: err,
        message: error?.message,
      });
      throw new Error(
        `OpenAI generateCoverLetter failed: ${err?.message || err}`
      );
    }

    return response.choices[0]?.message?.content || "";
  }

  async fetchModels(): Promise<string[]> {
    try {
      logger.debug("Fetching models from OpenAI API");

      const response = await this.client.models.list();
      return response.data
        .map((model) => model.id)
        .filter((id) => id.includes("gpt"));
    } catch (error) {
      logger.error("Error fetching models", { error });
      return ["gpt-4o", "gpt-3.5-turbo"]; // fallback
    }
  }

  async parseJobDetails(
    description: string,
    model?: string
  ): Promise<JobDetails> {
    const systemPrompt = this.generateJobParsingSystemPrompt();

    const completion = await this.client.chat.completions.parse({
      model: model || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: description },
      ],
      response_format: zodResponseFormat(JobDetailsSchema, "job_details"),
    });

    if (!completion.choices[0].message.parsed) {
      throw new Error("Failed to parse job details");
    }

    return completion.choices[0].message.parsed;
  }

  /**
   * Parse resume text into structured data using OpenAI structured outputs
   */
  async parseResume(resumeText: string, model?: string): Promise<ParsedResume> {
    const systemPrompt = this.generateResumeParsingSystemPrompt();

    const completion = await this.client.chat.completions.parse({
      model: model || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: resumeText },
      ],
      response_format: zodResponseFormat(ResumeParsingSchema, "resume_data"),
    });

    if (!completion.choices[0].message.parsed) {
      throw new Error("Failed to parse resume");
    }

    return completion.choices[0].message.parsed;
  }

  async runPrompt(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    model?: string,
    maxTokens?: number
  ): Promise<{
    content: string;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  }> {
    const response = await this.client.chat.completions.create({
      model: model || "gpt-4o",
      messages,
      max_tokens: maxTokens,
    });

    return {
      content: response.choices[0]?.message?.content || "",
      usage: {
        prompt_tokens: response.usage?.prompt_tokens,
        completion_tokens: response.usage?.completion_tokens,
        total_tokens: response.usage?.total_tokens,
      },
    };
  }
}
/**
 * Register OpenAI provider
 */
BaseLLMProvider.register(
  ProviderType.OPENAI,
  {
    name: "OpenAI",
    requiresAuth: true,
    icon: "openai",
    description: "OpenAI GPT models",
    defaultModels: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  (apiKey?: string) => {
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }
    return new OpenAIProvider(apiKey);
  }
);
