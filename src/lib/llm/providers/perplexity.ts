import OpenAI from "openai";

import { createLogger } from "@/lib/logger";
import {
  LLMProvider,
  ResumePromptInput,
  CoverLetterPromptInput,
  ProviderType,
} from "@/types/llm";
import { ResumeJSON, JobDetails, JobDetailsSchema } from "@/types/resume";

import { BaseLLMProvider } from "./baseProvider";

const logger = createLogger("Perplexity");

export class PerplexityProvider extends BaseLLMProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    super();
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://api.perplexity.ai",
      dangerouslyAllowBrowser: true, // Safe in Tauri desktop app with local encrypted storage
    });
  }

  async generateResume(input: ResumePromptInput): Promise<ResumeJSON> {
    const prompt = this.generateResumePrompt(input);

    let response;
    try {
      response = await this.client.chat.completions.create({
        model: input.model || "sonar-pro",
        messages: [{ role: "user", content: prompt }],
        ...this.getTemperatureConfig(input.model),
      });
    } catch (err: unknown) {
      const error = err as Record<string, unknown>;
      logger.error("generateResume failed", {
        error: err,
        message: error?.message,
      });
      throw new Error(
        `Perplexity generateResume failed: ${String(error?.message) || err}`
      );
    }

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from Perplexity");

    try {
      return JSON.parse(content) as ResumeJSON;
    } catch (_e) {
      throw new Error("Invalid JSON response from Perplexity");
    }
  }

  async generateCoverLetter(input: CoverLetterPromptInput): Promise<string> {
    const prompt = this.generateCoverLetterPrompt(input);

    let response;
    try {
      response = await this.client.chat.completions.create({
        model: input.model || "sonar-pro",
        messages: [{ role: "user", content: prompt }],
        ...this.getTemperatureConfig(input.model),
      });
    } catch (err: unknown) {
      const error = err as Record<string, unknown>;
      logger.error("generateCoverLetter failed", {
        error: err,
        message: error?.message,
      });
      throw new Error(
        `Perplexity generateCoverLetter failed: ${String(error?.message) || err}`
      );
    }

    return response.choices[0]?.message?.content || "";
  }

  async fetchModels(): Promise<string[]> {
    try {
      logger.debug("Fetching models from Perplexity API");

      // Perplexity doesn't have a models.list() endpoint, so return hardcoded models
      return [
        "sonar-deep-research",
        "sonar-reasoning-pro",
        "sonar-pro",
        "sonar",
      ];
    } catch (error) {
      logger.error("Error fetching models", { error });
      return ["sonar-pro"]; // fallback
    }
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
      model: model || "sonar-pro",
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

  async parseJobDetails(
    description: string,
    model?: string
  ): Promise<JobDetails> {
    const systemPrompt = this.generateJobParsingSystemPrompt();

    let response;
    try {
      response = await this.client.chat.completions.create({
        model: model || "sonar-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `${description}\n\nRespond with ONLY valid JSON matching this structure:\n${JSON.stringify(JobDetailsSchema.shape)}`,
          },
        ],
        temperature: 0.3,
      });
    } catch (err: unknown) {
      const error = err as Record<string, unknown>;
      logger.error("parseJobDetails failed", {
        error: err,
        message: error?.message,
      });
      throw new Error(
        `Perplexity parseJobDetails failed: ${String(error?.message) || err}`
      );
    }

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from Perplexity");

    try {
      const parsed = JSON.parse(content);
      return JobDetailsSchema.parse(parsed);
    } catch (e: unknown) {
      const error = e as Record<string, unknown>;
      logger.warn("Failed to parse job details from Perplexity response", {
        error: error?.message,
      });
      throw new Error("Failed to parse job details from Perplexity");
    }
  }
}
/**
 * Register Perplexity provider
 */
BaseLLMProvider.register(
  ProviderType.PERPLEXITY,
  {
    name: "Perplexity",
    requiresAuth: true,
    icon: "perplexity",
    description: "Perplexity AI models",
    defaultModels: ["sonar-pro", "sonar-reasoning-pro", "sonar"],
  },
  (apiKey?: string) => {
    if (!apiKey) {
      throw new Error("Perplexity API key is required");
    }
    return new PerplexityProvider(apiKey);
  }
);
