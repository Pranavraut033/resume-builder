import { createLogger } from "@/lib/logger";
import { LLMProvider, ProviderType } from "@/types/llm";

import { OpenAICompatibleProvider } from "./openaiCompatibleProvider";

const logger = createLogger("OpenAI");

export class OpenAIProvider
  extends OpenAICompatibleProvider
  implements LLMProvider
{
  constructor(apiKey: string) {
    super({ apiKey });
  }

  async fetchModels(): Promise<string[]> {
    try {
      logger.debug("Fetching models from OpenAI API");
      const response = await this.client.models.list();
      return response.data
        .map((model) => model.id)
        .filter((id) => id.includes("gpt"));
    } catch (error) {
      logger.error("Error fetching models", { error });
      return ["gpt-4o", "gpt-3.5-turbo"]; // fallback
    }
  }

  protected getProviderName(): string {
    return "OpenAI";
  }
}

/**
 * Register OpenAI provider
 */
OpenAICompatibleProvider.register(
  ProviderType.OPENAI,
  {
    name: "OpenAI",
    requiresAuth: true,
    icon: "openai",
    description: "OpenAI GPT models",
    defaultModels: ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  (apiKey?: string) => {
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }
    return new OpenAIProvider(apiKey);
  }
);
