import { createLogger } from "@/lib/logger";
import { LLMProvider, ProviderType } from "@/types/llm";

import { OpenAICompatibleProvider } from "./openaiCompatibleProvider";

const logger = createLogger("Grok");

export class GrokProvider
  extends OpenAICompatibleProvider
  implements LLMProvider
{
  constructor(apiKey: string) {
    super({ apiKey, baseURL: "https://api.x.ai/v1" });
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

  protected getProviderName(): string {
    return "Grok";
  }
}
/**
 * Register Grok provider
 */
OpenAICompatibleProvider.register(
  ProviderType.GROK,
  {
    name: "Grok (X.AI)",
    requiresAuth: true,
    icon: "grok",
    description: "Grok models from X.AI",
    defaultModels: ["grok-4-1-fast-reasoning", "grok-3"],
  },
  (apiKey?: string) => {
    if (!apiKey) {
      throw new Error("Grok API key is required");
    }
    return new GrokProvider(apiKey);
  }
);
