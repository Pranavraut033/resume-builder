import { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Slot for badges or inline metadata next to the title */
  badge?: ReactNode;
  /** Slot for action buttons aligned to the right */
  actions?: ReactNode;
  className?: string;
}

/**
 * Consistent page-level heading used across all top-level routes.
 * Renders a large title with optional badge, subtitle, and action buttons.
 *
 * @example
 * <PageHeader
 *   title="Settings"
 *   description="Configure your intelligent drafting engine."
 *   badge={<Badge icon={<LockIcon />}>Stored Locally & Encrypted</Badge>}
 * />
 */
export function PageHeader({
  title,
  description,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-3">
            <h1 className="text-agent-on-surface text-2xl font-bold tracking-tight">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-agent-on-surface-variant text-sm">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}
