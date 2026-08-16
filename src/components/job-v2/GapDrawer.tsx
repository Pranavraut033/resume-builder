"use client";

import { useState } from "react";

import { ModelSelector } from "@/components/ModelSelector";
import { Icon } from "@/components/ui/Icon";
import useGapAnalysis from "@/hooks/useGapAnalysis";
import cn from "@/lib/cn";
import { applyResumeOps } from "@/lib/resume/editor";
import { useModelStore } from "@/store/modelStore";
import {
  Gap,
  gapFixesToResumeOps,
  GapAnalysisJSON,
  GapFitLevel,
  GapSeverity,
} from "@/types/gapAnalysis";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

import { SideDrawer } from "./SideDrawer";

interface GapDrawerProps {
  open: boolean;
  onClose: () => void;
  resume: ResumeJSON;
  jobDetails?: JobDetailsJSON | null;
  onApply: (updatedResume: ResumeJSON) => void;
  /** An analysis already fetched elsewhere (the chat gap_analysis intent) —
   * lets the drawer skip straight to results instead of re-running the
   * mutation. Takes precedence over any result the drawer's own Start
   * button produced. */
  externalResult?: GapAnalysisJSON | null;
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

// Same 4-tier emerald/sky/amber/rose scale ATSAnalysisPanel uses for score
// bands — strong reuses "good", mismatch reuses "bad".
const FIT_LEVEL_META: Record<GapFitLevel, { label: string; classes: string }> =
  {
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

function gapTypeLabel(gapType: Gap["gap_type"]): string {
  return gapType
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function fixableIndices(analysis: GapAnalysisJSON): Set<number> {
  return new Set(
    analysis.gaps
      .map((gap, i) => (gap.resume_fix ? i : -1))
      .filter((i) => i !== -1)
  );
}

function GapRow({
  gap,
  checked,
  onToggle,
}: {
  gap: Gap;
  checked: boolean;
  onToggle: () => void;
}) {
  const severityMeta = SEVERITY_META[gap.severity];
  const canFix = Boolean(gap.resume_fix);

  const body = (
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
        {!canFix && (
          <span className="border-agent-outline-variant text-agent-on-surface-variant ml-auto inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium">
            no fix
          </span>
        )}
      </div>
      <p className="text-agent-on-surface mb-1 text-sm font-medium">
        {gap.requirement}
      </p>
      {gap.evidence_in_resume ? (
        <p className="text-agent-on-surface-variant mb-1 text-xs italic">
          &ldquo;{gap.evidence_in_resume}&rdquo;
        </p>
      ) : (
        <p className="mb-1 text-xs font-medium text-rose-700">
          Nothing in your resume addresses this.
        </p>
      )}
      <p className="text-agent-on-surface-variant text-xs">{gap.solution}</p>
    </div>
  );

  if (!canFix) {
    return <div className="flex items-start gap-3">{body}</div>;
  }

  return (
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-1 shrink-0"
      />
      {body}
    </label>
  );
}

/**
 * GapDrawer — "ATS gap analysis on steroids". Splash (what it does + model
 * picker + Start) → pending → results, mirroring ProofreadDrawer. Results
 * lead with the blunt fit-level/verdict, then gaps grouped by severity
 * (blocking → major → minor) each with a checkbox only when a resume_fix
 * exists, and end with a pinned strengths section — deliberately last, the
 * honest close rather than filler up top.
 *
 * `externalResult` lets the chat-driven gap_analysis intent hand the drawer
 * an already-fetched analysis instead of re-running the mutation.
 */
export function GapDrawer({
  open,
  onClose,
  resume,
  jobDetails,
  onApply,
  externalResult,
}: GapDrawerProps) {
  const activeModelPair = useModelStore((s) => s.activeModelPair);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [ownResult, setOwnResult] = useState<GapAnalysisJSON | null>(null);
  // Tracks the externalResult reference last seen so the selection can be
  // (re)initialized the moment a fresh chat-driven analysis arrives, without
  // synchronously calling setState from an effect — adjusting state during
  // render, guarded by a reference check, is the pattern React recommends
  // for "resetting state when a prop changes".
  const [seenExternalResult, setSeenExternalResult] =
    useState<GapAnalysisJSON | null>(null);

  const {
    mutate: analyze,
    status,
    reset,
  } = useGapAnalysis({
    onSuccess: (result) => {
      setOwnResult(result.result);
      setSelected(fixableIndices(result.result));
    },
  });

  const result = externalResult ?? ownResult;
  const isLoading = status === "pending";

  if (externalResult && externalResult !== seenExternalResult) {
    setSeenExternalResult(externalResult);
    setSelected(fixableIndices(externalResult));
  }

  const groupedGaps = result
    ? SEVERITY_ORDER.flatMap((severity) =>
        result.gaps
          .map((gap, i) => ({ gap, index: i }))
          .filter(({ gap }) => gap.severity === severity)
      )
    : [];

  const fixableCount = result
    ? result.gaps.filter((gap) => gap.resume_fix).length
    : 0;

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleClose = () => {
    onClose();
    reset();
    setSelected(new Set());
    setOwnResult(null);
  };

  const handleStart = () => {
    setOwnResult(null);
    analyze({ resume, jobDetails });
  };

  const handleApply = () => {
    if (!result) return;
    const selectedGaps = result.gaps.filter((_, i) => selected.has(i));
    const ops = gapFixesToResumeOps(selectedGaps);
    const { resume: updatedResume } = applyResumeOps(resume, ops);
    onApply(updatedResume);
    handleClose();
  };

  const showSplash = !result && status !== "pending";

  return (
    <SideDrawer
      open={open}
      onClose={handleClose}
      icon="target"
      title="Fit Check"
    >
      <div className="flex-1 overflow-y-auto p-4 pb-20">
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
                first, then what you can fix in the resume vs. what you
                can&apos;t, and your real strengths last.
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

            {result.gaps.length === 0 ? (
              <p className="text-agent-on-surface-variant py-4 text-center text-sm">
                No gaps found.
              </p>
            ) : (
              <ul className="space-y-3">
                {groupedGaps.map(({ gap, index }) => (
                  <li
                    key={index}
                    className="border-agent-outline-variant bg-agent-surface-lowest rounded-lg border p-3"
                  >
                    <GapRow
                      gap={gap}
                      checked={selected.has(index)}
                      onToggle={() => toggle(index)}
                    />
                  </li>
                ))}
              </ul>
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

      {/* Floating pill — stays visible over the scroll area regardless of
          scroll position, since a plain inline button here is easy to miss
          without scrolling all the way down (same rationale as
          ThemeCustomizationPanel's sticky reset bar). */}
      {result && fixableCount > 0 && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
          <div className="border-agent-outline-variant bg-agent-surface-lowest/80 shadow-agent-modal pointer-events-auto flex items-center gap-0.5 rounded-full border p-1 backdrop-blur-xs">
            <button
              onClick={handleApply}
              disabled={selected.size === 0}
              className="bg-agent-primary text-agent-on-primary rounded-full px-4 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply {selected.size} of {fixableCount} fixable
            </button>
          </div>
        </div>
      )}
    </SideDrawer>
  );
}
