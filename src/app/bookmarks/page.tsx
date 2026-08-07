"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getAllJob, JobRecord } from "@/actions/job";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import useDeleteJob from "@/hooks/useDeleteJob";
import { useProfileQuery } from "@/hooks/useProfileQuery";
import { useProfileSelection } from "@/hooks/useProfileSelection";
import { createLogger } from "@/lib/logger";
import { useBookmarkQueueStore } from "@/store/bookmarkQueueStore";
import { useModelStore } from "@/store/modelStore";
import { JobDetailsSchema } from "@/types/resume";

const logger = createLogger("BookmarksPage");

function parseBookmarkDetails(
  job: JobRecord
): { jobTitle: string; companyName: string } | null {
  try {
    const details = JobDetailsSchema.parse(JSON.parse(job.jobDetailsJson));
    return {
      jobTitle: details.job.job_title || job.role,
      companyName: details.company.company_name,
    };
  } catch (error) {
    logger.error("Failed to parse bookmark job details", {
      jobId: job.id,
      error,
    });
    return null;
  }
}

function BookmarkTitle({ job }: { job: JobRecord }) {
  const details = parseBookmarkDetails(job);

  return (
    <div className="min-w-0">
      <p className="text-agent-on-surface truncate text-sm font-medium">
        {details?.jobTitle || job.role}
      </p>
      {details?.companyName && (
        <p className="text-agent-on-surface-variant truncate text-xs">
          {details.companyName}
        </p>
      )}
    </div>
  );
}

const QUEUE_STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  running: "Parsing…",
  error: "Failed",
};

export default function BookmarksPage() {
  const [urlInput, setUrlInput] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const { selectedProfileId } = useProfileSelection();
  const { data: profile } = useProfileQuery(selectedProfileId);
  const { activeModelPair } = useModelStore();
  const [currentProvider, currentModel] = activeModelPair ?? [];

  const deleteJob = useDeleteJob();

  const items = useBookmarkQueueStore((s) => s.items);
  const inFlight = items.filter((i) => i.status !== "done");

  const { data: jobList = [] } = useQuery({
    queryKey: ["jobs", selectedProfileId],
    queryFn: () => getAllJob(selectedProfileId),
  });

  const bookmarks = jobList.filter((job) => job.status === "BOOKMARKED");

  const handleAdd = () => {
    if (!currentModel || !currentProvider) {
      pushToast({
        title: "Model required",
        description: "Please select a model first.",
        variant: "error",
      });
      return;
    }

    if (!profile) {
      pushToast({
        title: "Profile unavailable",
        description: "Profile not loaded.",
        variant: "error",
      });
      return;
    }

    const urls = urlInput
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter(Boolean);

    if (urls.length === 0) return;

    const modelOptions = { model: currentModel, provider: currentProvider };

    for (const url of urls) {
      useBookmarkQueueStore.getState().enqueue(url, {
        modelOptions,
        profileId: selectedProfileId ?? undefined,
        onSaved: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
      });
    }

    setUrlInput("");
  };

  const handleDelete = (jobId: number) => {
    deleteJob.mutate(jobId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["jobs"] });
        pushToast({ title: "Bookmark deleted", variant: "success" });
      },
      onError: (error) => {
        pushToast({
          title: "Unable to delete bookmark",
          description: error instanceof Error ? error.message : undefined,
          variant: "error",
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--color-agent-on-surface)">
          Bookmarks
        </h1>
        <p className="text-agent-on-surface-variant mt-1 text-sm">
          Paste job posting URLs to save them for later — parsing happens in the
          background so you can keep pasting.
        </p>
      </div>

      <div className="border-agent-outline-variant bg-agent-surface-lowest rounded-2xl border p-5">
        <textarea
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          rows={3}
          placeholder="https://example.com/job-posting (one per line, or comma-separated)"
          className="border-agent-outline-variant placeholder:text-agent-on-surface-variant focus:border-agent-primary focus:ring-agent-primary w-full resize-none rounded-xl border bg-(--color-agent-surface-lowest) px-4 py-3 text-sm text-(--color-agent-on-surface) focus:ring-1 focus:outline-none"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!urlInput.trim()}
            className="bg-agent-primary rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>

      {inFlight.length > 0 && (
        <div className="space-y-2">
          <p className="text-agent-outline text-xs font-medium tracking-widest uppercase">
            In progress
          </p>
          {inFlight.map((item) => (
            <div
              key={item.id}
              className="border-agent-outline-variant bg-agent-surface-lowest flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-agent-on-surface truncate text-sm">
                  {item.url}
                </p>
                {item.status === "error" && item.error && (
                  <p className="text-xs text-red-500">{item.error}</p>
                )}
              </div>
              <span className="text-agent-on-surface-variant shrink-0 text-xs font-medium">
                {QUEUE_STATUS_LABEL[item.status]}
              </span>
              {item.status === "error" && (
                <button
                  type="button"
                  onClick={() =>
                    useBookmarkQueueStore.getState().retry(item.id)
                  }
                  className="text-agent-primary shrink-0 text-xs font-semibold hover:opacity-80"
                >
                  Retry
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-agent-outline text-xs font-medium tracking-widest uppercase">
          Saved
        </p>

        {bookmarks.length === 0 && inFlight.length === 0 ? (
          <div className="border-agent-outline-variant bg-agent-surface-lowest rounded-2xl border p-10 text-center">
            <p className="text-agent-on-surface-variant text-sm">
              No bookmarks yet. Paste a job URL above to get started.
            </p>
          </div>
        ) : (
          bookmarks.map((job) => (
            <div
              key={job.id}
              className="border-agent-outline-variant bg-agent-surface-lowest flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
            >
              <BookmarkTitle job={job} />
              <div className="flex shrink-0 items-center gap-3">
                {job.url && (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-agent-on-surface-variant hover:text-agent-primary text-xs font-medium"
                  >
                    <Icon name="link" size={14} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => router.push(`/job/new?bookmark=${job.id}`)}
                  className="bg-agent-primary rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                >
                  Start tracking
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(job.id)}
                  disabled={deleteJob.isPending}
                  className="text-agent-on-surface-variant rounded-lg px-2 py-1.5 text-xs font-medium hover:text-red-500 disabled:opacity-40"
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
