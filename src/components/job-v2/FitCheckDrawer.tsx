"use client";

import { useEffect, useState } from "react";

import { ModelSelector } from "@/components/ModelSelector";
import { Icon } from "@/components/ui/Icon";
import { useJobPageContext } from "@/contexts/JobPageContext";
import useFitCheck from "@/hooks/useFitCheck";
import { useModelStore } from "@/store/modelStore";
import { FitCheckJSON, FitCheckSchema } from "@/types/fitCheck";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

import { FitCheckResult } from "./FitCheckResult";
import { SideDrawer } from "./SideDrawer";

// Re-exported so existing importers (e.g. /bookmarks) don't need to change
// their import path — the badge styling now lives in FitCheckResult.tsx.
export { FIT_LEVEL_META } from "./FitCheckResult";

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
  /** The persisted result for this resume (JobPageContext's `fitCheck`,
   * hydrated from the DB) — seeds the drawer's own result once so a page
   * reload doesn't reset it back to the splash screen. Unlike
   * `externalResult`, this only seeds initial state; it's not read live,
   * so "Re-run" can still clear it and return to the splash screen. */
  initialResult?: FitCheckJSON | null;
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
  initialResult,
}: FitCheckDrawerProps) {
  const activeModelPair = useModelStore((s) => s.activeModelPair);
  const { saveToDb, setFitCheck } = useJobPageContext();
  const [ownResult, setOwnResult] = useState<FitCheckJSON | null>(null);

  // Seed once from the persisted result so a page reload doesn't reset the
  // drawer back to the splash screen. Guarded by `!ownResult` so it never
  // clobbers a result generated (or cleared via Re-run) this session.
  useEffect(() => {
    if (initialResult && !ownResult) setOwnResult(initialResult);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialResult]);

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
      setFitCheck(result.result);
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
            <FitCheckResult result={result} />

            {!externalResult && (
              <button
                onClick={() => setOwnResult(null)}
                disabled={!activeModelPair}
                className="border-agent-outline-variant text-agent-on-surface-variant hover:bg-agent-surface-container flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="refreshCw" className="h-4 w-4" />
                Re-run
              </button>
            )}
          </div>
        )}
      </div>
    </SideDrawer>
  );
}
