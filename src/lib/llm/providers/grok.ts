import OpenAI from "openai";
import {
  LLMProvider,
  ResumePromptInput,
  CoverLetterPromptInput,
} from "@/types/llm";
import { ResumeJSON } from "@/types/resume";
import { BaseLLMProvider } from "./baseProvider";
import { createLogger } from "@/lib/logger";

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
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("No response from Grok");

      return JSON.parse(content) as ResumeJSON;
    } catch (e: any) {
      if (e.message && e.message.includes("JSON")) {
        throw new Error("Invalid JSON response from Grok");
      }
      throw new Error("Grok generateResume failed: " + e.message);
    }
  }

  async generateCoverLetter(input: CoverLetterPromptInput): Promise<string> {
    const prompt = this.generateCoverLetterPrompt(input);

    const response = await this.client.chat.completions.create({
      model: input.model || "grok-4-1-fast-reasoning",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
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
}
