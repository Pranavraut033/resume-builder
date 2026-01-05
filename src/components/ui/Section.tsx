"use client";

import { ReactNode } from "react";

import { Icon } from "./Icon";

interface SectionProps {
  title: string;
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  className?: string;
  actions?: ReactNode;
}

export function Section({
  title,
  children,
  onEdit,
  onDelete,
  canDelete = false,
  className = "",
  actions,
}: SectionProps) {
  return (
    <div className={`mb-8 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="border-b-2 border-blue-500 pb-1 text-2xl font-bold text-gray-900 dark:text-white">
          {title}
        </h2>
        <div className="flex gap-2">
          {actions}
          {onEdit && (
            <button
              onClick={onEdit}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
              title="Edit section"
            >
              <Icon name="edit" size={16} />
            </button>
          )}
          {canDelete && onDelete && (
            <button
              onClick={onDelete}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Delete section"
            >
              <Icon name="trash" size={16} />
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
