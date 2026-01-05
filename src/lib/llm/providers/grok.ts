import OpenAI from "openai";

import { createLogger } from "@/lib/logger";
import {
  LLMProvider,
  ResumePromptInput,
  CoverLetterPromptInput,
  ProviderType,
} from "@/types/llm";
import { ResumeJSON } from "@/types/resume";

import { BaseLLMProvider } from "./baseProvider";

const logger = createLogger("Grok");

export class GrokProvider extends BaseLLMProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    super();
    this.client = new OpenAI({
      apiKey,
      baseURL: "https://api.x.ai/v1", // Grok API endpoint
      dangerouslyAllowBrowser: true, // Safe in Tauri desktop app with local encrypted storage
    });
  }

  async generateResume(input: ResumePromptInput): Promise<ResumeJSON> {
    const prompt = this.generateResumePrompt(input);

    try {
      const response = await this.client.chat.completions.create({
        model: input.model || "grok-4-1-fast-reasoning", // or another Grok model
        messages: [{ role: "user", content: prompt }],
        ...this.getTemperatureConfig(input.model),
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("No response from Grok");

      return JSON.parse(content) as ResumeJSON;
    } catch (e: unknown) {
      const error = e as Record<string, unknown>;
      if (error.message && String(error.message).includes("JSON")) {
        throw new Error("Invalid JSON response from Grok");
      }
      throw new Error("Grok generateResume failed: " + String(error.message));
    }
  }

  async generateCoverLetter(input: CoverLetterPromptInput): Promise<string> {
    const prompt = this.generateCoverLetterPrompt(input);

    const response = await this.client.chat.completions.create({
      model: input.model || "grok-4-1-fast-reasoning",
      messages: [{ role: "user", content: prompt }],
      ...this.getTemperatureConfig(input.model),
    });

    return response.choices[0]?.message?.content || "";
  }

  async fetchModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list();
      return response.data.map((model) => model.id);
    } catch (error) {
      logger.error("Error fetching models", { error });
      return ["grok-4-1-fast-reasoning", "grok-3-mini"]; // fallback
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
      model: model || "grok-4-1-fast-reasoning",
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
 * Register Grok provider
 */
BaseLLMProvider.register(
  ProviderType.GROK,
  {
    name: "Grok (X.AI)",
    requiresAuth: true,
    icon: "grok",
    description: "Grok models from X.AI",
    defaultModels: ["grok-4-1-fast-reasoning", "grok-3"],
  },
  (apiKey?: string) => {
    if (!apiKey) {
      throw new Error("Grok API key is required");
    }
    return new GrokProvider(apiKey);
  }
);
