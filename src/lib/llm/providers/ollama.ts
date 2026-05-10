import zodToJsonSchema from "zod-to-json-schema";

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
import { JobDetailsSchema, ResumeGenerationSchema } from "@/types/resume";

import { BaseLLMProvider } from "./baseProvider";

const logger = createLogger("Ollama");

interface OllamaResponse {
  response: string;
}

interface OllamaModel {
  name: string;
}

export class OllamaProvider extends BaseLLMProvider implements LLMProvider {
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:11434") {
    super();
    this.baseUrl = baseUrl;
  }

  /**
   * Inject JSON schema into prompt for better structured output
   * Ollama's format:"json" only encourages JSON, doesn't validate structure
   */
  private injectSchemaIntoPrompt(prompt: string, schemaObject: object): string {
    return `${prompt}

IMPORTANT: You MUST respond with valid JSON matching this exact structure:

${JSON.stringify(schemaObject, null, 2)}

Return ONLY the JSON object, no markdown code blocks, no explanations.`;
  }

  private async callOllama(
    prompt: string,
    model: string,
    jsonFormat: boolean = false
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        format: jsonFormat ? "json" : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${error}`);
    }

    const data: OllamaResponse = await response.json();
    return data.response;
  }

  async generateResume(
    input: ResumePromptInput,
    options: LLMGenerationOptions
  ): Promise<ResumeGenerationResult> {
    const resolvedPrompt = this.getGenerateResumePromptTemplate(input);
    let promptText = this.combinePromptText(resolvedPrompt);

    // Inject schema for better structured output
    promptText = this.injectSchemaIntoPrompt(
      promptText,
      zodToJsonSchema(ResumeGenerationSchema)
    );

    try {
      const content = await this.callOllama(promptText, options.model, true);

      if (!content) throw new Error("No response from Ollama");

      const result = ResumeGenerationSchema.parse(JSON.parse(content));
      const usage = this.estimateTokenUsage(promptText, content);

      return { result, usage, prompt: resolvedPrompt };
    } catch (err: unknown) {
      const error = err as Record<string, unknown>;
      logger.error("generateResume failed", {
        error: err,
        message: error?.message,
      });
      throw new Error(
        `Ollama generateResume failed: ${String(error?.message) || err}`
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
    let promptText = this.combinePromptText(template);

    // Inject schema for better structured output
    promptText = this.injectSchemaIntoPrompt(
      promptText,
      zodToJsonSchema(JobDetailsSchema)
    );

    try {
      const content = await this.callOllama(promptText, options.model, true);

      if (!content) throw new Error("No response from Ollama");

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
        `Ollama parseJobDetails failed: ${String(error?.message) || err}`
      );
    }
  }

  async parseResume(
    resumeText: string,
    options: LLMGenerationOptions
  ): Promise<ResumeParsingResult> {
    const template = this.getParseResumePromptTemplate(resumeText);
    let promptText = this.combinePromptText(template);

    // Inject schema for better structured output
    promptText = this.injectSchemaIntoPrompt(
      promptText,
      zodToJsonSchema(ResumeGenerationSchema)
    );

    try {
      const content = await this.callOllama(promptText, options.model, true);

      if (!content) throw new Error("No response from Ollama");

      const result = ResumeGenerationSchema.parse(JSON.parse(content));
      const usage = this.estimateTokenUsage(promptText, content);

      return { result, usage, prompt: template };
    } catch (err: unknown) {
      const error = err as Record<string, unknown>;
      logger.error("parseResume failed", {
        error: err,
        message: error?.message,
      });
      throw new Error(
        `Ollama parseResume failed: ${String(error?.message) || err}`
      );
    }
  }

  async runLLM<T>(
    messages: PromptMessage[],
    options: LLMGenerationOptions
  ): Promise<LLMResult<T>> {
    // Ollama doesn't have separate system messages, combine them
    const promptText = messages.map((m) => m.content).join("\n\n");

    try {
      const content = await this.callOllama(promptText, options.model);

      if (!content) throw new Error("No response from Ollama");

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
      throw new Error(`Ollama runLLM failed: ${String(error?.message) || err}`);
    }
  }

  async fetchModels(): Promise<string[]> {
    try {
      logger.debug("Fetching models from Ollama API");
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) throw new Error("Ollama API error");
      const data = await response.json();
      return data.models.map((model: OllamaModel) => model.name);
    } catch (error) {
      logger.warn("Ollama not available, falling back to default models", {
        error,
      });
      return ["llama2", "llama3", "mistral", "neural-chat"];
    }
  }

  protected getProviderName(): string {
    return "Ollama";
  }

  async validateConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      const modelCount = data.models?.length ?? 0;
      return {
        success: true,
        message: `Connected to Ollama successfully. Found ${modelCount} available models.`,
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
 * Register Ollama provider
 */
BaseLLMProvider.register(
  ProviderType.OLLAMA,
  {
    name: "Ollama",
    requiresAuth: false,
    isLocal: true,
    icon: "ollama",
    description: "Local Ollama models",
  },
  () => new OllamaProvider()
);
