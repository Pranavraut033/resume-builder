import { createLogger } from "@/lib/logger";
import { LLMProvider, ProviderType } from "@/types/llm";

import { OpenAICompatibleProvider } from "./openaiCompatibleProvider";

const logger = createLogger("Perplexity");

export class PerplexityProvider
  extends OpenAICompatibleProvider
  implements LLMProvider
{
  constructor(apiKey: string) {
    super({ apiKey, baseURL: "https://api.perplexity.ai" });
  }

  async fetchModels(): Promise<string[]> {
    try {
      logger.debug("Fetching models from Perplexity API");
      const response = await this.client.models.list();
      return response.data.map((model) => model.id);
    } catch (error) {
      logger.error("Error fetching models", { error });
      return ["sonar-pro", "sonar-reasoning-pro", "sonar"]; // fallback
    }
  }

  protected getProviderName(): string {
    return "Perplexity";
  }
}
/**
 * Register Perplexity provider
 */
OpenAICompatibleProvider.register(
  ProviderType.PERPLEXITY,
  {
    name: "Perplexity",
    requiresAuth: true,
    icon: "perplexity",
    description: "Perplexity AI models",
    defaultModels: ["sonar-pro", "sonar-reasoning-pro", "sonar"],
  },
  (apiKey?: string) => {
    if (!apiKey) {
      throw new Error("Perplexity API key is required");
    }
    return new PerplexityProvider(apiKey);
  }
);
