/**
 * Base LLM Provider with shared prompt generation utilities.
 * This eliminates prompt duplication across different LLM providers.
 *
 * Providers should register themselves using the static register() method
 * to allow dynamic provider discovery and instantiation.
 */
import z, { ZodTypeAny } from "zod";

import { LLMUsageInfo } from "@/actions/tokenUsage";
import { PromptPurpose, PromptSystem, ResolvedPrompt } from "@/lib/llm/prompts";
import { HumanizerSchema } from "@/types/humanizer";
import {
  ResumePromptInput,
  CoverLetterPromptInput,
  LLMGenerationOptions,
  ProviderType,
  LLMResult,
  CoverLetterGenerationResult,
  JobParsingResult,
  PromptMessage,
  ResumeGenerationResult,
  ResumeParsingResult,
  TextGenerationResult,
  HumanizeContentResult,
} from "@/types/llm";
import {
  ResumeGenerationSchema,
  JobDetailsSchema,
  ATSAnalysisSchema,
  ATSAnalysisJSON,
} from "@/types/resume";

import { ProviderRegistry, ProviderMetadata } from "./registry";

export type StructureResult<TSchema extends ZodTypeAny> = {
  result: z.infer<TSchema>;
  usage: LLMUsageInfo;
};

export abstract class LLMProvider {
  abstract fetchModels(): Promise<string[]>;

  abstract validateConnection(): Promise<{ success: boolean; message: string }>;

  abstract runLLM<T>(
    messages: PromptMessage[],
    options: LLMGenerationOptions
  ): Promise<LLMResult<T>>;

  abstract runStructuredLLM<TSchema extends ZodTypeAny>(
    template: ResolvedPrompt,
    options: LLMGenerationOptions,
    zodSchema: TSchema,
    schemaName?: string
  ): Promise<StructureResult<TSchema>>;

  async generateResume(
    input: ResumePromptInput,
    options: LLMGenerationOptions
  ): Promise<ResumeGenerationResult> {
    const resolvedPrompt = this.getGenerateResumePromptTemplate(input);

    const { result, usage } = await this.runStructuredLLM(
      resolvedPrompt,
      options,
      ResumeGenerationSchema
    );

    return { result, usage };
  }

  analyzeATS(
    input: CoverLetterPromptInput,
    options: LLMGenerationOptions
  ): Promise<LLMResult<ATSAnalysisJSON>> {
    const prompt = PromptSystem.generatePrompt("analyze_ats", input);

    return this.runStructuredLLM(
      prompt,
      options,
      ATSAnalysisSchema,
      "ATSAnalysisResult"
    );
  }

  async generateCoverLetter(
    input: CoverLetterPromptInput,
    options: LLMGenerationOptions
  ): Promise<CoverLetterGenerationResult> {
    const resolvedPrompt = this.getGenerateCoverLetterPromptTemplate(input);
    const messages = this.toPromptMessages(resolvedPrompt);

    const { result, usage } = await this.runLLM<string>(messages, options);

    return { result, usage };
  }

  async parseJobDetails(
    description: string,
    options: LLMGenerationOptions
  ): Promise<JobParsingResult> {
    const template = this.getParseJobPromptTemplate(description);

    const { result, usage } = await this.runStructuredLLM(
      template,
      options,
      JobDetailsSchema
    );
    return { result, usage };
  }

  async parseResume(
    resumeText: string,
    options: LLMGenerationOptions
  ): Promise<ResumeParsingResult> {
    const template = this.getParseResumePromptTemplate(resumeText);
    const { result, usage } = await this.runStructuredLLM(
      template,
      options,
      ResumeGenerationSchema,
      "ParsedResume"
    );
    return { result, usage };
  }

  async humanizeContent(
    input: string,
    options: LLMGenerationOptions
  ): Promise<HumanizeContentResult> {
    const template = this.getParseHumanizerPromptTemplate(input);
    const { result, usage } = await this.runStructuredLLM(
      template,
      options,
      HumanizerSchema,
      "HumanizerResult"
    );
    return { result, usage };
  }

  /**
   * Returns 0.7 for standard chat models and undefined for reasoning models
   * or unsupported providers to avoid API parameter errors.
   * * Supported Providers: OpenAI, xAI (Grok), Gemini, Perplexity (Sonar).
   */
  getDefaultTemperature(modelId: string): number | undefined {
    if (!modelId || typeof modelId !== "string") return undefined;

    const m = modelId.toLowerCase();

    // 1. PROVIDER CHECK
    // Ensures we only return values for your specific requested stack.
    const isSupportedProvider = /gpt|o1|o3|o4|gemini|grok|sonar|pplx/.test(m);
    if (!isSupportedProvider) return undefined;

    // 2. REASONING MODEL EXCLUSIONS (The "No-Temperature" Zone)
    // These models in 2026 either error out or ignore temperature entirely.

    // OpenAI: o1, o3, o4 series AND the gpt-5 reasoning family (except 'chat' variants)
    const isOpenAIReasoning = /^(o1|o3|o4|gpt-5(?!.*-chat))/.test(m);

    // xAI: Grok-4 reasoning and specialized logic variants
    const isGrokReasoning = m.includes("grok") && m.includes("reasoning");

    // Perplexity: Sonar reasoning and Deep Research models
    const isSonarReasoning =
      m.includes("sonar") &&
      (m.includes("reasoning") || m.includes("research"));

    // Gemini: Thinking/Reasoning modes
    const isGeminiThinking = m.includes("gemini") && m.includes("thinking");

    if (
      isOpenAIReasoning ||
      isGrokReasoning ||
      isSonarReasoning ||
      isGeminiThinking
    ) {
      return undefined;
    }

    // 3. DEFAULT FOR STANDARD MODELS
    // Returns 0.7 for gpt-4o, gpt-5-chat-latest, grok-3, gemini-2.0-flash, sonar-pro, etc.
    return 0.7;
  }

  /**
   * Helper to only include temperature when the model supports it.
   */
  protected getTemperatureConfig(
    modelId?: string,
    temperature?: number
  ): { temperature?: number } {
    const resolved = this.resolveTemperature(modelId ?? "", temperature);
    return resolved === undefined ? {} : { temperature: resolved };
  }

  /**
   * Generate text from system and user prompts
   * Default implementation uses runPrompt - override for custom behavior
   */
  async generateText(
    systemPrompt: string,
    userPrompt: string,
    options: LLMGenerationOptions
  ): Promise<TextGenerationResult> {
    // Default implementation using runPrompt - providers can override
    const response = await this.runLLM<string>(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        ...options,
        ...this.getTemperatureConfig(options.model, options.temperature),
      }
    );

    return {
      ...response,

      usage:
        response.usage ??
        this.estimateTokenUsage({
          inputPrompt: systemPrompt + userPrompt,
          outputText: response.result,
          model: options.model,
          purpose: "generate_text",
          provider: this.providerType, // Assuming each provider implementation sets this.providerType
        }),
    };
  }

  abstract providerType: ProviderType;

  /**
   * Normalize token usage from provider-specific format to LLMUsageInfo
   */
  protected estimateTokenUsage({
    inputPrompt,
    outputText,
    model,
    purpose,
    provider,
  }: {
    inputPrompt: string;
    outputText: string;
    model: string;
    purpose: PromptPurpose;
    provider: ProviderType;
  }): LLMUsageInfo {
    const inputTokens = inputPrompt ? Math.ceil(inputPrompt.length / 4) : 0;
    const outputTokens = outputText ? Math.ceil(outputText.length / 4) : 0;

    return {
      promptTokens: inputTokens,
      completionTokens: outputTokens,
      totalTokens: inputTokens + outputTokens,
      model,
      purpose,
      provider,
    } satisfies LLMUsageInfo;
  }

  /**
   * Generate a resume tailoring prompt using template system
   */
  protected getGenerateResumePromptTemplate(
    input: ResumePromptInput
  ): ResolvedPrompt {
    return PromptSystem.generatePrompt("generate_tailored_resume", {
      baseProfile: input.baseProfile,
      jobDetails: input.jobDetails,
    });
  }

  /**
   * Generate a cover letter writing prompt using template system
   */
  protected getGenerateCoverLetterPromptTemplate(
    input: CoverLetterPromptInput
  ): ResolvedPrompt {
    return PromptSystem.generatePrompt("generate_cover_letter", {
      jobDetails: input.jobDetails,
      resume: input.resume,
    });
  }

  /**
   * Generate a job details extraction prompt (for structured parsing)
   * Returns only system prompt - user prompt is the job description itself
   */
  protected getParseJobPromptTemplate(jobText: string): ResolvedPrompt {
    return PromptSystem.generatePrompt("parse_job", {
      jobDescription: jobText,
    });
  }

  /**
   * Generate a resume parsing prompt (for structured output)
   * Returns only system prompt - user prompt is the resume text itself
   */
  protected getParseResumePromptTemplate(resumeText: string): ResolvedPrompt {
    return PromptSystem.generatePrompt("parse_resume", { resumeText });
  }

  protected getParseHumanizerPromptTemplate(content: string): ResolvedPrompt {
    return PromptSystem.generatePrompt("humanize_content", {
      userInput: content,
    });
  }

  /**
   * Register this provider with the registry
   * Should be called at module load time from provider implementations
   *
   * @param type - Provider type enum
   * @param metadata - Provider metadata (name, auth requirement, etc.)
   * @param constructor - Constructor function that returns provider instance
   */
  static register(
    type: ProviderType,
    metadata: Omit<ProviderMetadata, "type">,
    constructor: (apiKey?: string) => LLMProvider
  ): void {
    ProviderRegistry.getInstance().register(type, metadata, constructor);
  }

  /**
   * Convert ResolvedPrompt to array of PromptMessages
   */
  protected toPromptMessages(resolved: ResolvedPrompt): PromptMessage[] {
    const withMessages = resolved as ResolvedPrompt & {
      messages?: PromptMessage[];
    };

    if (Array.isArray(withMessages.messages) && withMessages.messages.length) {
      return withMessages.messages;
    }

    const messages: PromptMessage[] = [];
    if (resolved.systemPrompt) {
      messages.push({ role: "system", content: resolved.systemPrompt });
    }
    if (resolved.userPrompt) {
      messages.push({ role: "user", content: resolved.userPrompt });
    }
    return messages;
  }

  protected combinePromptText(resolved: ResolvedPrompt): string {
    const withMessages = resolved as ResolvedPrompt & {
      messages?: PromptMessage[];
    };
    const messageContent = withMessages.messages?.map((m) => m.content) ?? [];

    return [
      resolved.systemPrompt ?? "",
      resolved.userPrompt ?? "",
      ...messageContent,
    ]
      .filter(Boolean)
      .join("\n");
  }

  protected resolveTemperature(
    model: string,
    temperature?: number
  ): number | undefined {
    return temperature ?? this.getDefaultTemperature(model);
  }
}
