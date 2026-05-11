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
        <h2 className="border-agent-primary text-agent-on-surface border-b-2 pb-2 text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <div className="flex gap-2">
          {actions}
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-agent-on-surface-variant hover:bg-agent-surface-lowest hover:text-agent-primary rounded-lg p-2 transition-colors"
              title="Edit section"
            >
              <Icon name="edit" size={16} />
            </button>
          )}
          {canDelete && onDelete && (
            <button
              onClick={onDelete}
              className="text-agent-on-surface-variant hover:bg-agent-error-container hover:text-agent-on-error rounded-lg p-2 transition-colors"
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
