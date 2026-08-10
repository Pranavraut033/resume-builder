// Resolves per-model reasoningEffort/temperature/topP preferences from the
// model-selector store, the same 3-line lookup `ResumeChatBot` does
// internally (src/lib/llm/chat-bot/Chatbot.ts's private resolve* methods) —
// that logic is private to the chatbot class, so it's replicated here rather
// than imported, per this cluster's plan.

import { useModelStore } from "@/store/modelStore";
import { LLMGenerationOptions, ProviderType } from "@/types/llm";

export function resolveInterviewLLMOptions(
  provider: ProviderType,
  model: string
): LLMGenerationOptions {
  const store = useModelStore.getState();
  const reasoningEffort =
    store.getReasoningEffort(provider, model) ?? undefined;
  const temperature = store.getTemperature(provider, model) ?? undefined;
  const topP = store.getTopP(provider, model) ?? undefined;

  return {
    model,
    ...(reasoningEffort ? { reasoningEffort } : {}),
    ...(temperature !== undefined ? { temperature } : {}),
    ...(topP !== undefined ? { topP } : {}),
  };
}
