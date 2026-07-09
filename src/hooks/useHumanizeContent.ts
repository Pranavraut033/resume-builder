import { useMutation } from "@tanstack/react-query";

import LLMService from "@/lib/llm/llmService";
import { useModelStore } from "@/store/modelStore";
import { HumanizerJSON } from "@/types/humanizer";
import { LLMResult } from "@/types/llm";

type Args = { text: string };

function useHumanizeContent(
  options?: Omit<
    Parameters<typeof useMutation<LLMResult<HumanizerJSON>, Error, Args>>[0],
    "mutationFn"
  >
) {
  const activeModelPair = useModelStore((state) => state.activeModelPair);

  return useMutation<LLMResult<HumanizerJSON>, Error, Args>({
    mutationFn: (data: Args): Promise<LLMResult<HumanizerJSON>> => {
      if (!activeModelPair) {
        return Promise.reject(new Error("No model selected"));
      }

      if (!data.text.trim()) {
        return Promise.reject(new Error("Nothing to humanize"));
      }

      return LLMService.humanizeContent(data.text, {
        provider: activeModelPair[0],
        model: activeModelPair[1],
      });
    },
    ...options,
  });
}

export default useHumanizeContent;
