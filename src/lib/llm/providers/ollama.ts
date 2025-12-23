import {
  LLMProvider,
  ResumePromptInput,
  CoverLetterPromptInput,
} from "@/types/llm";
import { ResumeJSON } from "@/types/resume";
import { BaseLLMProvider } from "./baseProvider";
import { createLogger } from "@/lib/logger";

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
    model: string = "llama2",
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
    } catch (e) {
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
}
