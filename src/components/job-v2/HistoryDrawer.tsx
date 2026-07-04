"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getResumeSnapshots, restoreResumeSnapshot } from "@/actions/job";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useJobPageContext } from "@/contexts/JobPageContext";
import cn from "@/lib/cn";

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * HistoryDrawer — slides in from the right, listing persisted resume
 * versions (ResumeSnapshot rows created on every save). Separate from the
 * in-memory undo/redo in ResumeHistory, which doesn't survive a reload.
 */
export function HistoryDrawer({ open, onClose }: HistoryDrawerProps) {
  const { job, updateResumeState } = useJobPageContext();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [pendingRestoreId, setPendingRestoreId] = useState<number | null>(null);

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["resumeSnapshots", job.id],
    queryFn: () => getResumeSnapshots(job.id),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleRestore = async (snapshotId: number) => {
    setPendingRestoreId(null);
    setRestoringId(snapshotId);
    try {
      const restored = await restoreResumeSnapshot(job.id, snapshotId);
      updateResumeState(restored, "Restored version");
      queryClient.invalidateQueries({ queryKey: ["resumeSnapshots", job.id] });
      pushToast({ title: "Version restored", variant: "success" });
      onClose();
    } catch (err) {
      pushToast({
        title: "Restore failed",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <>
      {open && (
        <div
          className="absolute inset-0 z-30 bg-black/10 backdrop-blur-[1px]"
          onClick={onClose}
          aria-hidden
        />
      )}

      <div
        className={cn(
          "border-agent-outline-variant bg-agent-surface-lowest shadow-agent-modal absolute top-0 right-0 z-40 flex h-full w-96 flex-col overflow-hidden border-l transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!open}
      >
        <div className="border-agent-outline-variant flex items-center gap-2 border-b px-4 py-3">
          <Icon name="history" className="text-agent-primary h-4 w-4" />
          <h2 className="text-agent-on-surface flex-1 text-sm font-semibold">
            Version History
          </h2>
          <button
            onClick={onClose}
            className="text-agent-on-surface-variant hover:bg-agent-surface-container flex h-7 w-7 items-center justify-center rounded-md transition-colors"
            aria-label="Close version history drawer"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="text-agent-on-surface-variant flex items-center justify-center py-10 text-sm">
              <Icon name="spinner" className="mr-2 h-4 w-4 animate-spin" />
              Loading versions…
            </div>
          ) : snapshots.length === 0 ? (
            <div className="text-agent-on-surface-variant px-2 py-10 text-center text-sm">
              No versions yet — versions are saved automatically each time you
              save.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {snapshots.map((snapshot) => (
                <li
                  key={snapshot.id}
                  className="border-agent-outline-variant flex items-center gap-2 rounded-lg border px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-agent-on-surface truncate text-sm font-medium">
                      {snapshot.label}
                    </p>
                    <p className="text-agent-on-surface-variant text-xs">
                      {new Date(snapshot.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setPendingRestoreId(snapshot.id)}
                    disabled={restoringId !== null}
                    className="text-agent-primary hover:bg-agent-primary/10 flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {restoringId === snapshot.id ? (
                      <Icon
                        name="spinner"
                        className="h-3.5 w-3.5 animate-spin"
                      />
                    ) : (
                      "Restore"
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={pendingRestoreId !== null}
        title="Restore this version?"
        message="Your current resume will be saved as a version before restoring, so you can undo this if needed."
        confirmLabel="Restore"
        onConfirm={() => pendingRestoreId && handleRestore(pendingRestoreId)}
        onCancel={() => setPendingRestoreId(null)}
      />
    </>
  );
}
