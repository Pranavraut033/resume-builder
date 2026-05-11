import { ReactNode } from "react";

import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  /** Optional icon rendered before the label */
  icon?: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    "bg-agent-surface-low text-agent-on-surface-variant border-agent-outline-variant",
  success:
    "bg-agent-secondary-container text-agent-on-secondary-container border-transparent",
  warning:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  error:
    "bg-agent-error-container text-agent-on-error-container border-transparent",
  info: "bg-agent-primary-container text-agent-on-primary-container border-transparent",
};

/**
 * Inline pill badge for status indicators, labels, and metadata.
 *
 * @example
 * <Badge icon={<LockIcon size={11} />}>Stored Locally & Encrypted</Badge>
 *
 * @example
 * <Badge variant="success">Connected</Badge>
 */
export function Badge({
  children,
  variant = "default",
  icon,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {icon && <span className="flex shrink-0 items-center">{icon}</span>}
      {children}
    </span>
  );
}
