import { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface SettingsRowProps {
  label: string;
  description?: string;
  /** The control element rendered on the right (toggle, button, select, etc.) */
  control: ReactNode;
  className?: string;
}

/**
 * A single settings row: label + optional description on the left,
 * interactive control on the right.
 *
 * @example
 * <SettingsRow
 *   label="Anonymous Telemetry"
 *   description="Help improve AI parsing accuracy (Opt-in)"
 *   control={<Toggle checked={telemetry} onChange={setTelemetry} />}
 * />
 */
export function SettingsRow({
  label,
  description,
  control,
  className,
}: SettingsRowProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="min-w-0">
        <p className="text-agent-on-surface text-sm font-medium">{label}</p>
        {description && (
          <p className="text-agent-on-surface-variant mt-0.5 text-xs">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
