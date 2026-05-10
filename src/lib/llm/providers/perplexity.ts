import { createLogger } from "@/lib/logger";
import { LLMProvider, ProviderType } from "@/types/llm";

import { OpenAICompatibleProvider } from "./openaiCompatibleProvider";

const logger = createLogger("Perplexity");

export class PerplexityProvider
  extends OpenAICompatibleProvider
  implements LLMProvider
{
  private apiKey: string;

  constructor(apiKey: string) {
    super({ apiKey, baseURL: "https://api.perplexity.ai" });
    this.apiKey = apiKey;
  }

  async fetchModels(): Promise<string[]> {
    console.log("abc");

    logger.debug("Fetching models from Perplexity API");
    const response = await fetch("https://api.perplexity.ai/v1/models", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok)
      throw new Error(
        `HTTP ${response.status}: ${data.error?.message || response.statusText || "Failed to fetch models"}`
      );
    if (!data.data || !Array.isArray(data.data))
      throw new Error("Invalid response from Perplexity models API");
    return data.data.map((model: { id: string }) => model.id);
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
