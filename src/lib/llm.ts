// LLM Provider Abstraction

import { LLMProvider, ResumePromptInput, CoverLetterPromptInput, Providers } from '@/types/llm';
import { getApiKey } from './keyStorage';
import { GeminiProvider } from './llm/providers/gemini';
import { GrokProvider } from './llm/providers/grok';
import { OllamaProvider } from './llm/providers/ollama';
import { OpenAIProvider } from './llm/providers/openai';
import { PerplexityProvider } from './llm/providers/perplexity';

// Provider Factory for managing instances
export class ProviderFactory {
  private static instances: Map<Providers, LLMProvider> = new Map();

  static async getInstance(providerName: Providers): Promise<LLMProvider | null> {
    const apiKey = providerName == 'ollama' ? null : await getApiKey(providerName);

    if (this.instances.has(providerName)) {
      return this.instances.get(providerName)!;
    }

    let instance = null;
    switch (providerName) {
      case 'openai':
        if (apiKey) instance = new OpenAIProvider(apiKey);
        break;
      case 'gemini':
        if (apiKey) instance = new GeminiProvider(apiKey);
        break;
      case 'grok':
        if (apiKey) instance = new GrokProvider(apiKey);
        break;
      case 'perplexity':
        if (apiKey) instance = new PerplexityProvider(apiKey);
        break;
      case 'ollama':
        instance = new OllamaProvider();
        break;
    }

    if (instance) {
      this.instances.set(providerName, instance);
    }

    return instance;
  }
}
