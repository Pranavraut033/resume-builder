import React from "react";

import { formatStatus } from "@/lib";
import { JOB_STATUSES, type JobStatus } from "@/types/job";

export function StatusBadge({ status }: { status: JobStatus }) {
  const STATUS_BADGE_STYLES: Record<JobStatus, React.CSSProperties> = {
    BOOKMARKED: {
      background: "var(--color-agent-surface-container)",
      color: "var(--color-agent-on-surface-variant)",
      borderColor: "var(--color-agent-outline-variant)",
    },
    DRAFT: { background: "#f1f5f9", color: "#475569", borderColor: "#cbd5e1" },
    APPLIED: {
      background: "var(--color-agent-secondary-container)",
      color: "var(--color-agent-on-secondary-container)",
      borderColor: "var(--color-agent-outline-variant)",
    },
    INTERVIEW: {
      background: "#fef3c7",
      color: "#92400e",
      borderColor: "#fcd34d",
    },
    REJECTED: {
      background: "var(--color-agent-error-container)",
      color: "var(--color-agent-on-error-container)",
      borderColor: "#fca5a5",
    },
    OFFER: {
      background: "var(--color-agent-tertiary-fixed)",
      color: "var(--color-agent-on-tertiary-fixed)",
      borderColor: "var(--color-agent-tertiary-fixed-dim)",
    },
  };

  return (
    <span
      className="rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase"
      style={STATUS_BADGE_STYLES[status]}
    >
      {formatStatus(status)}
    </span>
  );
}

export function StatusSelector({
  value,
  onChange,
  disabled,
}: {
  value: JobStatus;
  onChange: (value: JobStatus) => Promise<void> | void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => void onChange(event.target.value as JobStatus)}
      className="rounded-xl px-3 py-1.5 text-xs font-semibold tracking-wide uppercase focus:ring-2 focus:outline-none"
      style={{
        background: "var(--color-agent-surface-container)",
        color: "var(--color-agent-on-surface)",
        border: "1px solid var(--color-agent-outline-variant)",
      }}
      aria-label="Update job status"
      onClick={(event) => event.stopPropagation()}
    >
      {JOB_STATUSES.filter((status) => status !== "BOOKMARKED").map(
        (status) => (
          <option key={status} value={status}>
            {formatStatus(status)}
          </option>
        )
      )}
    </select>
  );
}
