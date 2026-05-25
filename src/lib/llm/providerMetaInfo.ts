import {
  OpenAIIcon,
  GeminiIcon,
  GrokIcon,
  OllamaIcon,
  PerplexityIcon,
  AnthropicIcon,
} from "@/components/icons";
import { ProviderMetadata, getAvailableProviders } from "@/lib/llm/providers";
import { ProviderType } from "@/types/llm";

export const PROVIDER_ICONS: Record<
  ProviderType,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  [ProviderType.OPENAI]: OpenAIIcon,
  [ProviderType.GEMINI]: GeminiIcon,
  [ProviderType.GROK]: GrokIcon,
  [ProviderType.OLLAMA]: OllamaIcon,
  [ProviderType.PERPLEXITY]: PerplexityIcon,
  [ProviderType.ANTHROPIC]: AnthropicIcon,
};

// Build provider info map
function buildProviderInfo(): Record<ProviderType, ProviderMetadata> {
  return getAvailableProviders().reduce(
    (acc, provider) => {
      acc[provider.type] = provider;
      return acc;
    },
    {} as Record<ProviderType, ProviderMetadata>
  );
}

export const PROVIDER_INFO = buildProviderInfo();
