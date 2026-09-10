"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  ColumnDef,
  FilterFn,
  SortingState,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  deleteJob,
  JobRecord,
  setJobHidden,
  updateJobStatus,
} from "@/actions/job";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { formatTimestamp } from "@/lib";
import logger from "@/lib/logger";
import { isJobStatus, JobStatus } from "@/types/job";
import { JobDetailsJSON, JobDetailsSchema } from "@/types/resume";

import { IconButton } from "./Buttons";
import CardGrid from "./CardGrid";
import CompanyCell from "./CompanyCell";
import EmptyState from "./EmptyState";
import FilterBar, {
  DEFAULT_FILTERS,
  JobFilters,
  matchesFilters,
} from "./FilterBar";
import JobsTable from "./JobsTable";
import PeekContent from "./PeekContent";
import SearchInput from "./SearchInput";
import { StatusBadge, StatusSelector } from "./StatusControls";
import ViewToggle from "./ViewToggle";

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

export type ViewMode = "card" | "table";
type Props = {
  jobs: JobRecord[];
};
const jobDetailsCache = new Map<number, JobDetailsJSON>();

const JobTableClient: React.FC<Props> = ({ jobs }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [statusLoadingId, setStatusLoadingId] = useState<number | null>(null);
  const [hideLoadingId, setHideLoadingId] = useState<number | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
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

  const handleDeleteJob = useCallback(async (jobId: number) => {
    // keep existing semantics but open confirm modal instead
    setPendingDeleteId(jobId);
  }, []);

  const handleToggleHidden = useCallback(
    async (jobId: number) => {
      const job = jobItems.find((j) => j.id === jobId);
      if (!job) return;
      const nextHidden = !job.hiddenAt;

      setHideLoadingId(jobId);
      setJobItems((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, hiddenAt: nextHidden ? new Date() : null }
            : j
        )
      );

      try {
        await setJobHidden(jobId, nextHidden);
        // The optimistic update above is only ever this component's state —
        // invalidate the underlying query too, or a background refetch that
        // was already in flight can land after us and clobber it with the
        // pre-mutation data (the useEffect below resyncs jobItems from the
        // `jobs` prop on every reference change).
        queryClient.invalidateQueries({ queryKey: ["jobs"] });
        pushToast({
          title: nextHidden ? "Job hidden" : "Job unhidden",
          variant: "success",
        });
      } catch (error) {
        setJobItems((prev) => prev.map((j) => (j.id === jobId ? job : j)));
        pushToast({
          title: "Unable to update job",
          description:
            error instanceof Error ? error.message : "Unexpected error",
          variant: "error",
        });
      } finally {
        setHideLoadingId(null);
      }
    },
    [jobItems, pushToast, queryClient]
  );

  const confirmDeleteJob = useCallback(async () => {
    const jobId = pendingDeleteId;
    if (!jobId) return;

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
      setPendingDeleteId(null);
    }
  }, [pendingDeleteId, jobItems, pushToast, router]);

  const cancelDelete = useCallback(() => {
    setPendingDeleteId(null);
  }, []);

  const openPeek = useCallback(
    (job: JobRecord) => {
      setPeekJob(job);
      const cachedDetails = jobDetailsCache.get(job.id);
      if (cachedDetails) {
        setPeekDetails(cachedDetails);
      } else {
        try {
          const parsedDetails = JobDetailsSchema.parse(
            JSON.parse(job.jobDetailsJson)
          );
          setPeekDetails(parsedDetails);
          jobDetailsCache.set(job.id, parsedDetails);
        } catch (error) {
          pushToast({
            title: "Failed to load job details",
            description:
              error instanceof Error ? error.message : "Unexpected error",
            variant: "error",
          });
          logger.error("Peek", "Failed to parse job details for job", {
            jobId: job.id,
            error,
          });
          setPeekDetails(null);
        }
      }
      setIsPeekOpen(true);
    },
    [pushToast]
  );

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
            <IconButton
              label={row.original.hiddenAt ? "Unhide job" : "Hide job"}
              onClick={() => handleToggleHidden(row.original.id)}
              disabled={hideLoadingId === row.original.id}
            >
              {hideLoadingId === row.original.id ? (
                <Icon name="spinner" size={18} className="animate-spin" />
              ) : (
                <Icon name="eyeOff" size={18} />
              )}
            </IconButton>
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
      hideLoadingId,
      handleDeleteJob,
      handleToggleHidden,
      handleStatusChange,
      openPeek,
      statusLoadingId,
    ]
  );

  const filteredJobs = useMemo(
    () => jobItems.filter((job) => matchesFilters(job, filters)),
    [jobItems, filters]
  );

  const table = useReactTable({
    data: filteredJobs,
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

      <FilterBar filters={filters} onChange={setFilters} />

      {visibleJobs.length === 0 ? (
        <EmptyState />
      ) : viewMode === "card" ? (
        <CardGrid
          jobs={visibleJobs}
          onPeek={openPeek}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteJob}
          onToggleHidden={handleToggleHidden}
          statusLoadingId={statusLoadingId}
          deleteLoadingId={deleteLoadingId}
          hideLoadingId={hideLoadingId}
        />
      ) : (
        <JobsTable table={table} />
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
      <ConfirmDialog
        isOpen={pendingDeleteId !== null}
        title="Delete job"
        message={
          "Delete this job? This will remove the resume and cover letter."
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteJob}
        onCancel={cancelDelete}
      />
    </div>
  );
};

export default JobTableClient;
