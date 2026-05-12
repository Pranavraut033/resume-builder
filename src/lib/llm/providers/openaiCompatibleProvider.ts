/**
 * OpenAI-compatible provider base.
 * Hosts shared OpenAI client setup plus helpers for structured outputs and usage normalization
 * so OpenAI-like providers (OpenAI, Grok, Perplexity) avoid duplication.
 */
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { CompletionUsage } from "openai/resources/completions.mjs";

import { LLMProvider } from "./LLMProvider";
import { ResolvedPrompt } from "../prompts";

import type {
  LLMGenerationOptions,
  LLMResult,
  LLMUsageInfo,
  PromptMessage,
} from "@/types/llm";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { z, ZodTypeAny } from "zod";

export type OpenAIClientConfig = {
  apiKey: string;
  baseURL?: string;
};

export abstract class OpenAICompatibleProvider extends LLMProvider {
  protected readonly client: OpenAI;

  protected constructor(config: OpenAIClientConfig) {
    super();
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      dangerouslyAllowBrowser: true,
    });
  }

  protected normalizeUsage(
    usage?: CompletionUsage | null
  ): LLMUsageInfo | undefined {
    if (!usage) return undefined;

    return {
      inputTokens: usage.prompt_tokens ?? 0,
      outputTokens: usage.completion_tokens ?? 0,
    } satisfies LLMUsageInfo;
  }

  protected toChatMessages(
    messages: PromptMessage[]
  ): ChatCompletionMessageParam[] {
    return messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
  }

  async runLLM<T>(
    messages: PromptMessage[],
    options: LLMGenerationOptions
  ): Promise<LLMResult<T>> {
    const model = options.model;
    const temperature = this.resolveTemperature(model, options.temperature);

    try {
      const completion = await this.client.chat.completions.create({
        model,
        messages: this.toChatMessages(messages),
        temperature,
        max_tokens: options.maxTokens,
      });

      const content = completion.choices[0]?.message?.content ?? "";
      const usage =
        this.normalizeUsage(completion.usage) ??
        this.estimateTokenUsage(
          messages.map((m) => m.content).join("\n"),
          content
        );

      return {
        result: content as T,
        usage,
      };
    } catch (err: unknown) {
      const error = err as Record<string, unknown>;
      throw new Error(
        `OpenAI-compatible runLLM failed: ${String(error?.message) || err}`
      );
    }
  }

  async runStructuredLLM<TSchema extends ZodTypeAny>(
    template: ResolvedPrompt,
    options: LLMGenerationOptions,
    zodSchema: TSchema,
    schemaName: string
  ): Promise<{ result: z.infer<TSchema>; usage: LLMUsageInfo | undefined }> {
    const messages = this.toPromptMessages(template);
    const promptTextForEstimation = this.combinePromptText(template);

    const completion = await this.client.chat.completions.parse({
      model: options.model,
      messages: this.toChatMessages(messages),
      response_format: zodResponseFormat(zodSchema, schemaName),
      temperature: this.resolveTemperature(options.model, options.temperature),
      max_tokens: options.maxTokens,
    });

    const parsed = completion.choices[0]?.message?.parsed;

    if (!parsed) {
      throw new Error("Failed to parse structured response");
    }

    const usage =
      this.normalizeUsage(completion.usage) ||
      this.estimateTokenUsage(
        promptTextForEstimation ?? messages.map((m) => m.content).join("\n"),
        JSON.stringify(parsed)
      );

    return { result: parsed, usage };
  }

  /**
   * Validate connection by making a simple API call
   */
  async validateConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.fetchModels();
      const modelCount = result.length;
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
