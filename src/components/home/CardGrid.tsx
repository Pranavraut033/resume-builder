import { JobRecord } from "@/actions/job";
import CompanyAvatar from "@/components/CompanyAvatar";
import { Icon } from "@/components/ui/Icon";
import { formatTimestamp } from "@/lib";
import { JobStatus } from "@/types/job";

import { IconButton, IconLink } from "./Buttons";
import { StatusSelector, StatusBadge } from "./StatusControls";

export default function CardGrid({
  jobs,
  onPeek,
  onStatusChange,
  onDelete,
  statusLoadingId,
  deleteLoadingId,
}: {
  jobs: JobRecord[];
  onPeek: (job: JobRecord) => void;
  onStatusChange: (jobId: number, status: JobStatus) => Promise<void> | void;
  onDelete: (jobId: number) => Promise<void> | void;
  statusLoadingId: number | null;
  deleteLoadingId: number | null;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {jobs.map((job) => (
        <article
          key={job.id}
          onClick={() => onPeek(job)}
          className="cursor-pointer rounded-2xl p-4 transition-all hover:-translate-y-0.5"
          style={{
            background: "var(--color-agent-surface-lowest)",
            boxShadow: "var(--shadow-agent-card)",
            border: "1px solid var(--color-agent-outline-variant)",
          }}
        >
          <div className="flex items-start gap-3">
            <CompanyAvatar name={job.company?.name} size={48} />
            <div className="flex-1">
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--color-agent-on-surface)" }}
              >
                {job.company?.name ?? "Unknown"}
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--color-agent-on-surface-variant)" }}
              >
                {job.role}
              </p>
              {job.url && (
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 flex items-center gap-1 text-xs hover:underline"
                  style={{ color: "var(--color-agent-primary)" }}
                >
                  <Icon name="link" size={12} />
                  <span className="flex-1 truncate">Source</span>
                </a>
              )}
            </div>
            <StatusBadge status={job.status} />
          </div>
          <p
            className="mt-4 line-clamp-3 text-sm"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            {job.description}
          </p>
          <div
            className="mt-4 flex flex-wrap items-center gap-3"
            onClick={(event) => event.stopPropagation()}
          >
            <StatusSelector
              value={job.status}
              disabled={statusLoadingId === job.id}
              onChange={(nextStatus) => onStatusChange(job.id, nextStatus)}
            />
            <span
              className="text-xs"
              style={{ color: "var(--color-agent-outline)" }}
            >
              Updated {formatTimestamp(job.updatedAt)}
            </span>
          </div>
          <div
            className="mt-4 flex flex-wrap items-center gap-2"
            onClick={(event) => event.stopPropagation()}
          >
            <IconButton label="Peek job" onClick={() => onPeek(job)}>
              <Icon name="eye" size={18} />
            </IconButton>
            <IconLink href={`/job/${job.id}`} label="Edit job">
              <Icon name="edit" size={18} />
            </IconLink>
            <IconLink
              href={`/job/${job.id}?contentType=resume`}
              label="Open resume"
            >
              <Icon name="fileText" size={18} />
            </IconLink>
            <IconLink
              href={`/job/${job.id}?contentType=coverLetter`}
              label="Open cover letter"
            >
              <Icon name="fileText" size={18} className="opacity-80" />
            </IconLink>
            <IconButton
              label="Delete job"
              onClick={() => onDelete(job.id)}
              disabled={deleteLoadingId === job.id}
            >
              {deleteLoadingId === job.id ? (
                <Icon name="spinner" size={18} className="animate-spin" />
              ) : (
                <Icon name="trash" size={18} />
              )}
            </IconButton>
          </div>
        </article>
      ))}
    </div>
  );
}
