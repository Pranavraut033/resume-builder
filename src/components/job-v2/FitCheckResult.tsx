import cn from "@/lib/cn";
import { FitCheckJSON, FitLevel, Gap, GapSeverity } from "@/types/fitCheck";

// Extracted from FitCheckDrawer so /bookmarks (which has no drawer chrome —
// just a FitCheck blob on Job.fitCheckId) can render the same result view.

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
export const FIT_LEVEL_META: Record<
  FitLevel,
  { label: string; classes: string }
> = {
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
 * Renders a completed FitCheckJSON: fit-level badge + verdict, knockout
 * risks, gaps grouped by severity (blocking → major → minor), and the
 * strengths section pinned last — the honest close, not filler up top.
 * Pure presentation, no fetching/mutation — FitCheckDrawer wraps this with
 * its splash/loading/re-run chrome; /bookmarks renders it directly in an
 * expandable panel off the persisted Job.fitCheckId blob.
 */
export function FitCheckResult({ result }: { result: FitCheckJSON }) {
  const groupedGaps = SEVERITY_ORDER.flatMap((severity) =>
    result.gaps.filter((gap) => gap.severity === severity)
  );

  return (
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
        <p className="text-agent-on-surface mt-2 text-sm">{result.verdict}</p>
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
                <p className="mt-1 text-xs text-rose-800">{risk.evidence}</p>
                <p className="mt-1 text-xs text-rose-700/80">{risk.advice}</p>
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

      {/* Strengths — pinned last on purpose: the honest close, not filler
          up top. */}
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
  );
}
