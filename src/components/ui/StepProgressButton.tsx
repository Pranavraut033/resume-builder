"use client";

import { ButtonHTMLAttributes, ReactNode, useEffect, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * Fills each step's slice of the bar over time (never reaching the next
 * boundary on its own) so the bar keeps moving while a real, unknown-duration
 * call is in flight. Advancing `activeStep` snaps the floor up and restarts
 * the creep for the new segment.
 */
function useStepProgress(activeStep: number, totalSteps: number) {
  const [segmentProgress, setSegmentProgress] = useState(0);
  const ceiling = 92;

  useEffect(() => {
    if (activeStep < 0 || activeStep >= totalSteps) return;
    setSegmentProgress(0);
    const id = setInterval(() => {
      setSegmentProgress((prev) => prev + (ceiling - prev) * 0.08);
    }, 200);
    return () => clearInterval(id);
  }, [activeStep, totalSteps]);

  if (activeStep < 0) return 0;
  if (activeStep >= totalSteps) return 100;

  const segmentSpan = 100 / totalSteps;
  return (activeStep / totalSteps) * 100 + (segmentProgress / 100) * segmentSpan;
}

export interface StepProgressButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Label for each step, in order. Also determines the step count. */
  steps: string[];
  /** 0-based index of the in-flight step, `steps.length` when done, or -1 when idle. */
  activeStep: number;
  /** Content shown when `activeStep` is -1. */
  idleLabel: ReactNode;
  className?: string;
}

export function StepProgressButton({
  steps,
  activeStep,
  idleLabel,
  className,
  disabled,
  ...props
}: StepProgressButtonProps) {
  const loading = activeStep >= 0 && activeStep < steps.length;
  const percent = useStepProgress(activeStep, steps.length);

  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "bg-agent-primary relative flex w-full items-center justify-center overflow-hidden rounded-xl px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40",
        className
      )}
      {...props}
    >
      {loading && (
        <span
          className="absolute inset-y-0 left-0 bg-white/20 transition-[width] duration-200 ease-out"
          style={{ width: `${percent}%` }}
        />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <>
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span className="cuboid-stage h-5 overflow-hidden">
              <span
                key={activeStep}
                className="animate-cuboid-roll-in block"
              >
                {steps[activeStep]}
              </span>
            </span>
            <span className="text-xs tabular-nums opacity-80">
              {Math.round(percent)}%
            </span>
          </>
        ) : (
          idleLabel
        )}
      </span>
    </button>
  );
}
