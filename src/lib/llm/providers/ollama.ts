import { createLogger } from "@/lib/logger";
import {
  LLMProvider,
  ResumePromptInput,
  CoverLetterPromptInput,
  ProviderType,
} from "@/types/llm";
import { ResumeJSON } from "@/types/resume";

import { BaseLLMProvider } from "./baseProvider";

const logger = createLogger("Ollama");

interface OllamaResponse {
  response: string;
}

interface OllamaModel {
  name: string;
  // other fields if needed
}

export class OllamaProvider extends BaseLLMProvider implements LLMProvider {
  private baseUrl: string;
  private model: string;

  constructor(
    baseUrl: string = "http://localhost:11434",
    model: string = "llama2"
  ) {
    super();
    this.baseUrl = baseUrl;
    this.model = model;
  }

  private async callOllama(prompt: string, model?: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || this.model,
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) throw new Error("Ollama API error");

    const data: OllamaResponse = await response.json();
    return data.response;
  }

  async generateResume(input: ResumePromptInput): Promise<ResumeJSON> {
    const prompt = this.generateResumePrompt(input);

    const content = await this.callOllama(prompt, input.model);

    try {
      return JSON.parse(content) as ResumeJSON;
    } catch (_e) {
      throw new Error("Invalid JSON response from Ollama");
    }
  }

  async generateCoverLetter(input: CoverLetterPromptInput): Promise<string> {
    const prompt = this.generateCoverLetterPrompt(input);

    return await this.callOllama(prompt, input.model);
  }

  async fetchModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) throw new Error("Ollama API error");
      const data = await response.json();
      return data.models.map((model: OllamaModel) => model.name);
    } catch (error) {
      logger.warn("Ollama not available, falling back to default models", {
        error,
      });
      return ["llama2", "llama3"];
    }
  }

  async runPrompt(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    _model?: string,
    _maxTokens?: number
  ): Promise<{
    content: string;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  }> {
    // Ollama doesn't support system messages in the same way, combine them
    const prompt = messages.map((m) => m.content).join("\n\n");
    const content = await this.callOllama(prompt, _model);

    return {
      content,
    };
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
    defaultModels: ["llama2", "llama3", "mistral", "neural-chat"],
  },
  () => new OllamaProvider()
);
