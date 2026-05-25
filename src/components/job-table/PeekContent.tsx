import Link from "next/link";

import CompanyAvatar from "@/components/CompanyAvatar";
import { Icon } from "@/components/ui/Icon";

import { StatusBadge } from "./StatusControls";

import type { JobRecord, JobDetailsJSON } from "./types";

function PeekList({
  title,
  items,
}: {
  title: string;
  items: string[] | null | undefined;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h4
        className="text-xs font-semibold tracking-wide uppercase"
        style={{ color: "var(--color-agent-on-surface-variant)" }}
      >
        {title}
      </h4>
      <ul
        className="mt-2 space-y-1 text-sm"
        style={{ color: "var(--color-agent-on-surface)" }}
      >
        {items.slice(0, 4).map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span
              className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: "var(--color-agent-primary-fixed-dim)" }}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PeekContent({
  job,
  details,
  onClose,
}: {
  job: JobRecord;
  details: JobDetailsJSON | null;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <header
        className="flex flex-col gap-3 rounded-2xl p-4"
        style={{ background: "var(--color-agent-surface-container)" }}
      >
        <div className="flex items-center gap-4">
          <CompanyAvatar name={job.company?.name} size={56} />
          <div>
            <p
              className="text-lg font-semibold"
              style={{ color: "var(--color-agent-on-surface)" }}
            >
              {job.role}
            </p>
            <p
              className="text-sm"
              style={{ color: "var(--color-agent-on-surface-variant)" }}
            >
              {job.company?.name ?? "Unknown company"}
            </p>
            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 flex items-center gap-1 text-xs hover:underline"
                style={{ color: "var(--color-agent-primary)" }}
              >
                <Icon name="link" size={14} />
                <span>{job.url}</span>
              </a>
            )}
          </div>
          <div className="ml-auto">
            <StatusBadge status={job.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/job/${job.id}`}
            className="text-sm underline transition-opacity hover:opacity-70"
            style={{ color: "var(--color-agent-primary)" }}
            onClick={() => onClose()}
          >
            Edit details
          </Link>
          <Link
            href={`/resume/${job.id}`}
            className="text-sm underline transition-opacity hover:opacity-70"
            style={{ color: "var(--color-agent-primary)" }}
            onClick={() => onClose()}
          >
            Open resume
          </Link>
          <Link
            href={`/cover-letter/${job.id}`}
            className="text-sm underline transition-opacity hover:opacity-70"
            style={{ color: "var(--color-agent-primary)" }}
            onClick={() => onClose()}
          >
            Open cover letter
          </Link>
        </div>
      </header>

      <section>
        <h3
          className="text-xs font-semibold tracking-wide uppercase"
          style={{ color: "var(--color-agent-on-surface-variant)" }}
        >
          Description
        </h3>
        <p
          className="mt-2 text-sm whitespace-pre-line"
          style={{ color: "var(--color-agent-on-surface)" }}
        >
          {job.description}
        </p>
      </section>

      {details ? (
        <div className="grid gap-4 md:grid-cols-2">
          <PeekList
            title="Responsibilities"
            items={details.responsibilities.core_responsibilities}
          />
          <PeekList
            title="Must-have skills"
            items={details.requirements.primary_technologies}
          />
          <PeekList
            title="Nice-to-have"
            items={details.nice_to_have.domain_interest}
          />
          <PeekList title="Benefits" items={details.benefits.flexibility} />
        </div>
      ) : (
        <p
          className="text-sm"
          style={{ color: "var(--color-agent-on-surface-variant)" }}
        >
          Structured job details are not available for this entry.
        </p>
      )}
    </div>
  );
}
