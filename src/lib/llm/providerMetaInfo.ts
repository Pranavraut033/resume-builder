import {
  OpenAIIcon,
  GeminiIcon,
  GrokIcon,
  OllamaIcon,
  PerplexityIcon,
  AnthropicIcon,
  CloudIcon,
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
  [ProviderType.MANAGED]: CloudIcon,
  // ponytail: no dedicated brand icon yet, generic cloud icon as placeholder
  [ProviderType.GROQ]: CloudIcon,
  [ProviderType.DEEPSEEK]: CloudIcon,
  [ProviderType.MISTRAL]: CloudIcon,
  [ProviderType.OPENROUTER]: CloudIcon,
};

// Build provider info map
function buildProviderInfo(): Record<ProviderType, ProviderMetadata> {
  return getAvailableProviders().reduce(
    (acc, provider) => {
      // Only the 11 registered providers (10 builtins + managed) are ever
      // registered (see providers/factory.ts), so narrowing the package's
      // open ProviderId back to our closed enum is safe.
      acc[provider.type as ProviderType] = provider;
      return acc;
    },
    {} as Record<ProviderType, ProviderMetadata>
  );
}

export const PROVIDER_INFO = buildProviderInfo();
