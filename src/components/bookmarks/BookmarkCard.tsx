"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { JobRecord, saveFitCheckForJob } from "@/actions/job";
import CompanyAvatar from "@/components/CompanyAvatar";
import { FIT_LEVEL_META } from "@/components/job-v2/FitCheckDrawer";
import { FitCheckResult } from "@/components/job-v2/FitCheckResult";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import useFitCheck from "@/hooks/useFitCheck";
import { useProfileSelection } from "@/hooks/useProfileSelection";
import { formatTimestamp } from "@/lib";
import { createLogger } from "@/lib/logger";
import { FitCheckJSON, FitCheckSchema } from "@/types/fitCheck";
import { JobDetailsSchema, ResumeJSON } from "@/types/resume";

const logger = createLogger("BookmarkCard");

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

// FitCheck's `v: 2` schema deliberately rejects a pre-format blob — same
// "predates the new format, re-run it" contract used everywhere else this
// data is read (see safeParseFitCheck in src/lib/db/job.ts).
function parseBookmarkFitCheck(job: JobRecord) {
  if (!job.fitCheck?.contentJson) return null;
  const result = FitCheckSchema.safeParse(JSON.parse(job.fitCheck.contentJson));
  return result.success ? result.data : null;
}

function summarizeFitCheck(fitCheck: FitCheckJSON): string {
  const blocking = fitCheck.gaps.filter(
    (g) => g.severity === "blocking"
  ).length;
  const parts = [
    `${blocking} blocking gap${blocking === 1 ? "" : "s"}`,
    `${fitCheck.knockout_risks.length} risk${fitCheck.knockout_risks.length === 1 ? "" : "s"}`,
    `${fitCheck.strengths.length} strength${fitCheck.strengths.length === 1 ? "" : "s"}`,
  ];
  return parts.join(" · ");
}

interface BookmarkCardProps {
  job: JobRecord;
  profile: (ResumeJSON & { label: string }) | null | undefined;
  onDelete: (jobId: number) => void;
  isDeleting: boolean;
}

export default function BookmarkCard({
  job,
  profile,
  onDelete,
  isDeleting,
}: BookmarkCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedProfileId } = useProfileSelection();
  const { pushToast } = useToast();
  const [expanded, setExpanded] = useState(false);

  const details = parseBookmarkDetails(job);
  const fitCheck = parseBookmarkFitCheck(job);

  const { mutate: checkFit, status } = useFitCheck({
    onSuccess: async (result) => {
      await saveFitCheckForJob(job.id, result.result);
      queryClient.invalidateQueries({ queryKey: ["jobs", selectedProfileId] });
      setExpanded(true);
    },
    onError: (error) => {
      pushToast({
        title: "Fit check failed",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    },
  });

  const handleCheckFit = () => {
    if (!profile) return;
    const jobDetails = JobDetailsSchema.parse(JSON.parse(job.jobDetailsJson));
    checkFit({ resume: profile, jobDetails });
  };

  const isChecking = status === "pending";

  return (
    <div className="border-agent-outline-variant bg-agent-surface-lowest overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3 p-4">
        <CompanyAvatar
          name={details?.companyName ?? job.company?.name}
          size={44}
        />

        <div className="min-w-0 flex-1">
          <p className="text-agent-on-surface truncate text-sm font-semibold">
            {details?.jobTitle || job.role}
          </p>
          <p className="text-agent-on-surface-variant truncate text-xs">
            {details?.companyName || job.company?.name}
          </p>
          <div className="text-agent-outline mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            <span>Saved {formatTimestamp(job.createdAt)}</span>
            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-agent-primary inline-flex items-center gap-1 font-medium hover:underline"
              >
                <Icon name="link" size={11} />
                Source
              </a>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => router.push(`/job/new?bookmark=${job.id}`)}
            className="bg-agent-primary rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
          >
            Start tracking
          </button>
          <button
            type="button"
            onClick={() => onDelete(job.id)}
            disabled={isDeleting}
            aria-label="Delete bookmark"
            className="text-agent-on-surface-variant rounded-lg p-1.5 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
          >
            <Icon name="trash" size={14} />
          </button>
        </div>
      </div>

      {/* Fit strip — badge + one-line summary, expands to the full result */}
      <div className="border-agent-outline-variant bg-agent-surface-low border-t px-4 py-2.5">
        {fitCheck ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center gap-2 text-left"
          >
            <span
              className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${FIT_LEVEL_META[fitCheck.fit_level].classes}`}
            >
              {FIT_LEVEL_META[fitCheck.fit_level].label}
            </span>
            <span className="text-agent-on-surface-variant min-w-0 flex-1 truncate text-xs">
              {summarizeFitCheck(fitCheck)}
            </span>
            <Icon
              name="chevronDown"
              size={14}
              className={`text-agent-on-surface-variant shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCheckFit}
            disabled={isChecking || !profile}
            className="text-agent-on-surface-variant hover:text-agent-primary flex items-center gap-1.5 text-xs font-medium disabled:opacity-40"
          >
            <Icon
              name={isChecking ? "spinner" : "target"}
              size={13}
              className={isChecking ? "animate-spin" : undefined}
            />
            {isChecking ? "Checking fit…" : "Check fit"}
          </button>
        )}
      </div>

      {expanded && fitCheck && (
        <div className="border-agent-outline-variant border-t p-4">
          <FitCheckResult result={fitCheck} />
          <button
            type="button"
            onClick={handleCheckFit}
            disabled={isChecking || !profile}
            className="border-agent-outline-variant text-agent-on-surface-variant hover:bg-agent-surface-container mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon
              name={isChecking ? "spinner" : "refreshCw"}
              className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`}
            />
            Re-run
          </button>
        </div>
      )}

      {job.description && !fitCheck && (
        <p className="text-agent-on-surface-variant border-agent-outline-variant line-clamp-2 border-t px-4 py-2.5 text-xs">
          {job.description}
        </p>
      )}
    </div>
  );
}
