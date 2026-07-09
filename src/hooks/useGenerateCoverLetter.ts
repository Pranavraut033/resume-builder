import { useMutation } from "@tanstack/react-query";

import LLMService from "@/lib/llm/llmService";
import { useModelStore } from "@/store/modelStore";
import { LLMResult } from "@/types/llm";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

type Args = {
  resume?: ResumeJSON | null;
  jobData?: JobDetailsJSON | null;
  customInstructions?: string;
};

function useGenerateCoverLetter(
  options?: Omit<
    Parameters<typeof useMutation<LLMResult<string>, Error, Args>>[0],
    "mutationFn"
  >
) {
  const activeModelPair = useModelStore((state) => state.activeModelPair);

  return useMutation<LLMResult<string>, Error, Args>({
    mutationFn: (data: Args): Promise<LLMResult<string>> => {
      if (!activeModelPair) {
        return Promise.reject(new Error("No model selected"));
      }

      if (!data.resume || !data.jobData) {
        return Promise.reject(new Error("Missing resume or job data"));
      }

      return LLMService.generateCoverLetter(
        data.resume,
        data.jobData,
        { provider: activeModelPair[0], model: activeModelPair[1] },
        data.customInstructions
      );
    },
    ...options,
  });
}

export default useGenerateCoverLetter;
