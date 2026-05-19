"use client";

import { Job, Company } from "@prisma/client";
import {
  ColumnDef,
  FilterFn,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";

import { deleteJob, updateJobStatus } from "@/actions/job";
import CompanyAvatar from "@/components/CompanyAvatar";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { JOB_STATUSES, JobStatus, isJobStatus } from "@/types/job";
import { JobDetailsJSON } from "@/types/resume";

import type { Table as ReactTableType } from "@tanstack/react-table";

type PopulatedJob = Job & { company: Company | null };

type JobRecord = Omit<PopulatedJob, "status"> & { status: JobStatus };

type ViewMode = "card" | "table";

const STATUS_BADGE_STYLES: Record<JobStatus, React.CSSProperties> = {
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

const globalJobFilter: FilterFn<JobRecord> = (row, _columnId, filterValue) => {
  const search = String(filterValue).toLowerCase().trim();
  if (!search) return true;
  const job = row.original;
  const haystack = [
    job.company?.name ?? "",
    job.role,
    job.status,
    job.company?.industry ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(search);
};

function formatStatus(status: JobStatus) {
  return `${status.charAt(0)}${status.slice(1).toLowerCase()}`;
}

function formatTimestamp(value: string | Date) {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function parseJobDetails(raw: string | null): JobDetailsJSON | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as JobDetailsJSON;
  } catch (_error) {
    return null;
  }
}

export default function JobTableClient({ jobs }: { jobs: PopulatedJob[] }) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [statusLoadingId, setStatusLoadingId] = useState<number | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);
  const [peekJob, setPeekJob] = useState<JobRecord | null>(null);
  const [peekDetails, setPeekDetails] = useState<JobDetailsJSON | null>(null);
  const [isPeekOpen, setIsPeekOpen] = useState(false);
  const [jobItems, setJobItems] = useState<JobRecord[]>(() =>
    jobs.map((job) => ({
      ...job,
      status: isJobStatus(job.status) ? job.status : "DRAFT",
    }))
  );

  useEffect(() => {
    setJobItems(
      jobs.map((job) => ({
        ...job,
        status: isJobStatus(job.status) ? job.status : "DRAFT",
      }))
    );
  }, [jobs]);

  const handleStatusChange = useCallback(
    async (jobId: number, nextStatus: JobStatus) => {
      const previousStatus =
        jobItems.find((job) => job.id === jobId)?.status ?? nextStatus;
      if (previousStatus === nextStatus) return;

      setStatusLoadingId(jobId);
      setJobItems((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, status: nextStatus } : job
        )
      );

      try {
        await updateJobStatus(jobId, nextStatus);
        pushToast({ title: "Status updated", variant: "success" });
        router.refresh();
      } catch (error) {
        setJobItems((prev) =>
          prev.map((job) =>
            job.id === jobId ? { ...job, status: previousStatus } : job
          )
        );
        pushToast({
          title: "Unable to update status",
          description:
            error instanceof Error ? error.message : "Unexpected error",
          variant: "error",
        });
      } finally {
        setStatusLoadingId(null);
      }
    },
    [jobItems, pushToast, router]
  );

  const handleDeleteJob = useCallback(
    async (jobId: number) => {
      const confirmed = window.confirm(
        "Delete this job? This will remove the resume and cover letter."
      );
      if (!confirmed) return;

      const snapshot = jobItems;
      setDeleteLoadingId(jobId);
      setJobItems((prev) => prev.filter((job) => job.id !== jobId));

      try {
        await deleteJob(jobId);
        pushToast({ title: "Job deleted", variant: "success" });
        router.refresh();
      } catch (error) {
        setJobItems(snapshot);
        pushToast({
          title: "Unable to delete job",
          description:
            error instanceof Error ? error.message : "Unexpected error",
          variant: "error",
        });
      } finally {
        setDeleteLoadingId(null);
      }
    },
    [jobItems, pushToast, router]
  );

  const openPeek = useCallback((job: JobRecord) => {
    setPeekJob(job);
    setPeekDetails(parseJobDetails(job.jobDetailsJson));
    setIsPeekOpen(true);
  }, []);

  const closePeek = useCallback(() => {
    setIsPeekOpen(false);
    setPeekJob(null);
    setPeekDetails(null);
  }, []);

  const columns = useMemo<ColumnDef<JobRecord>[]>(
    () => [
      {
        accessorKey: "companyName",
        header: "Company",
        accessorFn: (row) => row.company?.name ?? "Unknown",
        cell: ({ row }) => <CompanyCell job={row.original} />,
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span
              className="text-sm font-medium"
              style={{ color: "var(--color-agent-on-surface)" }}
            >
              {row.original.role}
            </span>
            <span
              className="text-xs"
              style={{ color: "var(--color-agent-on-surface-variant)" }}
            >
              {row.original.company?.industry ?? "—"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <div
            className="flex items-center gap-3"
            onClick={(event) => event.stopPropagation()}
          >
            <StatusBadge status={row.original.status} />
            <StatusSelector
              value={row.original.status}
              disabled={statusLoadingId === row.original.id}
              onChange={(value) =>
                void handleStatusChange(row.original.id, value)
              }
            />
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Updated",
        cell: ({ row }) => (
          <span
            className="text-sm"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            {formatTimestamp(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div
            className="flex items-center gap-2"
            onClick={(event) => event.stopPropagation()}
          >
            <IconButton label="Peek job" onClick={() => openPeek(row.original)}>
              <Icon name="eye" size={18} />
            </IconButton>
            <IconLink href={`/job/${row.original.id}`} label="Edit job">
              <Icon name="edit" size={18} />
            </IconLink>
            <IconLink href={`/resume/${row.original.id}`} label="Open resume">
              <Icon name="fileText" size={18} />
            </IconLink>
            <IconLink
              href={`/cover-letter/${row.original.id}`}
              label="Open cover letter"
            >
              <Icon name="fileText" size={18} className="opacity-80" />
            </IconLink>
            <IconButton
              label="Delete job"
              onClick={() => handleDeleteJob(row.original.id)}
              disabled={deleteLoadingId === row.original.id}
            >
              {deleteLoadingId === row.original.id ? (
                <Icon name="spinner" size={18} className="animate-spin" />
              ) : (
                <Icon name="trash" size={18} />
              )}
            </IconButton>
          </div>
        ),
      },
    ],
    [
      deleteLoadingId,
      handleDeleteJob,
      handleStatusChange,
      openPeek,
      statusLoadingId,
    ]
  );

  const table = useReactTable({
    data: jobItems,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: globalJobFilter,
  });

  const visibleJobs = table.getRowModel().rows.map((row) => row.original);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1">
          <SearchInput value={globalFilter} onChange={setGlobalFilter} />
        </div>
        <ViewToggle value={viewMode} onChange={setViewMode} />
      </div>

      {visibleJobs.length === 0 ? (
        <EmptyState />
      ) : viewMode === "card" ? (
        <CardGrid
          jobs={visibleJobs}
          onPeek={openPeek}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteJob}
          statusLoadingId={statusLoadingId}
          deleteLoadingId={deleteLoadingId}
        />
      ) : (
        <JobsTable table={table} onRowClick={openPeek} />
      )}

      <Modal
        isOpen={isPeekOpen}
        onClose={closePeek}
        title="Job overview"
        size="lg"
      >
        {peekJob ? (
          <PeekContent
            job={peekJob}
            details={peekDetails}
            onClose={closePeek}
          />
        ) : null}
      </Modal>
    </div>
  );
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label
      className="flex items-center gap-3 rounded-2xl px-4 py-2.5 shadow-sm transition-all focus-within:ring-2"
      style={{
        background: "var(--color-agent-surface-low)",
        border: "1px solid var(--color-agent-outline-variant)",
      }}
    >
      <Icon
        name="search"
        size={18}
        className="shrink-0"
        color="var(--color-agent-on-surface-variant)"
      />
      <span className="sr-only">Search jobs</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search company, role, or status"
        className="flex-1 border-none bg-transparent text-sm focus:outline-none"
        style={{
          color: "var(--color-agent-on-surface)",
        }}
      />
    </label>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  const options: Array<{
    value: ViewMode;
    label: string;
    icon: "grid" | "list";
  }> = [
    { value: "card", label: "Card", icon: "grid" },
    { value: "table", label: "Table", icon: "list" },
  ];

  return (
    <div
      className="inline-flex rounded-2xl p-1 shadow-sm"
      style={{
        background: "var(--color-agent-surface-low)",
        border: "1px solid var(--color-agent-outline-variant)",
      }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all"
          style={
            value === option.value
              ? {
                  background:
                    "linear-gradient(135deg, var(--color-agent-primary), var(--color-agent-primary-container))",
                  color: "var(--color-agent-on-primary)",
                }
              : {
                  color: "var(--color-agent-on-surface-variant)",
                }
          }
          aria-pressed={value === option.value}
        >
          <Icon name={option.icon} size={16} />
          {option.label}
        </button>
      ))}
    </div>
  );
}

function CardGrid({
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
  console.log(jobs);

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
                  <span className="line-clamp-1">{job.url.length}</span>
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
              Updated {formatTimestamp(job.createdAt)}
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
            <IconLink href={`/job/${job.id}/resume`} label="Open resume">
              <Icon name="fileText" size={18} />
            </IconLink>
            <IconLink
              href={`/job/${job.id}/cover-letter`}
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

function JobsTable({
  table,
  onRowClick,
}: {
  table: ReactTableType<JobRecord>;
  onRowClick: (job: JobRecord) => void;
}) {
  return (
    <div
      className="overflow-x-auto rounded-2xl"
      style={{
        background: "var(--color-agent-surface-lowest)",
        boxShadow: "var(--shadow-agent-card)",
        border: "1px solid var(--color-agent-outline-variant)",
      }}
    >
      <table className="w-full text-left text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr
              key={hg.id}
              style={{
                borderBottom: "1px solid var(--color-agent-outline-variant)",
              }}
            >
              {hg.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-xs font-semibold tracking-wide uppercase"
                  style={{ color: "var(--color-agent-on-surface-variant)" }}
                >
                  {header.isPlaceholder ? null : (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 transition-opacity hover:opacity-70"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {{
                        asc: "↑",
                        desc: "↓",
                      }[header.column.getIsSorted() as string] || null}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick(row.original)}
              className="cursor-pointer transition-colors"
              style={{
                borderTop: "1px solid var(--color-agent-outline-variant)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  "var(--color-agent-surface-low)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3 align-top">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompanyCell({ job }: { job: JobRecord }) {
  return (
    <div className="flex items-center gap-3">
      <CompanyAvatar name={job.company?.name} size={40} />
      <div>
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
          {job.company?.locationCity ?? "—"}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <span
      className="rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase"
      style={STATUS_BADGE_STYLES[status]}
    >
      {formatStatus(status)}
    </span>
  );
}

function StatusSelector({
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
      {JOB_STATUSES.map((status) => (
        <option key={status} value={status}>
          {formatStatus(status)}
        </option>
      ))}
    </select>
  );
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      className="rounded-xl p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        background: "var(--color-agent-surface-container)",
        color: "var(--color-agent-on-surface-variant)",
      }}
      aria-label={label}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function IconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      onClick={(event) => event.stopPropagation()}
      className="rounded-xl p-2 transition-colors"
      style={{
        background: "var(--color-agent-surface-container)",
        color: "var(--color-agent-on-surface-variant)",
      }}
    >
      {children}
    </Link>
  );
}

function PeekContent({
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

function EmptyState() {
  return (
    <div
      className="rounded-2xl border-2 border-dashed p-10 text-center"
      style={{
        borderColor: "var(--color-agent-outline-variant)",
        background: "var(--color-agent-surface-low)",
      }}
    >
      <Icon
        name="fileText"
        size={32}
        className="mx-auto"
        color="var(--color-agent-outline)"
      />
      <p
        className="mt-4 text-lg font-semibold"
        style={{ color: "var(--color-agent-on-surface)" }}
      >
        Your journey starts here
      </p>
      <p
        className="mt-1 text-sm"
        style={{ color: "var(--color-agent-on-surface-variant)" }}
      >
        Add a job to start generating tailored resumes and cover letters.
      </p>
      <Link
        href="/job/new"
        className="bg-blocky-500 font-blocky text-blocky-900 shadow-block hover:bg-blocky-500/90 focus-visible:ring-blocky-500 mt-4 inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-2 transition focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Create your first job
      </Link>
    </div>
  );
}
