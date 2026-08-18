import { useMutation } from "@tanstack/react-query";

import LLMService from "@/lib/llm/llmService";
import { useModelStore } from "@/store/modelStore";
import { DocumentAnalysisJSON } from "@/types/documentAnalysis";
import { LLMResult } from "@/types/llm";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

import { useProfileQuery } from "./useProfileQuery";

type Args = {
  resume: ResumeJSON;
  jobDetails?: JobDetailsJSON | null;
};

/**
 * "What do I change in the document?" — merges the old useProofreadResume +
 * ATS-analysis flows (see domainOps.analyzeDocument). `jobDetails` is
 * required by the underlying prompt (unlike the old proofread hook's
 * optional one) — see DocumentAnalysisPromptInput's doc comment — so a
 * missing one rejects at call time rather than silently running without it.
 */
function useDeepAnalysis(
  options?: Omit<
    Parameters<
      typeof useMutation<LLMResult<DocumentAnalysisJSON>, Error, Args>
    >[0],
    "mutationFn"
  >
) {
  const activeModelPair = useModelStore((state) => state.activeModelPair);
  // The base profile powers the provenance finding kind
  // (unsupported_addition/altered_fact/dropped_detail), full-mode only. If
  // it hasn't loaded yet, the mutation still runs — the prompt treats a
  // missing baseProfile as "skip the provenance kind", not as an error.
  const { data: baseProfile } = useProfileQuery();

  return useMutation<LLMResult<DocumentAnalysisJSON>, Error, Args>({
    mutationFn: (data: Args): Promise<LLMResult<DocumentAnalysisJSON>> => {
      if (!activeModelPair) {
        return Promise.reject(new Error("No model selected"));
      }

      if (!data.jobDetails) {
        return Promise.reject(
          new Error("Job details are required for deep analysis")
        );
      }

      return LLMService.analyzeDocument(
        data.resume,
        data.jobDetails,
        {
          provider: activeModelPair[0],
          model: activeModelPair[1],
        },
        baseProfile ?? null
      );
    },
    ...options,
  });
}

export default useDeepAnalysis;
