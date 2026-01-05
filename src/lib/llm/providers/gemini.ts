import { GoogleGenAI } from "@google/genai";

import {
  LLMProvider,
  ResumePromptInput,
  CoverLetterPromptInput,
  ProviderType,
} from "@/types/llm";
import { ResumeJSON } from "@/types/resume";

import { BaseLLMProvider } from "./baseProvider";

export class GeminiProvider extends BaseLLMProvider implements LLMProvider {
  private client: GoogleGenAI;
  private model: string;
  private apiKey: string;
  constructor(apiKey: string, model: string = "gemini-2.5-flash") {
    super();
    this.apiKey = apiKey;
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async generateResume(input: ResumePromptInput): Promise<ResumeJSON> {
    const prompt = this.generateResumePrompt(input);

    try {
      const response = await this.client.models.generateContent({
        model: input.model || this.model,
        contents: prompt,
      });

      const content = response.text;
      if (!content) throw new Error("No response from Gemini");

      return JSON.parse(content) as ResumeJSON;
    } catch (e: unknown) {
      const error = e as Record<string, unknown>;
      if (error.message && String(error.message).includes("JSON")) {
        throw new Error("Invalid JSON response from Gemini");
      }
      throw new Error("Gemini generateResume failed: " + String(error.message));
    }
  }

  async generateCoverLetter(input: CoverLetterPromptInput): Promise<string> {
    const prompt = this.generateCoverLetterPrompt(input);

    const response = await this.client.models.generateContent({
      model: input.model || this.model,
      contents: prompt,
    });

    return response.text || "";
  }

  async fetchModels(): Promise<string[]> {
    return fetch("https://generativelanguage.googleapis.com/v1beta/models", {
      headers: {
        "x-goog-api-key": this.apiKey,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.models || !Array.isArray(data.models)) {
          throw new Error("Invalid response from Gemini models API");
        }
        return data.models.map((model: unknown) => (model as { name: string }).name);
      })
      .catch((error) => {
        console.error("Error fetching Gemini models:", error);
        return ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"]; // fallback
      });
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
    // Gemini doesn't have separate system messages, combine them
    const prompt = messages.map((m) => m.content).join("\n\n");

    const response = await this.client.models.generateContent({
      model: _model || this.model,
      contents: prompt,
    });

    return {
      content: response.text || "",
    };
  }
}
/**
 * Register Gemini provider
 */
BaseLLMProvider.register(
  ProviderType.GEMINI,
  {
    name: "Google Gemini",
    requiresAuth: true,
    icon: "gemini",
    description: "Google Gemini models",
    defaultModels: ["gemini-2.5-flash", "gemini-2.0-pro", "gemini-1.5-pro"],
  },
  (apiKey?: string) => {
    if (!apiKey) {
      throw new Error("Gemini API key is required");
    }
    return new GeminiProvider(apiKey);
  }
);
