"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible group label */
  ariaLabel?: string;
  className?: string;
}

/**
 * Inline segmented tab control for mutually exclusive options.
 * Commonly used for theme selectors, view toggles, etc.
 *
 * @example
 * <SegmentedControl
 *   ariaLabel="Theme"
 *   value={theme}
 *   onChange={setTheme}
 *   options={[
 *     { value: "light", label: "Light", icon: <SunIcon /> },
 *     { value: "dark",  label: "Dark",  icon: <MoonIcon /> },
 *     { value: "system", label: "System", icon: <MonitorIcon /> },
 *   ]}
 * />
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "bg-agent-surface-container inline-flex gap-1 rounded-xl p-1",
        className
      )}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={isActive}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
              isActive
                ? "bg-agent-surface-lowest text-agent-on-surface shadow-(--shadow-agent-card)"
                : "text-agent-on-surface-variant hover:text-agent-on-surface bg-transparent"
            )}
          >
            {opt.icon && (
              <span className="flex shrink-0 items-center">{opt.icon}</span>
            )}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
