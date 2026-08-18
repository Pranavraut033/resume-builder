"use client";

import { useState } from "react";

import { ModelSelector } from "@/components/ModelSelector";
import { Icon } from "@/components/ui/Icon";
import { useJobPageContext } from "@/contexts/JobPageContext";
import useFitCheck from "@/hooks/useFitCheck";
import cn from "@/lib/cn";
import { useModelStore } from "@/store/modelStore";
import {
  FitCheckJSON,
  FitCheckSchema,
  FitLevel,
  Gap,
  GapSeverity,
} from "@/types/fitCheck";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

import { SideDrawer } from "./SideDrawer";

interface FitCheckDrawerProps {
  open: boolean;
  onClose: () => void;
  resume: ResumeJSON;
  jobDetails?: JobDetailsJSON | null;
  /** An analysis already fetched elsewhere (the chat fit_check intent) —
   * lets the drawer skip straight to results instead of re-running the
   * mutation. Takes precedence over any result the drawer's own Start
   * button produced. */
  externalResult?: FitCheckJSON | null;
}

const SEVERITY_ORDER: GapSeverity[] = ["blocking", "major", "minor"];

const SEVERITY_META: Record<GapSeverity, { label: string; classes: string }> = {
  blocking: {
    label: "Blocking",
    classes: "bg-rose-100 text-rose-800 border-rose-200",
  },
  major: {
    label: "Major",
    classes: "bg-amber-100 text-amber-800 border-amber-200",
  },
  minor: {
    label: "Minor",
    classes: "bg-sky-100 text-sky-800 border-sky-200",
  },
};

// Same 4-tier emerald/sky/amber/rose scale DeepAnalysisPanel uses for score
// bands — strong reuses "good", mismatch reuses "bad".
const FIT_LEVEL_META: Record<FitLevel, { label: string; classes: string }> = {
  strong: {
    label: "Strong fit",
    classes: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  stretch: {
    label: "Stretch fit",
    classes: "bg-sky-100 text-sky-800 border-sky-200",
  },
  reach: {
    label: "Reach",
    classes: "bg-amber-100 text-amber-800 border-amber-200",
  },
  mismatch: {
    label: "Mismatch",
    classes: "bg-rose-100 text-rose-800 border-rose-200",
  },
};

const KNOCKOUT_CONFIDENCE_META: Record<
  "confirmed" | "likely" | "unknown",
  { label: string; classes: string }
> = {
  confirmed: {
    label: "Confirmed",
    classes: "bg-rose-100 text-rose-800 border-rose-200",
  },
  likely: {
    label: "Likely",
    classes: "bg-amber-100 text-amber-800 border-amber-200",
  },
  unknown: {
    label: "Unknown",
    classes:
      "bg-agent-surface-high text-agent-on-surface border-agent-outline-variant",
  },
};

function gapTypeLabel(gapType: Gap["gap_type"]): string {
  return gapType
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function GapRow({ gap }: { gap: Gap }) {
  const severityMeta = SEVERITY_META[gap.severity];

  return (
    <div className="min-w-0 flex-1 text-sm">
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
            severityMeta.classes
          )}
        >
          {severityMeta.label}
        </span>
        <span className="border-agent-outline-variant bg-agent-surface-high text-agent-on-surface inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium">
          {gapTypeLabel(gap.gap_type)}
        </span>
      </div>
      <p className="text-agent-on-surface mb-1 text-sm font-medium">
        {gap.requirement}
      </p>
      {gap.evidence_in_resume ? (
        <p className="text-agent-on-surface-variant mb-1 text-xs italic">
          &ldquo;{gap.evidence_in_resume}&rdquo;
        </p>
      ) : (
        <p className="text-agent-error mb-1 text-xs font-medium">
          Nothing in your resume addresses this.
        </p>
      )}
      <p className="text-agent-on-surface-variant text-xs">{gap.solution}</p>
    </div>
  );
}

/**
 * FitCheckDrawer — "should I apply, and what's blocking me?" Splash (what it
 * does + model picker + Start) → pending → results. Results lead with the
 * blunt fit-level/verdict, then knockout risks (form-question blockers,
 * moved here from the old Recruiter Skim panel), then gaps grouped by
 * severity (blocking → major → minor), and end with a pinned strengths
 * section — deliberately last, the honest close rather than filler up top.
 *
 * No apply path: `gap_type` is down to `missing | seniority | domain`, and
 * none of them carry a text-level fix any more (that moved to Deep
 * Analysis's findings, which do carry a verbatim `original`/`suggestion`
 * pair). See src/types/fitCheck.ts's `GapSchema` — there is nothing left
 * here for a floating "Apply" pill to apply.
 *
 * `externalResult` lets the chat-driven fit_check intent hand the drawer an
 * already-fetched analysis instead of re-running the mutation.
 */
export function FitCheckDrawer({
  open,
  onClose,
  resume,
  jobDetails,
  externalResult,
}: FitCheckDrawerProps) {
  const activeModelPair = useModelStore((s) => s.activeModelPair);
  const { saveToDb } = useJobPageContext();
  const [ownResult, setOwnResult] = useState<FitCheckJSON | null>(null);

  const {
    mutate: analyze,
    status,
    reset,
  } = useFitCheck({
    onSuccess: (result) => {
      setOwnResult(result.result);
      // Persist so /documents can rank by fit level (see saveFitCheck's doc
      // comment in src/lib/db/job.ts) — mirrors DeepAnalysisPanel's own
      // save-on-generate pattern.
      saveToDb("fitCheck", result.result);
    },
  });

  const rawResult = externalResult ?? ownResult;
  const isLoading = status === "pending";

  // Defense-in-depth: `rawResult` is typed FitCheckJSON, but a persisted
  // blob that predates the `v: 2` shape must never crash this drawer — see
  // the plan's version-check discipline (src/types/fitCheck.ts).
  const result =
    rawResult && FitCheckSchema.safeParse(rawResult).success ? rawResult : null;
  const isStale = Boolean(rawResult) && !result;

  const groupedGaps = result
    ? SEVERITY_ORDER.flatMap((severity) =>
        result.gaps.filter((gap) => gap.severity === severity)
      )
    : [];

  const handleClose = () => {
    onClose();
    reset();
    setOwnResult(null);
  };

  const handleStart = () => {
    setOwnResult(null);
    analyze({ resume, jobDetails });
  };

  const showSplash = !result && !isStale && status !== "pending";

  return (
    <SideDrawer
      open={open}
      onClose={handleClose}
      icon="target"
      title="Fit Check"
    >
      <div className="flex-1 overflow-y-auto p-4 pb-6">
        {isStale && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800">
                Format out of date
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
                This analysis predates the new format — re-run it.
              </p>
            </div>

            <button
              onClick={handleStart}
              disabled={!activeModelPair}
              className="bg-agent-primary text-agent-on-primary flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="refreshCw" className="h-4 w-4" />
              Re-run
            </button>
          </div>
        )}

        {showSplash && (
          <div className="flex flex-col gap-4">
            <div className="text-agent-on-surface-variant flex items-start gap-3 text-sm">
              <Icon
                name="target"
                className="text-agent-primary mt-0.5 h-5 w-5 shrink-0"
              />
              <p>
                Reads your resume against the job description the way a hiring
                manager would — where you&apos;re genuinely short on experience,
                seniority, or evidence, not just missing keywords. Blunt verdict
                and knockout risks first, then gaps, then your real strengths
                last.
              </p>
            </div>

            <ModelSelector label="Select model" variant="compact" />

            <button
              onClick={handleStart}
              disabled={!activeModelPair}
              className="bg-agent-primary text-agent-on-primary flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="target" className="h-4 w-4" />
              Start
            </button>
            {!activeModelPair && (
              <p className="text-agent-on-surface-variant text-xs">
                Select a model above to continue.
              </p>
            )}
          </div>
        )}

        {isLoading && (
          <div className="text-agent-on-surface-variant flex items-center justify-center gap-2 py-12 text-sm">
            <Icon name="spinner" className="h-4 w-4 animate-spin" />
            Analyzing…
          </div>
        )}

        {result && (
          <div className="flex flex-col gap-4">
            <div className="border-agent-outline-variant bg-agent-surface-lowest rounded-lg border p-3">
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  FIT_LEVEL_META[result.fit_level].classes
                )}
              >
                {FIT_LEVEL_META[result.fit_level].label}
              </span>
              <p className="text-agent-on-surface mt-2 text-sm">
                {result.verdict}
              </p>
            </div>

            {result.knockout_risks.length > 0 && (
              <div>
                <h3 className="text-agent-on-surface mb-2 text-xs font-semibold tracking-wide uppercase">
                  Knockout risks
                </h3>
                <ul className="space-y-3">
                  {result.knockout_risks.map((risk, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-rose-200 bg-rose-50 p-3"
                    >
                      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            KNOCKOUT_CONFIDENCE_META[risk.confidence].classes
                          )}
                        >
                          {KNOCKOUT_CONFIDENCE_META[risk.confidence].label}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-rose-900">
                        {risk.requirement}
                      </p>
                      <p className="mt-1 text-xs text-rose-800">
                        {risk.evidence}
                      </p>
                      <p className="mt-1 text-xs text-rose-700/80">
                        {risk.advice}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="text-agent-on-surface-variant mt-2 text-[11px] leading-relaxed">
                  These are form questions, not parsing.
                </p>
              </div>
            )}

            {result.gaps.length === 0 ? (
              <p className="text-agent-on-surface-variant py-4 text-center text-sm">
                No gaps found.
              </p>
            ) : (
              <div>
                <h3 className="text-agent-on-surface mb-2 text-xs font-semibold tracking-wide uppercase">
                  Gaps
                </h3>
                <ul className="space-y-3">
                  {groupedGaps.map((gap, index) => (
                    <li
                      key={index}
                      className="border-agent-outline-variant bg-agent-surface-lowest rounded-lg border p-3"
                    >
                      <GapRow gap={gap} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Strengths — pinned last on purpose: the honest close, not
                filler up top. */}
            <div className="border-agent-outline-variant border-t pt-4">
              <h3 className="text-agent-on-surface mb-2 text-xs font-semibold tracking-wide uppercase">
                Strengths
              </h3>
              <ul className="space-y-2">
                {result.strengths.map((strength, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"
                  >
                    <p className="text-sm font-medium text-emerald-900">
                      {strength.requirement}
                    </p>
                    <p className="mt-1 text-xs text-emerald-800">
                      {strength.evidence}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </SideDrawer>
  );
}
