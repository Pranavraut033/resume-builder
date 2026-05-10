import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { createLogger } from "@/lib/logger";
import {
  CoverLetterGenerationResult,
  CoverLetterPromptInput,
  JobParsingResult,
  LLMGenerationOptions,
  LLMProvider,
  LLMResult,
  PromptMessage,
  ProviderType,
  ResumeGenerationResult,
  ResumeParsingResult,
  ResumePromptInput,
} from "@/types/llm";
import { JobDetailsSchema, ResumeGenerationSchema } from "@/types/resume";

import { BaseLLMProvider } from "./baseProvider";

const logger = createLogger("Anthropic");

export class AnthropicProvider extends BaseLLMProvider implements LLMProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    super();
    this.client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  }

  private extractTextResponse(response: unknown): string {
    if (!response || typeof response !== "object") return "";

    const content = (response as { content?: unknown }).content;
    if (!Array.isArray(content)) return "";

    return content
      .map((block) => {
        if (!block || typeof block !== "object") return "";
        const text = (block as { type?: string; text?: unknown }).text;
        const type = (block as { type?: string }).type;
        return type === "text" && typeof text === "string" ? text : "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  private normalizeUsage(
    response: unknown
  ): { inputTokens: number; outputTokens: number } | undefined {
    if (!response || typeof response !== "object") return undefined;

    const usage = (response as { usage?: unknown }).usage;
    if (!usage || typeof usage !== "object") return undefined;

    const inputTokens =
      typeof (usage as { input_tokens?: unknown }).input_tokens === "number"
        ? (usage as { input_tokens: number }).input_tokens
        : 0;
    const outputTokens =
      typeof (usage as { output_tokens?: unknown }).output_tokens === "number"
        ? (usage as { output_tokens: number }).output_tokens
        : 0;

    return { inputTokens, outputTokens };
  }

  private toAnthropicRequest(
    messages: PromptMessage[],
    options: LLMGenerationOptions
  ): {
    model: string;
    max_tokens: number;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    system?: string;
    temperature?: number;
  } {
    const system = messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n")
      .trim();

    const requestMessages = messages
      .filter((message) => message.role !== "system")
      .map((message): { role: "user" | "assistant"; content: string } => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content,
      }));

    if (requestMessages.length === 0) {
      requestMessages.push({
        role: "user",
        content: "Please follow the system instructions.",
      });
    }

    const temperature = this.resolveTemperature(
      options.model,
      options.temperature
    );

    return {
      model: options.model,
      max_tokens: options.maxTokens ?? 2048,
      messages: requestMessages,
      ...(system ? { system } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
    };
  }

  private async parseStructured<T>(
    messages: PromptMessage[],
    options: LLMGenerationOptions,
    schema: z.ZodType<T>,
    promptTextForEstimation: string
  ): Promise<LLMResult<T>> {
    const response = await this.client.messages.parse({
      ...this.toAnthropicRequest(messages, options),
      output_config: {
        format: zodOutputFormat(schema),
      },
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      throw new Error("Failed to parse structured response from Anthropic");
    }

    const usage =
      this.normalizeUsage(response) ??
      this.estimateTokenUsage(promptTextForEstimation, JSON.stringify(parsed));

    return {
      result: parsed,
      usage,
    };
  }

  async generateResume(
    input: ResumePromptInput,
    options: LLMGenerationOptions
  ): Promise<ResumeGenerationResult> {
    const resolvedPrompt = this.getGenerateResumePromptTemplate(input);
    const messages = this.toPromptMessages(resolvedPrompt);
    const promptText = this.combinePromptText(resolvedPrompt);

    try {
      const { result, usage } = await this.parseStructured(
        messages,
        options,
        ResumeGenerationSchema,
        promptText
      );

      return { result, usage, prompt: resolvedPrompt };
    } catch (err: unknown) {
      const error = err as Record<string, unknown>;
      logger.error("generateResume failed", {
        error: err,
        message: error?.message,
      });
      throw new Error(
        `Anthropic generateResume failed: ${String(error?.message) || err}`
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
    const messages = this.toPromptMessages(template);
    const promptText = this.combinePromptText(template);

    try {
      const { result, usage } = await this.parseStructured(
        messages,
        options,
        JobDetailsSchema,
        promptText
      );

      return { result, usage, prompt: template };
    } catch (err: unknown) {
      const error = err as Record<string, unknown>;
      logger.error("parseJobDetails failed", {
        error: err,
        message: error?.message,
      });
      throw new Error(
        `Anthropic parseJobDetails failed: ${String(error?.message) || err}`
      );
    }
  }

  async parseResume(
    resumeText: string,
    options: LLMGenerationOptions
  ): Promise<ResumeParsingResult> {
    const template = this.getParseResumePromptTemplate(resumeText);
    const messages = this.toPromptMessages(template);
    const promptText = this.combinePromptText(template);

    try {
      const { result, usage } = await this.parseStructured(
        messages,
        options,
        ResumeGenerationSchema,
        promptText
      );

      return { result, usage, prompt: template };
    } catch (err: unknown) {
      const error = err as Record<string, unknown>;
      logger.error("parseResume failed", {
        error: err,
        message: error?.message,
      });
      throw new Error(
        `Anthropic parseResume failed: ${String(error?.message) || err}`
      );
    }
  }

  async runLLM<T>(
    messages: PromptMessage[],
    options: LLMGenerationOptions
  ): Promise<LLMResult<T>> {
    const promptText = messages.map((message) => message.content).join("\n\n");

    try {
      const response = await this.client.messages.create(
        this.toAnthropicRequest(messages, options)
      );

      const content = this.extractTextResponse(response);
      const usage =
        this.normalizeUsage(response) ??
        this.estimateTokenUsage(promptText, content);

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
      throw new Error(
        `Anthropic runLLM failed: ${String(error?.message) || err}`
      );
    }
  }

  async fetchModels(): Promise<string[]> {
    const response = await this.client.models.list();
    const data = response.data;

    return data.map((model) => model.id);
  }

  protected getProviderName(): string {
    return "Anthropic";
  }
}

/**
 * Register Anthropic provider
 */
BaseLLMProvider.register(
  ProviderType.ANTHROPIC,
  {
    name: "Anthropic",
    requiresAuth: true,
    icon: "anthropic",
    description: "Anthropic Claude models",
  },
  (apiKey?: string) => {
    if (!apiKey) {
      throw new Error("Anthropic API key is required");
    }
    return new AnthropicProvider(apiKey);
  }
);
