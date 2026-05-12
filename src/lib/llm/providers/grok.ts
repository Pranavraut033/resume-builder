import { createLogger } from "@/lib/logger";
import { ProviderType } from "@/types/llm";

import { LLMProvider } from "./LLMProvider";
import { OpenAICompatibleProvider } from "./openaiCompatibleProvider";

const logger = createLogger("Grok");

export class GrokProvider extends OpenAICompatibleProvider {
  constructor(apiKey: string) {
    super({ apiKey, baseURL: "https://api.x.ai/v1" });
  }
  textGenModelRegex =
    /^grok-\d+((\-|\.)\d+)?(-fast|-mini)?((-non)?(-reasoning))?$/;

  async fetchModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list();
      const models = response.data
        .map((model) => model.id)
        .filter((id) => this.textGenModelRegex.test(id));

      return models;
    } catch (error) {
      logger.error("Error fetching models", { error });
      return ["grok-4-1-fast-reasoning", "grok-3-mini"]; // fallback
    }
  }

  protected getProviderName(): string {
    return "Grok";
  }
}
/**
 * Register Grok provider
 */
LLMProvider.register(
  ProviderType.GROK,
  {
    name: "Grok (X.AI)",
    requiresAuth: true,
    icon: "grok",
    description: "Grok models from X.AI",
  },
  (apiKey?: string) => {
    if (!apiKey) {
      throw new Error("Grok API key is required");
    }
    return new GrokProvider(apiKey);
  }
);
