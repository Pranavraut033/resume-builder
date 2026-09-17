/**
 * Custom OpenAI-compatible provider — one user-configurable slot for any
 * endpoint that speaks the OpenAI chat-completions API but isn't one of the
 * ten built-ins (NVIDIA NIM, Qwen/DashScope, Cloudflare Workers AI, a
 * self-hosted vLLM, …).
 *
 * The base URL is user-supplied at runtime, so unlike every other provider it
 * is read from storage at construction time rather than baked into the class.
 */
import { getCustomBaseUrl } from "@/lib/llm/customEndpoint";
import { createLogger } from "@/lib/logger";
import { LLMProvider } from "@pranavraut033/llm-core";
import { OpenAICompatibleProvider } from "@pranavraut033/llm-core/providers/openai-compatible";

declare module "@pranavraut033/llm-core" {
  interface ProviderIdRegistry {
    custom: true;
  }
}

const logger = createLogger("CustomProvider");

export class CustomProvider extends OpenAICompatibleProvider {
  public readonly providerType = "custom" as const;

  constructor(apiKey: string, baseURL: string) {
    super({ apiKey, baseURL });
  }

  /**
   * No fallback list: for a built-in provider a stale hardcoded list is a
   * reasonable guess, but here the endpoint is arbitrary and any guess would
   * be wrong. An empty list surfaces as "not connected" in Settings, which is
   * the honest answer when we can't reach the endpoint.
   */
  async fetchModels(): Promise<string[]> {
    try {
      const client = await this.getClient();
      const response = await client.models.list();
      return response.data.map((model) => model.id);
    } catch (error) {
      logger.error("Error fetching models from custom endpoint", { error });
      return [];
    }
  }

  protected getProviderName(): string {
    return "Custom endpoint";
  }
}

LLMProvider.register(
  "custom",
  {
    name: "Custom (OpenAI-compatible)",
    requiresAuth: true,
    description:
      "Any OpenAI-compatible endpoint — NVIDIA NIM, Qwen, Cloudflare AI, self-hosted.",
    requiredPeerDependency: "openai",
  },
  (apiKey?: string) => {
    if (!apiKey) {
      throw new Error("An API key is required for the custom endpoint");
    }
    const baseURL = getCustomBaseUrl();
    if (!baseURL) {
      throw new Error(
        "No base URL configured for the custom endpoint — set one in Settings"
      );
    }
    return new CustomProvider(apiKey, baseURL);
  }
);
