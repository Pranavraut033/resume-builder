"use client";

import { cn } from "@/lib/cn";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Accessible on/off toggle switch (aria role="switch").
 *
 * @example
 * <Toggle
 *   checked={telemetry}
 *   onChange={setTelemetry}
 *   label="Anonymous Telemetry"
 * />
 */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  className,
}: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "bg-agent-primary focus:ring-agent-primary"
          : "bg-agent-surface-highest focus:ring-agent-primary",
        className
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-5.5" : "translate-x-1"
        )}
      />
    </button>
  );
}
