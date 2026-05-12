import { createLogger } from "@/lib/logger";
import { ProviderType } from "@/types/llm";

import { LLMProvider } from "./LLMProvider";
import { OpenAICompatibleProvider } from "./openaiCompatibleProvider";

const logger = createLogger("OpenAI");

export class OpenAIProvider extends OpenAICompatibleProvider {
  public readonly providerType = ProviderType.OPENAI;

  constructor(apiKey: string) {
    super({ apiKey });
  }

  textGenModelRegex = /^gpt-(3\.5|4(o)?(\.\d+)?|5(o)?(\.\d+)?)(-(mini|nano))?$/;

  async fetchModels(): Promise<string[]> {
    try {
      logger.debug("Fetching models from OpenAI API");
      const response = await this.client.models.list();

      return response.data
        .map((model) => model.id)
        .filter(
          (id) =>
            this.textGenModelRegex.test(id) &&
            !id.includes("embedding") &&
            !id.includes("audio") &&
            !id.includes("vision") &&
            !id.includes("image")
        );
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
LLMProvider.register(
  ProviderType.OPENAI,
  {
    name: "OpenAI",
    requiresAuth: true,
    icon: "openai",
    description: "OpenAI GPT models",
  },
  (apiKey?: string) => {
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }
    return new OpenAIProvider(apiKey);
  }
);
