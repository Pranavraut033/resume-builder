import {
  RefetchOptions,
  useQueries,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";

import { getCoverLetterByJobId, getJob, getResumeByJobId } from "@/actions/job";
import { getProfile, getProfileById } from "@/actions/profile";

type CoverLetter = Awaited<ReturnType<typeof getCoverLetterByJobId>>;
type Job = Awaited<ReturnType<typeof getJob>>;
type Resume = Awaited<ReturnType<typeof getResumeByJobId>>;
type Profile = NonNullable<Awaited<ReturnType<typeof getProfile>>>;

export type JobPageData = {
  coverLetter: CoverLetter;
  job: Job;
  profile: Profile;
  resume: Resume;
};

type JobPageField = keyof JobPageData;

type JobPageDataQueryResult = {
  data: JobPageData | undefined;
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  isFetching: boolean;
  isSuccess: boolean;
  status: "pending" | "error" | "success";
  refetch: (
    options?: RefetchOptions,
    ...fields: JobPageField[]
  ) => Promise<void>;
};

export function useJobPageDataQuery(
  jobId: number,
  initialData?: JobPageData
): JobPageDataQueryResult {
  const queryClient = useQueryClient();
  const isEnabled = Number.isFinite(jobId);
  const profileId = initialData?.job?.profileId ?? null;

  const combined = useQueries({
    queries: [
      {
        queryKey: ["coverLetter", jobId] as const,
        queryFn: () => getCoverLetterByJobId(jobId),
        enabled: isEnabled,
        initialData: initialData?.coverLetter,
      },
      {
        queryKey: ["job", jobId] as const,
        queryFn: () => getJob(jobId),
        enabled: isEnabled,
        initialData: initialData?.job,
      },
      {
        queryKey: ["profile", profileId ?? "default"] as const,
        queryFn: () => (profileId ? getProfileById(profileId) : getProfile()),
        initialData: initialData?.profile,
      },
      {
        queryKey: ["resume", jobId] as const,
        queryFn: () => getResumeByJobId(jobId),
        enabled: isEnabled,
        initialData: initialData?.resume,
      },
    ],
    combine: (results) => {
      const [coverLetterQuery, jobQuery, profileQuery, resumeQuery] = results;

      const isError = results.some((query) => query.isError);
      const isFetching = results.some((query) => query.isFetching);
      const isPending = results.some((query) => query.isPending);

      const error =
        (results.find((query) => query.error)?.error as
          | Error
          | null
          | undefined) ?? null;

      const hasAllData =
        coverLetterQuery.data !== undefined &&
        jobQuery.data !== undefined &&
        profileQuery.data !== undefined &&
        resumeQuery.data !== undefined;

      const data: JobPageData | undefined = hasAllData
        ? {
            coverLetter: coverLetterQuery.data,
            job: jobQuery.data,
            profile: profileQuery.data as Profile,
            resume: resumeQuery.data,
          }
        : initialData;

      const status: "pending" | "error" | "success" = isError
        ? "error"
        : isPending || !hasAllData
          ? "pending"
          : "success";

      return {
        data,
        error,
        isError,
        isLoading: status === "pending" && !data,
        isFetching,
        isSuccess: status === "success",
        status,
      };
    },
  });

  const refetch = useCallback(
    async (
      options?: RefetchOptions,
      ...fields: JobPageField[]
    ): Promise<void> => {
      const selectedFields = fields.length
        ? fields
        : (["coverLetter", "job", "profile", "resume"] as const);

      const queryKeyMap: Record<JobPageField, readonly unknown[]> = {
        coverLetter: ["coverLetter", jobId],
        job: ["job", jobId],
        profile: ["profile"],
        resume: ["resume", jobId],
      };

      await Promise.all(
        selectedFields.map((field) =>
          queryClient.refetchQueries({
            queryKey: queryKeyMap[field],
            ...options,
          })
        )
      );
    },
    [jobId, queryClient]
  );

  return {
    ...combined,
    refetch,
  };
}
