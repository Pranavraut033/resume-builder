/**
 * OpenAI-compatible provider base.
 * Hosts shared OpenAI client setup plus helpers for structured outputs and usage normalization
 * so OpenAI-like providers (OpenAI, Grok, Perplexity) avoid duplication.
 */
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { CompletionUsage } from "openai/resources/completions.mjs";

import {
  ResumeJSON,
  ResumeGenerationSchema,
  JobDetailsSchema,
  JobDetails,
} from "@/types/resume";

import { BaseLLMProvider } from "./baseProvider";

import type {
  LLMGenerationOptions,
  LLMResult,
  LLMUsageInfo,
  PromptMessage,
  ResumePromptInput,
  CoverLetterPromptInput,
  ResumeGenerationResult,
  CoverLetterGenerationResult,
  JobParsingResult,
  ResumeParsingResult,
} from "@/types/llm";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { ZodTypeAny } from "zod";

export type OpenAIClientConfig = {
  apiKey: string;
  baseURL?: string;
};

export abstract class OpenAICompatibleProvider extends BaseLLMProvider {
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

  protected async parseStructured<T>({
    model,
    messages,
    schema,
    schemaName,
    temperature,
    maxTokens,
    promptTextForEstimation,
  }: {
    model: string;
    messages: PromptMessage[];
    schema: ZodTypeAny;
    schemaName: string;
    temperature?: number;
    maxTokens?: number;
    promptTextForEstimation?: string;
  }): Promise<LLMResult<T>> {
    const completion = await this.client.chat.completions.parse({
      model,
      messages: this.toChatMessages(messages),
      response_format: zodResponseFormat(schema, schemaName),
      temperature,
      max_tokens: maxTokens,
    });

    const parsed = completion.choices[0]?.message?.parsed as T | undefined;
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

  async generateResume(
    input: ResumePromptInput,
    options: LLMGenerationOptions
  ): Promise<ResumeGenerationResult> {
    const resolvedPrompt = this.getGenerateResumePromptTemplate(input);
    const messages = this.toPromptMessages(resolvedPrompt);

    try {
      const { result, usage } = await this.parseStructured<ResumeJSON>({
        model: options.model,
        messages,
        schema: ResumeGenerationSchema,
        schemaName: "resume_json",
        temperature: this.resolveTemperature(
          options.model,
          options.temperature
        ),
        maxTokens: options.maxTokens,
        promptTextForEstimation: this.combinePromptText(resolvedPrompt),
      });

      return { result, usage, prompt: resolvedPrompt };
    } catch (err: unknown) {
      const error = err as Record<string, unknown>;
      throw new Error(
        `${this.getProviderName()} generateResume failed: ${String(error?.message) || err}`
      );
    }
  }

  async generateCoverLetter(
    input: CoverLetterPromptInput,
    options: LLMGenerationOptions
  ): Promise<CoverLetterGenerationResult> {
    const resolvedPrompt = this.getGenerateCoverLetterPromptTemplate(input);
    const messages = this.toPromptMessages(resolvedPrompt);
    const model = options.model;

    const { result, usage } = await this.runLLM<string>(messages, {
      ...options,
      model,
    });

    return { result, prompt: resolvedPrompt, usage };
  }

  async parseJobDetails(
    description: string,
    options: LLMGenerationOptions
  ): Promise<JobParsingResult> {
    const template = this.getParseJobPromptTemplate(description);
    const model = options.model;

    const messages = this.toPromptMessages(template);

    const { result, usage } = await this.parseStructured<JobDetails>({
      model,
      messages,
      schema: JobDetailsSchema,
      schemaName: "job_details",
      temperature: this.resolveTemperature(model, options.temperature),
      maxTokens: options.maxTokens,
      promptTextForEstimation: this.combinePromptText(template),
    });

    return { result, usage, prompt: template };
  }

  async parseResume(
    resumeText: string,
    options: LLMGenerationOptions
  ): Promise<ResumeParsingResult> {
    const template = this.getParseResumePromptTemplate(resumeText);
    const model = options.model;

    const { result, usage } = await this.parseStructured<ResumeJSON>({
      model,
      messages: this.toPromptMessages(template),
      schema: template.outputSchema as ZodTypeAny,
      schemaName: "resume_data",
      temperature: this.resolveTemperature(model, options.temperature),
      maxTokens: options.maxTokens,
      promptTextForEstimation: [template.systemPrompt, resumeText]
        .filter(Boolean)
        .join("\n"),
    });

    return { result, usage, prompt: template };
  }

  /**
   * Override this in child classes to provide provider-specific name for error messages
   */
  protected getProviderName(): string {
    return "OpenAI-compatible provider";
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
