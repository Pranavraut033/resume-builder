import {
  RefetchOptions,
  useQuery,
  UseQueryResult,
} from "@tanstack/react-query";

import {
  getCoverLetterByJobId,
  getJobContext,
  getResumeByJobId,
} from "@/actions/job";
import { getProfile } from "@/actions/profile";

import { useProfileQuery } from "./useProfile";

export type EditorContextData = {
  coverLetter: Awaited<ReturnType<typeof getCoverLetterByJobId>>;
  job: Awaited<ReturnType<typeof getJobContext>>;
  profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>;
  resume: Awaited<ReturnType<typeof getResumeByJobId>>;
};

export function useCoverLetterByJobId(jobId: number) {
  return useQuery({
    queryKey: ["coverLetter", jobId],
    queryFn: () => getCoverLetterByJobId(jobId),
    enabled: typeof jobId === "number" && !isNaN(jobId),
  });
}

export function useJobContextQuery(jobId: number) {
  return useQuery({
    queryKey: ["jobContext", jobId],
    queryFn: () => getJobContext(jobId),
    enabled: typeof jobId === "number" && !isNaN(jobId),
  });
}

export function useResumeByJobId(jobId: number) {
  return useQuery({
    queryKey: ["resume", jobId],
    queryFn: () => getResumeByJobId(jobId),
    enabled: typeof jobId === "number" && !isNaN(jobId),
  });
}

export function useEditorContextQuery(
  jobId: number,
  initialData?: EditorContextData
): Pick<
  UseQueryResult<EditorContextData | undefined>,
  | "data"
  | "error"
  | "isError"
  | "isLoading"
  | "isFetching"
  | "isSuccess"
  | "status"
> & {
  refetch: (
    options?: RefetchOptions,
    ...fields: (keyof EditorContextData)[]
  ) => void;
} {
  const coverQ = useCoverLetterByJobId(jobId);
  const jobQ = useJobContextQuery(jobId);
  const profileQ = useProfileQuery();
  const resumeQ = useResumeByJobId(jobId);

  const queries = [coverQ, jobQ, profileQ, resumeQ] as const;

  const isLoading = queries.some((q) => q.isLoading);
  const isFetching = queries.some((q) => q.isFetching);
  const isError = queries.some((q) => q.isError);
  const error = (queries.find((q) => q.error)?.error ?? null) as Error | null;

  const allDataLoaded =
    coverQ.data !== undefined &&
    jobQ.data !== undefined &&
    profileQ.data !== undefined &&
    resumeQ.data !== undefined;

  const data: EditorContextData | undefined = allDataLoaded
    ? {
        coverLetter: coverQ.data!,
        job: jobQ.data!,
        profile: profileQ.data!,
        resume: resumeQ.data!,
      }
    : initialData;

  const isSuccess = allDataLoaded && !isError;

  const status = isLoading
    ? ("pending" as const)
    : isError
      ? ("error" as const)
      : ("success" as const);

  const refetch = async (
    options?: RefetchOptions,
    ...fields: (keyof EditorContextData)[]
  ) => {
    const fieldToQueryMap: Record<
      keyof EditorContextData,
      () => Promise<unknown>
    > = {
      coverLetter: () => coverQ.refetch(options),
      job: () => jobQ.refetch(options),
      profile: () => profileQ.refetch(options),
      resume: () => resumeQ.refetch(options),
    };

    await Promise.all(fields.map((field) => fieldToQueryMap[field]()));
  };

  return {
    data,
    error,
    isError,
    isLoading,
    isFetching,
    isSuccess,
    status,
    refetch,
  };
}
