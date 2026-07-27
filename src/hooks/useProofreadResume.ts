import { useMutation } from "@tanstack/react-query";

import LLMService from "@/lib/llm/llmService";
import { useModelStore } from "@/store/modelStore";
import { LLMResult } from "@/types/llm";
import { ProofreadJSON } from "@/types/proofread";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

import { useProfileQuery } from "./useProfileQuery";

type Args = {
  resume: ResumeJSON;
  jobDetails?: JobDetailsJSON | null;
};

function useProofreadResume(
  options?: Omit<
    Parameters<typeof useMutation<LLMResult<ProofreadJSON>, Error, Args>>[0],
    "mutationFn"
  >
) {
  const activeModelPair = useModelStore((state) => state.activeModelPair);
  // The base profile powers the provenance categories (unsupported_addition,
  // altered_fact, dropped_detail). If it hasn't loaded yet, the mutation
  // still runs — the prompt treats a missing baseProfile as "skip the
  // provenance categories", not as an error.
  const { data: baseProfile } = useProfileQuery();

  return useMutation<LLMResult<ProofreadJSON>, Error, Args>({
    mutationFn: (data: Args): Promise<LLMResult<ProofreadJSON>> => {
      if (!activeModelPair) {
        return Promise.reject(new Error("No model selected"));
      }

      return LLMService.proofreadResume(
        data.resume,
        {
          jobDetails: data.jobDetails ?? null,
          baseProfile: baseProfile ?? null,
        },
        {
          provider: activeModelPair[0],
          model: activeModelPair[1],
        }
      );
    },
    ...options,
  });
}

export default useProofreadResume;
