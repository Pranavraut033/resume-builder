/**
 * Managed (paid) LLM provider — proxies through the self-hosted LiteLLM
 * gateway in `server/llm-gateway/`. Users without their own API key buy
 * prepaid credits and paste the resulting virtual key here exactly like a
 * BYOK key; billing/budget enforcement is entirely server-side in LiteLLM.
 */
import { LLMProvider } from "@pranavraut033/llm-core";
import { OpenAICompatibleProvider } from "@pranavraut033/llm-core/providers/openai-compatible";

import { createLogger } from "@/lib/logger";

declare module "@pranavraut033/llm-core" {
  interface ProviderIdRegistry {
    managed: true;
  }
}

const logger = createLogger("ManagedProvider");

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_LLM_GATEWAY_URL ?? "http://localhost:4000/v1";

export class ManagedProvider extends OpenAICompatibleProvider {
  public readonly providerType = "managed" as const;

  constructor(apiKey: string) {
    super({ apiKey, baseURL: GATEWAY_URL });
  }

  async fetchModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list();
      return response.data.map((model) => model.id);
    } catch (error) {
      logger.error("Error fetching managed models", { error });
      return ["gpt-4o", "claude-3-5-sonnet", "gemini-2.0-flash"];
    }
  }
}

LLMProvider.register(
  "managed",
  {
    name: "Resume Builder Cloud",
    requiresAuth: true,
    description:
      "No API key needed — buy prepaid credits and use any supported model.",
  },
  (apiKey?: string) => {
    if (!apiKey) {
      throw new Error("Resume Builder Cloud key is required");
    }
    return new ManagedProvider(apiKey);
  }
);
