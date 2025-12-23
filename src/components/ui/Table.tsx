"use client";

import React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

interface TableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  className?: string;
}

export function Table<T>({ data, columns, className = '' }: TableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className={`bg-blocky-100 text-blocky-900 rounded-block-lg shadow-block p-block overflow-auto ${className}`}>
      <table className="w-full table-auto">
        <thead>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {table.getHeaderGroups().map((hg: any) => (
            <tr key={hg.id}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {hg.headers.map((header: any) => (
                <th
                  key={header.id}
                  className="text-left text-sm font-medium text-blocky-900 px-3 py-2"
                >
                  {header.isPlaceholder ? null : (
                    <div>{flexRender(header.column.columnDef.header, header.getContext())}</div>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {table.getRowModel().rows.map((row: any) => (
            <tr key={row.id} className="odd:bg-blocky-100">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {row.getVisibleCells().map((cell: any) => (
                <td key={cell.id} className="px-3 py-2 text-sm align-top text-blocky-900">
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

export default Table;
