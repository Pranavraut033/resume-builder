import { useMutation } from "@tanstack/react-query";

import LLMService from "@/lib/llm/llmService";
import { useModelStore } from "@/store/modelStore";
import { FitCheckJSON } from "@/types/fitCheck";
import { LLMResult } from "@/types/llm";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

type Args = {
  resume: ResumeJSON;
  jobDetails?: JobDetailsJSON | null;
};

/**
 * "Should I apply, and what's blocking me?" — see domainOps.analyzeFit.
 */
function useFitCheck(
  options?: Omit<
    Parameters<typeof useMutation<LLMResult<FitCheckJSON>, Error, Args>>[0],
    "mutationFn"
  >
) {
  const activeModelPair = useModelStore((state) => state.activeModelPair);

  return useMutation<LLMResult<FitCheckJSON>, Error, Args>({
    mutationFn: (data: Args): Promise<LLMResult<FitCheckJSON>> => {
      if (!activeModelPair) {
        return Promise.reject(new Error("No model selected"));
      }

      if (!data.jobDetails) {
        return Promise.reject(
          new Error("Job details are required for fit check")
        );
      }

      return LLMService.analyzeFit(data.resume, data.jobDetails, {
        provider: activeModelPair[0],
        model: activeModelPair[1],
      });
    },
    ...options,
  });
}

export default useFitCheck;
