"use client";

import React from "react";
import { flexRender } from "@tanstack/react-table";
import type { Table as ReactTableType } from "@tanstack/react-table";
import type { JobRecord } from "./types";

export default function JobsTable({
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
