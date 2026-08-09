import { useMutation } from "@tanstack/react-query";

import LLMService from "@/lib/llm/llmService";
import { useModelStore } from "@/store/modelStore";
import { GapAnalysisJSON } from "@/types/gapAnalysis";
import { LLMResult } from "@/types/llm";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

type Args = {
  resume: ResumeJSON;
  jobDetails?: JobDetailsJSON | null;
};

function useGapAnalysis(
  options?: Omit<
    Parameters<typeof useMutation<LLMResult<GapAnalysisJSON>, Error, Args>>[0],
    "mutationFn"
  >
) {
  const activeModelPair = useModelStore((state) => state.activeModelPair);

  return useMutation<LLMResult<GapAnalysisJSON>, Error, Args>({
    mutationFn: (data: Args): Promise<LLMResult<GapAnalysisJSON>> => {
      if (!activeModelPair) {
        return Promise.reject(new Error("No model selected"));
      }

      if (!data.jobDetails) {
        return Promise.reject(
          new Error("Job details are required for gap analysis")
        );
      }

      return LLMService.analyzeResumeGaps(data.resume, data.jobDetails, {
        provider: activeModelPair[0],
        model: activeModelPair[1],
      });
    },
    ...options,
  });
}

export default useGapAnalysis;
