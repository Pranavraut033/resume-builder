"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { deleteBookmarksOlderThan, getAllJob } from "@/actions/job";
import BookmarkCard from "@/components/bookmarks/BookmarkCard";
import BookmarkQueueStrip from "@/components/bookmarks/BookmarkQueueStrip";
import BookmarkToolbar from "@/components/bookmarks/BookmarkToolbar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useLLMPageChrome } from "@/contexts/LLMPageChromeContext";
import useDeleteJob from "@/hooks/useDeleteJob";
import { useProfileQuery } from "@/hooks/useProfileQuery";
import { useProfileSelection } from "@/hooks/useProfileSelection";
import { useBookmarkQueueStore } from "@/store/bookmarkQueueStore";
import { useModelStore } from "@/store/modelStore";
import { FitLevel } from "@/types/fitCheck";
import { JobDetailsSchema } from "@/types/resume";

const CLEANUP_DEFAULT_DAYS = 30;

export default function BookmarksPage() {
  useLLMPageChrome(true);

  const [urlInput, setUrlInput] = useState("");
  const [search, setSearch] = useState("");
  const [fitLevels, setFitLevels] = useState<FitLevel[]>([]);
  const [cleanupDays, setCleanupDays] = useState(CLEANUP_DEFAULT_DAYS);
  const [confirmingCleanup, setConfirmingCleanup] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

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

  const filteredBookmarks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bookmarks.filter((job) => {
      if (query) {
        let matchesQuery = job.role.toLowerCase().includes(query);
        if (!matchesQuery) {
          try {
            const details = JobDetailsSchema.parse(
              JSON.parse(job.jobDetailsJson)
            );
            matchesQuery =
              details.job.job_title?.toLowerCase().includes(query) ||
              details.company.company_name?.toLowerCase().includes(query);
          } catch {
            matchesQuery = false;
          }
        }
        if (!matchesQuery) return false;
      }
      if (fitLevels.length > 0) {
        if (!job.fitCheck?.contentJson) return false;
        try {
          const parsed = JSON.parse(job.fitCheck.contentJson);
          if (!fitLevels.includes(parsed.fit_level)) return false;
        } catch {
          return false;
        }
      }
      return true;
    });
  }, [bookmarks, search, fitLevels]);

  const cleanupCutoff = useMemo(
    () => Date.now() - cleanupDays * 86_400_000,
    [cleanupDays]
  );
  const cleanupCount = bookmarks.filter(
    (job) => new Date(job.createdAt).getTime() < cleanupCutoff
  ).length;

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

  const handleCleanup = async () => {
    setIsCleaningUp(true);
    try {
      const { count } = await deleteBookmarksOlderThan(
        cleanupDays,
        selectedProfileId
      );
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      pushToast({
        title: `Deleted ${count} old bookmark${count === 1 ? "" : "s"}`,
        variant: "success",
      });
    } catch (error) {
      pushToast({
        title: "Unable to clean up bookmarks",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setIsCleaningUp(false);
      setConfirmingCleanup(false);
    }
  };

  const toggleFitLevel = (level: FitLevel) => {
    setFitLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-(--color-agent-on-surface)">
            Bookmarks
          </h1>
          <p className="text-agent-on-surface-variant mt-1 text-sm">
            {bookmarks.length} saved
            {inFlight.length > 0 ? ` · ${inFlight.length} parsing` : ""} —
            pre-tracking jobs you might apply to.
          </p>
        </div>
      </div>

      <BookmarkQueueStrip items={inFlight} />

      <BookmarkToolbar
        urlInput={urlInput}
        onUrlInputChange={setUrlInput}
        onAdd={handleAdd}
        canAdd={!!urlInput.trim()}
        search={search}
        onSearchChange={setSearch}
        fitLevels={fitLevels}
        onToggleFitLevel={toggleFitLevel}
        cleanupDays={cleanupDays}
        onCleanupDaysChange={setCleanupDays}
        onCleanup={() => setConfirmingCleanup(true)}
        cleanupCount={cleanupCount}
      />

      <div className="space-y-3">
        {bookmarks.length === 0 ? (
          <div className="border-agent-outline-variant bg-agent-surface-lowest rounded-2xl border-2 border-dashed p-10 text-center">
            <Icon
              name="bookmark"
              size={32}
              className="text-agent-outline mx-auto"
            />
            <p className="text-agent-on-surface mt-4 text-sm font-semibold">
              No bookmarks yet
            </p>
            <p className="text-agent-on-surface-variant mt-1 text-sm">
              Paste a job URL above to save it for later.
            </p>
          </div>
        ) : filteredBookmarks.length === 0 ? (
          <div className="border-agent-outline-variant bg-agent-surface-lowest rounded-2xl border p-10 text-center">
            <p className="text-agent-on-surface-variant text-sm">
              No bookmarks match the current filters.
            </p>
          </div>
        ) : (
          filteredBookmarks.map((job) => (
            <BookmarkCard
              key={job.id}
              job={job}
              profile={profile}
              onDelete={handleDelete}
              isDeleting={deleteJob.isPending}
            />
          ))
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmingCleanup}
        title="Delete old bookmarks"
        message={`Delete ${cleanupCount} bookmark${cleanupCount === 1 ? "" : "s"} older than ${cleanupDays} days? This can't be undone.`}
        confirmLabel={isCleaningUp ? "Deleting…" : "Delete"}
        cancelLabel="Cancel"
        onConfirm={handleCleanup}
        onCancel={() => setConfirmingCleanup(false)}
      />
    </div>
  );
}
