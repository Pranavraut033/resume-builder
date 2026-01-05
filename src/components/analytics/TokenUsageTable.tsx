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
    return <span className="ml-1 text-gray-400">⇅</span>;
  }
  return <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>;
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
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th
              scope="col"
              className="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
              className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
            >
              Provider
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
            >
              Model
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400"
            >
              Purpose
            </th>
            <th
              scope="col"
              className="cursor-pointer px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
              className="cursor-pointer px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
              className="cursor-pointer px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
        <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
          {sortedRecords.map((record) => (
            <tr
              key={record.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100">
                {formatDate(record.createdAt)}
              </td>
              <td className="px-6 py-4 text-sm whitespace-nowrap">
                <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {record.provider}
                </span>
              </td>
              <td className="max-w-xs truncate px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                {record.model}
              </td>
              <td className="px-6 py-4 text-sm whitespace-nowrap">
                <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
                  {formatPurpose(record.purpose)}
                </span>
              </td>
              <td className="px-6 py-4 text-right text-sm whitespace-nowrap text-gray-900 dark:text-gray-100">
                {record.inputTokens.toLocaleString()}
              </td>
              <td className="px-6 py-4 text-right text-sm whitespace-nowrap text-gray-900 dark:text-gray-100">
                {record.outputTokens.toLocaleString()}
              </td>
              <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap text-gray-900 dark:text-gray-100">
                {(record.inputTokens + record.outputTokens).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
