"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/cn";

type AlertVariant = "error" | "warning" | "success" | "info";

interface AlertProps {
  children: ReactNode;
  variant?: AlertVariant;
  /** Called when dismiss button is clicked. If omitted, no dismiss button is shown. */
  onDismiss?: () => void;
  className?: string;
}

const variantStyles: Record<AlertVariant, string> = {
  error: "bg-agent-error-container text-agent-on-error-container",
  warning:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  success: "bg-agent-secondary-container text-agent-on-secondary-container",
  info: "bg-agent-primary-container text-agent-on-primary-container",
};

/**
 * Dismissible inline alert banner for feedback messages.
 *
 * @example
 * {error && (
 *   <Alert variant="error" onDismiss={clearError}>
 *     Error loading models: {error}
 *   </Alert>
 * )}
 */
export function Alert({
  children,
  variant = "info",
  onDismiss,
  className,
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "mb-6 flex items-center justify-between rounded-xl px-4 py-3 text-sm",
        variantStyles[variant],
        className
      )}
    >
      <span>{children}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="ml-4 shrink-0 underline hover:no-underline"
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
