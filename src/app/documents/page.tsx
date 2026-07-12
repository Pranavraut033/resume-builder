"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ColumnDef,
  FilterFn,
  SortingState,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { DocumentRecord, getAllDocuments } from "@/actions/job";
import CompanyAvatar from "@/components/CompanyAvatar";
import { StatusBadge } from "@/components/home/StatusControls";
import {
  Badge,
  FallbackState,
  Icon,
  PageHeader,
  SegmentedControl,
} from "@/components/ui";
import { useProfileSelection } from "@/hooks/useProfileSelection";
import { formatTimestamp } from "@/lib";
import cn from "@/lib/cn";
import { isJobStatus } from "@/types/job";

type DocType = DocumentRecord["docType"];

const globalDocFilter: FilterFn<DocumentRecord> = (
  row,
  _columnId,
  filterValue
) => {
  const search = String(filterValue).toLowerCase().trim();
  if (!search) return true;
  const doc = row.original;
  return `${doc.role} ${doc.companyName}`.toLowerCase().includes(search);
};

function AtsScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return <Badge>No analysis</Badge>;
  }
  const variant = score >= 80 ? "success" : score >= 60 ? "warning" : "error";
  return <Badge variant={variant}>{Math.round(score)} / 100</Badge>;
}

export default function DocumentsPage() {
  const router = useRouter();
  const { selectedProfileId } = useProfileSelection();
  const [docType, setDocType] = useState<DocType>("resume");
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "updatedAt", desc: true },
  ]);

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", selectedProfileId],
    queryFn: () => getAllDocuments(selectedProfileId),
  });

  const resumeCount = useMemo(
    () => documents.filter((d) => d.docType === "resume").length,
    [documents]
  );
  const coverLetterCount = documents.length - resumeCount;

  const rows = useMemo(
    () => documents.filter((d) => d.docType === docType),
    [documents, docType]
  );

  const columns = useMemo<ColumnDef<DocumentRecord>[]>(() => {
    const base: ColumnDef<DocumentRecord>[] = [
      {
        accessorKey: "role",
        header: "Job",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <CompanyAvatar name={row.original.companyName} size={32} />
            <div className="min-w-0">
              <p className="text-agent-on-surface truncate text-sm font-medium">
                {row.original.role}
              </p>
              <p className="text-agent-on-surface-variant truncate text-xs">
                {row.original.companyName}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            status={
              isJobStatus(row.original.status) ? row.original.status : "DRAFT"
            }
          />
        ),
      },
    ];

    if (docType === "resume") {
      base.push({
        accessorKey: "atsScore",
        header: "ATS Score",
        cell: ({ row }) => <AtsScoreBadge score={row.original.atsScore} />,
      });
    }

    base.push(
      {
        accessorKey: "updatedAt",
        header: "Last updated",
        cell: ({ row }) => (
          <span className="text-agent-on-surface-variant text-sm">
            {formatTimestamp(row.original.updatedAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-agent-primary inline-flex items-center gap-1 text-sm font-medium">
            Open
            <Icon name="arrowRight" size={14} />
          </span>
        ),
      }
    );

    return base;
  }, [docType]);

  const hideBelowMdIds = new Set(["status", "updatedAt"]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: globalDocFilter,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Every resume and cover letter you've generated, in one place."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          ariaLabel="Document type"
          value={docType}
          onChange={setDocType}
          options={[
            { value: "resume", label: `Resumes (${resumeCount})` },
            {
              value: "coverLetter",
              label: `Cover Letters (${coverLetterCount})`,
            },
          ]}
        />
        <label className="border-agent-outline-variant bg-agent-surface-low flex items-center gap-2 rounded-2xl border px-4 py-2.5 sm:w-72">
          <Icon
            name="search"
            size={16}
            className="text-agent-on-surface-variant shrink-0"
          />
          <span className="sr-only">Search documents</span>
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search role or company"
            className="text-agent-on-surface w-full border-none bg-transparent text-sm focus:outline-none"
          />
        </label>
      </div>

      {rows.length === 0 ? (
        <FallbackState
          iconName="fileText"
          title={
            docType === "resume" ? "No resumes yet" : "No cover letters yet"
          }
          description="Documents appear here once you generate a resume or cover letter for a job."
        />
      ) : (
        <div className="border-agent-outline-variant bg-agent-surface-lowest shadow-agent-card overflow-x-auto rounded-2xl border">
          <table className="w-full text-left text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr
                  key={hg.id}
                  className="border-agent-outline-variant border-b"
                >
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className={cn(
                        "text-agent-on-surface-variant px-4 py-3 text-xs font-semibold tracking-wide uppercase",
                        hideBelowMdIds.has(header.column.id) &&
                          "hidden md:table-cell"
                      )}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          disabled={!header.column.getCanSort()}
                          className="inline-flex items-center gap-1 transition-opacity hover:opacity-70 disabled:cursor-default"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{ asc: "↑", desc: "↓" }[
                            header.column.getIsSorted() as string
                          ] || null}
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
                  onClick={() => router.push(`/job/${row.original.jobId}`)}
                  className="border-agent-outline-variant hover:bg-agent-surface-low cursor-pointer border-t transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-4 py-3 align-middle",
                        hideBelowMdIds.has(cell.column.id) &&
                          "hidden md:table-cell"
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
