/**
 * Token Usage Table Component
 * Displays raw token usage records in a sortable table
 */

import { useState } from "react";

import { TokenUsageRecord } from "@/actions/tokenUsage";

interface TokenUsageTableProps {
  records: TokenUsageRecord[];
}

type SortField = "createdAt" | "inputTokens" | "outputTokens" | "totalTokens";
type SortDirection = "asc" | "desc";

const SortIcon = ({
  field,
  sortField,
  sortDirection,
}: {
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
}) => {
  if (sortField !== field) {
    return <span className="text-agent-on-surface-variant ml-1">⇅</span>;
  }
  return (
    <span className="text-agent-on-surface ml-1">
      {sortDirection === "asc" ? "↑" : "↓"}
    </span>
  );
};

export default function TokenUsageTable({ records }: TokenUsageTableProps) {
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedRecords = [...records].sort((a, b) => {
    let aValue: number | string;
    let bValue: number | string;

    if (sortField === "totalTokens") {
      aValue = a.inputTokens + a.outputTokens;
      bValue = b.inputTokens + b.outputTokens;
    } else if (sortField === "createdAt") {
      aValue = a.createdAt;
      bValue = b.createdAt;
    } else {
      aValue = a[sortField];
      bValue = b[sortField];
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPurpose = (purpose: string) => {
    return purpose
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <div className="overflow-x-auto">
      <table className="divide-agent-outline-variant min-w-full divide-y">
        <thead className="bg-agent-surface-container">
          <tr>
            <th
              scope="col"
              className="text-agent-on-surface-variant hover:text-agent-on-surface cursor-pointer px-6 py-3 text-left text-xs font-semibold tracking-wider uppercase"
              onClick={() => handleSort("createdAt")}
            >
              Date{" "}
              <SortIcon
                field="createdAt"
                sortField={sortField}
                sortDirection={sortDirection}
              />
            </th>
            <th
              scope="col"
              className="text-agent-on-surface-variant px-6 py-3 text-left text-xs font-semibold tracking-wider uppercase"
            >
              Provider
            </th>
            <th
              scope="col"
              className="text-agent-on-surface-variant px-6 py-3 text-left text-xs font-semibold tracking-wider uppercase"
            >
              Model
            </th>
            <th
              scope="col"
              className="text-agent-on-surface-variant px-6 py-3 text-left text-xs font-semibold tracking-wider uppercase"
            >
              Purpose
            </th>
            <th
              scope="col"
              className="text-agent-on-surface-variant hover:text-agent-on-surface cursor-pointer px-6 py-3 text-right text-xs font-semibold tracking-wider uppercase"
              onClick={() => handleSort("inputTokens")}
            >
              Input{" "}
              <SortIcon
                field="inputTokens"
                sortField={sortField}
                sortDirection={sortDirection}
              />
            </th>
            <th
              scope="col"
              className="text-agent-on-surface-variant hover:text-agent-on-surface cursor-pointer px-6 py-3 text-right text-xs font-semibold tracking-wider uppercase"
              onClick={() => handleSort("outputTokens")}
            >
              Output{" "}
              <SortIcon
                field="outputTokens"
                sortField={sortField}
                sortDirection={sortDirection}
              />
            </th>
            <th
              scope="col"
              className="text-agent-on-surface-variant hover:text-agent-on-surface cursor-pointer px-6 py-3 text-right text-xs font-semibold tracking-wider uppercase"
              onClick={() => handleSort("totalTokens")}
            >
              Total{" "}
              <SortIcon
                field="totalTokens"
                sortField={sortField}
                sortDirection={sortDirection}
              />
            </th>
          </tr>
        </thead>
        <tbody className="divide-agent-outline-variant bg-agent-surface divide-y">
          {sortedRecords.map((record) => (
            <tr key={record.id} className="hover:bg-agent-surface-low">
              <td className="text-agent-on-surface px-6 py-4 text-sm whitespace-nowrap">
                {formatDate(record.createdAt)}
              </td>
              <td className="px-6 py-4 text-sm whitespace-nowrap">
                <span className="bg-agent-surface-high text-agent-on-surface inline-flex rounded-full px-2 py-1 text-xs font-semibold">
                  {record.provider}
                </span>
              </td>
              <td className="text-agent-on-surface max-w-xs truncate px-6 py-4 text-sm">
                {record.model}
              </td>
              <td className="px-6 py-4 text-sm whitespace-nowrap">
                <span className="bg-agent-surface-high text-agent-on-surface inline-flex rounded-full px-2 py-1 text-xs font-semibold">
                  {formatPurpose(record.purpose)}
                </span>
              </td>
              <td className="text-agent-on-surface px-6 py-4 text-right text-sm whitespace-nowrap">
                {record.inputTokens.toLocaleString()}
              </td>
              <td className="text-agent-on-surface px-6 py-4 text-right text-sm whitespace-nowrap">
                {record.outputTokens.toLocaleString()}
              </td>
              <td className="text-agent-on-surface px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                {(record.inputTokens + record.outputTokens).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
