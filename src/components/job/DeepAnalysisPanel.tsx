import { analyzeResume } from "@pranavraut033/ats-checker";
import { useMemo, useState } from "react";

import SparklesIcon from "@/components/icons/SparklesIcon";
import { Button } from "@/components/ui/Button";
import { Icon, IconName } from "@/components/ui/Icon";
import { ProgressFill } from "@/components/ui/ProgressFill";
import { useJobPageContext } from "@/contexts/JobPageContext";
import useDeepAnalysis from "@/hooks/useDeepAnalysis";
import { useFakeProgress } from "@/hooks/useFakeProgress";
import cn from "@/lib/cn";
import { applyProofreadFixes } from "@/lib/proofread/applyFixes";
import { resumeToText } from "@/lib/resumeToText";
import {
  DocumentAnalysisJSON,
  DocumentAnalysisSchema,
  DocumentFinding,
  DocumentFindingKind,
  DocumentFindingSeverity,
} from "@/types/documentAnalysis";

import { useChatContext } from "../chat/ChatContext";
import { ModelSelector } from "../ModelSelector";
import { useToast } from "../ui/ToastProvider";

export type DeepAnalysisPanelProps =
  | {
      atsAnalysis?: DocumentAnalysisJSON;
      standalone?: false; // if false or undefined, the panel is rendered within the chat and uses context data
    }
  | {
      atsAnalysis: DocumentAnalysisJSON;
      standalone: true; // if true, the panel is rendered outside of the chat and should fetch its own analysis data
    };

/** One panel, three views. Back-navigation is rendered by this component
 * (a `‹ <section title>` sub-header below SideDrawer's own header) — see
 * `BackHeader` below. `SideDrawer` itself gains no back-arrow support. */
type View = "summary" | "findings" | "offline";

const SECTION_TITLE: Record<Exclude<View, "summary">, string> = {
  findings: "Findings",
  offline: "Keyword check (offline)",
};

const KIND_ORDER: DocumentFindingKind[] = [
  "correctness",
  "impact",
  "keyword",
  "duplication",
  "provenance",
  "title",
];

const KIND_META: Record<
  DocumentFindingKind,
  { label: string; icon: IconName }
> = {
  correctness: { label: "Correctness", icon: "checkCircle" },
  impact: { label: "Impact", icon: "zap" },
  keyword: { label: "Keywords", icon: "search" },
  duplication: { label: "Duplication", icon: "copy" },
  provenance: { label: "Provenance", icon: "shieldAlert" },
  title: { label: "Title alignment", icon: "target" },
};

const SEVERITY_ORDER: DocumentFindingSeverity[] = [
  "error",
  "warning",
  "suggestion",
];

const SEVERITY_META: Record<
  DocumentFindingSeverity,
  { label: string; classes: string }
> = {
  error: {
    label: "Error",
    classes: "bg-rose-100 text-rose-800 border-rose-200",
  },
  warning: {
    label: "Warning",
    classes: "bg-amber-100 text-amber-800 border-amber-200",
  },
  suggestion: {
    label: "Suggestion",
    classes: "bg-sky-100 text-sky-800 border-sky-200",
  },
};

// The HARD CONSTRAINTS in deep-analysis.ts already tell the model never to
// emit a finding whose suggestion equals its original, but compliance isn't
// guaranteed — smaller models in particular sometimes "confirm" a field is
// already correct instead of staying silent. These are real model output,
// not a bug in what got stored, so filtering happens only at render time
// (never touches what's persisted) — a defensive belt on top of the prompt
// instruction, not a replacement for it.
function isNoOpFinding(finding: DocumentFinding): boolean {
  return finding.suggestion.trim() === finding.original.trim();
}

function filterNoOpFindings(findings: DocumentFinding[]): DocumentFinding[] {
  return findings.filter((f) => !isNoOpFinding(f));
}

// Provenance findings need the base profile to judge — their suggestion is
// usually "delete this", so they're never pre-ticked, mirroring the old
// ProofreadDrawer's PROVENANCE_CATEGORIES caution.
//
// Takes the already-filtered findings array (not the whole analysis) so its
// indices land on the same positions the render list uses — both derive
// from filterNoOpFindings applied to the same source array, so `selected`'s
// index N always means the same finding as items[N] in the rendered list.
function defaultSelection(findings: DocumentFinding[]): Set<number> {
  return new Set(
    findings
      .map((finding, i) =>
        (finding.severity === "error" || finding.severity === "warning") &&
        finding.kind !== "provenance"
          ? i
          : -1
      )
      .filter((i) => i !== -1)
  );
}

function AlignButton({
  isLoading,
  onClick,
}: {
  isLoading: boolean;
  onClick: () => void;
}) {
  const percent = useFakeProgress(isLoading);

  return (
    <Button
      size="sm"
      variant="primary"
      disabled={isLoading}
      onClick={onClick}
      className="relative inline-flex w-full items-center justify-center gap-1.5 overflow-hidden rounded-lg"
    >
      <ProgressFill percent={percent} />
      <span className="relative z-10 inline-flex items-center gap-1.5">
        <SparklesIcon
          width="11"
          height="11"
          className={cn(isLoading && "animate-pulse")}
          aria-hidden
        />
        {isLoading ? "Aligning..." : "Align additive wording with the job"}
      </span>
    </Button>
  );
}

/** Back-navigation row rendered by the panel itself, below SideDrawer's own
 * header — see the `View` state-machine note above. */
function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="border-agent-outline-variant/70 bg-agent-surface-low -mx-4 -mt-4 mb-1 flex items-center gap-2 border-b px-4 py-2.5 sm:-mx-5 sm:-mt-5 sm:px-5">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to summary"
        className="text-agent-on-surface-variant hover:bg-agent-surface-high hover:text-agent-on-surface flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors"
      >
        <Icon name="arrowLeft" className="h-3.5 w-3.5" />
      </button>
      <h3 className="text-agent-on-surface text-sm font-semibold">{title}</h3>
    </div>
  );
}

/** One row in the L1 summary's drill-in list. Renders as a plain,
 * non-interactive row (no chevron, no click) when `onClick` is omitted —
 * used for the standalone chat-panel mount, which has no drawer to open. */
function DrillInRow({
  icon,
  label,
  meta,
  onClick,
}: {
  icon: IconName;
  label: string;
  meta?: string;
  onClick?: () => void;
}) {
  const interactive = Boolean(onClick);

  // A non-interactive row renders as a plain <div>, not a disabled <button>:
  // there's no action to disable here, and a screen reader announcing
  // "dimmed/disabled button" would describe a state the row never had.
  const Tag = interactive ? "button" : "div";

  return (
    <Tag
      {...(interactive
        ? ({ type: "button", onClick } as const)
        : ({} as const))}
      className={cn(
        "border-agent-outline-variant bg-agent-surface-low flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left",
        interactive
          ? "hover:bg-agent-surface-high cursor-pointer transition-colors"
          : "cursor-default"
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon
          name={icon}
          className="text-agent-on-surface-variant h-3.5 w-3.5 shrink-0"
        />
        <div className="min-w-0">
          <p className="text-agent-on-surface truncate text-xs font-medium">
            {label}
          </p>
          {meta ? (
            <p className="text-agent-on-surface-variant truncate text-[11px]">
              {meta}
            </p>
          ) : null}
        </div>
      </div>
      {interactive ? (
        <Icon
          name="chevronRight"
          className="text-agent-on-surface-variant h-3.5 w-3.5 shrink-0"
        />
      ) : null}
    </Tag>
  );
}

function FindingRow({
  finding,
  checked,
  onToggle,
}: {
  finding: DocumentFinding;
  checked: boolean;
  onToggle: () => void;
}) {
  const severityMeta = SEVERITY_META[finding.severity];

  return (
    <label className="flex items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-1 shrink-0"
      />
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
          {finding.source === "lint" ? (
            <span className="border-agent-outline-variant bg-agent-surface-high text-agent-on-surface inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium">
              Auto-detected
            </span>
          ) : null}
        </div>
        {finding.original ? (
          <p className="text-agent-error mb-1 line-through">
            {finding.original}
          </p>
        ) : null}
        {finding.suggestion ? (
          <p className="text-agent-success">{finding.suggestion}</p>
        ) : finding.original ? (
          <p className="text-agent-error mb-1 text-xs font-medium">
            Suggested: delete this.
          </p>
        ) : null}
        <p className="text-agent-on-surface-variant mt-1 text-xs">
          {finding.why}
        </p>
      </div>
    </label>
  );
}

export function DeepAnalysisPanel(props: DeepAnalysisPanelProps) {
  const {
    resume,
    job,
    saveToDb,
    setAtsAnalysis,
    atsAnalysis: stateAtsAnalysis,
    updateResumeState,
    customization,
  } = useJobPageContext();

  const chatCtx = useChatContext(true);

  const [view, setView] = useState<View>("summary");
  const [quickRefreshNonce, setQuickRefreshNonce] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const quickAnalysis = useMemo(() => {
    if (props.standalone || !job?.details?.raw_description) return null;
    return analyzeResume({
      resumeText: resumeToText(resume),
      jobDescription: job.details.raw_description,
    });
    // quickRefreshNonce is an intentional no-op dep — analyzeResume is
    // deterministic over resume/job, so this only exists to let the
    // refresh button force a recompute on demand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    resume,
    job?.details?.raw_description,
    props.standalone,
    quickRefreshNonce,
  ]);

  const { pushToast } = useToast();

  const {
    mutate: generateDeepAnalysis,
    error,
    isPending,
  } = useDeepAnalysis({
    onSuccess(data) {
      // Persist the model's real output unfiltered — filterNoOpFindings is
      // a render-time concern only. Selection indices, though, must be
      // computed against the SAME filtered array the render list will use.
      saveToDb("ats", data.result);
      setAtsAnalysis(data.result);
      setSelected(defaultSelection(filterNoOpFindings(data.result.findings)));
      setView("summary");
      pushToast({
        title: "Deep Analysis ready",
        description: "Findings and title alignment are updated.",
        variant: "success",
      });
    },
    onError(e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";

      pushToast({
        title: "Couldn't run Deep Analysis",
        description: errorMessage,
        variant: "error",
      });
    },
  });

  const runPercent = useFakeProgress(isPending);

  const onGenerate = () => {
    if (props.standalone) return;
    generateDeepAnalysis({ resume, jobDetails: job?.details });
  };

  const rawAnalysis = useMemo<DocumentAnalysisJSON | null>(
    () => (props.standalone ? props.atsAnalysis : stateAtsAnalysis),
    [props.atsAnalysis, stateAtsAnalysis, props.standalone]
  );

  // Defense-in-depth: `rawAnalysis` is typed DocumentAnalysisJSON, but the
  // persisted-blob read path (src/lib/db/job.ts::getResumeByJobId) isn't
  // guarded against a pre-`v:2` blob the way getAllDocuments/getJob are —
  // re-validate at this boundary so a shape mismatch renders the empty
  // state below instead of crashing deeper in the render tree.
  const analysis = useMemo<DocumentAnalysisJSON | null>(() => {
    if (!rawAnalysis) return null;
    return DocumentAnalysisSchema.safeParse(rawAnalysis).success
      ? rawAnalysis
      : null;
  }, [rawAnalysis]);

  const isStale = Boolean(rawAnalysis) && !analysis;

  // What actually renders as a card, and the single source of truth for
  // `selected`'s indices — see defaultSelection's doc comment above for why
  // this can't be computed separately in more than one place.
  const visibleFindings = useMemo(
    () => (analysis ? filterNoOpFindings(analysis.findings) : []),
    [analysis]
  );
  const hiddenNoOpCount =
    (analysis?.findings.length ?? 0) - visibleFindings.length;

  const countsByKind = useMemo(() => {
    const counts: Record<DocumentFindingKind, number> = {
      correctness: 0,
      impact: 0,
      keyword: 0,
      duplication: 0,
      provenance: 0,
      title: 0,
    };
    visibleFindings.forEach((finding) => {
      counts[finding.kind] += 1;
    });
    return counts;
  }, [visibleFindings]);

  const titleFinding = visibleFindings.find((f) => f.kind === "title");

  const onAlignAdditive = () => {
    if (!chatCtx || !analysis) return;
    chatCtx
      .alignFindings(visibleFindings)
      .then(() =>
        pushToast({
          title: "Terms aligned",
          description:
            "Additive wording matches from this analysis have been applied.",
          variant: "success",
        })
      )
      .catch((e: unknown) =>
        pushToast({
          title: "Couldn't align terms",
          description: e instanceof Error ? e.message : "Unknown error",
          variant: "error",
        })
      );
  };

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const onApplySelected = () => {
    if (!analysis) return;
    const selectedFindings = visibleFindings.filter((_, i) => selected.has(i));
    const result = applyProofreadFixes(resume, selectedFindings);
    updateResumeState(result.resume, "Applied Deep Analysis findings");
    saveToDb("resume", result.resume, customization);
    setSelected(new Set());

    if (result.unapplied.length > 0) {
      pushToast({
        title: "Some findings couldn't be applied",
        description: `${result.unapplied.length} finding(s) — the original text may have already changed.`,
        variant: "error",
      });
    } else {
      pushToast({
        title: "Findings applied",
        description: "The selected findings have been applied to your resume.",
        variant: "success",
      });
    }
  };

  const openOfflineRow = props.standalone
    ? undefined
    : () => setView("offline");
  const openFindingsRow = props.standalone
    ? undefined
    : () => setView("findings");

  const offlineMeta = quickAnalysis
    ? `${quickAnalysis.matchedKeywords.length} / ${
        quickAnalysis.matchedKeywords.length +
        quickAnalysis.missingKeywords.length
      } role terms present`
    : "Instant, deterministic. Coverage + parse.";

  // ── Stale / pre-v2 blob ─────────────────────────────────────────────────
  if (isStale) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <article className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-800">
            Format out of date
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
            This analysis predates the new format — re-run it.
          </p>
        </article>
        {!props.standalone ? (
          <Button
            onClick={onGenerate}
            disabled={isPending}
            variant="gradient"
            className="relative w-full overflow-hidden rounded-lg"
          >
            <ProgressFill percent={runPercent} />
            <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
              <SparklesIcon
                width="12"
                height="12"
                className={cn(isPending && "animate-pulse")}
                aria-hidden
              />
              {isPending ? "Re-running..." : "Re-run"}
            </span>
          </Button>
        ) : null}
      </div>
    );
  }

  // ── L2 views ─────────────────────────────────────────────────────────
  if (view !== "summary" && !props.standalone) {
    return (
      <div className="flex flex-col gap-4 p-4 pt-0 sm:p-5 sm:pt-0">
        <BackHeader
          title={SECTION_TITLE[view]}
          onBack={() => setView("summary")}
        />

        {view === "findings" && analysis ? (
          <>
            {chatCtx && visibleFindings.length > 0 ? (
              <AlignButton
                isLoading={chatCtx.isLoading}
                onClick={onAlignAdditive}
              />
            ) : null}

            {visibleFindings.length === 0 ? (
              <p className="rounded-(--radius-agent) border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                No findings — nothing here needs a change.
              </p>
            ) : (
              KIND_ORDER.map((kind) => {
                const items = visibleFindings
                  .map((finding, index) => ({ finding, index }))
                  .filter(({ finding }) => finding.kind === kind)
                  .sort(
                    (a, b) =>
                      SEVERITY_ORDER.indexOf(a.finding.severity) -
                      SEVERITY_ORDER.indexOf(b.finding.severity)
                  );
                if (items.length === 0) return null;

                return (
                  <div key={kind}>
                    <p className="text-agent-on-surface-variant mb-2 text-xs font-medium uppercase">
                      {KIND_META[kind].label} · {items.length}
                    </p>
                    <ul className="space-y-3">
                      {items.map(({ finding, index }) => (
                        <li
                          key={index}
                          className="border-agent-outline-variant bg-agent-surface-low rounded-lg border p-3"
                        >
                          <FindingRow
                            finding={finding}
                            checked={selected.has(index)}
                            onToggle={() => toggle(index)}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            )}

            {hiddenNoOpCount > 0 ? (
              <p className="text-agent-on-surface-variant text-[11px]">
                {hiddenNoOpCount} item{hiddenNoOpCount === 1 ? "" : "s"} already
                correct — no card shown.
              </p>
            ) : null}
          </>
        ) : null}

        {view === "offline" ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-agent-on-surface-variant text-[11px]">
                No AI call. Recomputes as you edit.
              </p>
              <button
                type="button"
                onClick={() => setQuickRefreshNonce((n) => n + 1)}
                className="text-agent-on-surface-variant hover:bg-agent-surface-high hover:text-agent-on-surface flex h-6 w-6 items-center justify-center rounded-md transition-colors"
                aria-label="Recompute offline check"
              >
                <Icon name="refreshCw" className="h-3.5 w-3.5" />
              </button>
            </div>

            {quickAnalysis ? (
              <>
                <div className="border-agent-outline-variant bg-agent-surface-low flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
                  <span className="text-agent-on-surface-variant">
                    Parses cleanly
                  </span>
                  {quickAnalysis.parseabilityReport.deductions.length === 0 ? (
                    <Icon
                      name="check"
                      className="h-3.5 w-3.5 text-emerald-600"
                    />
                  ) : (
                    <span className="text-agent-warning">
                      {quickAnalysis.parseabilityReport.deductions.length} issue
                      {quickAnalysis.parseabilityReport.deductions.length === 1
                        ? ""
                        : "s"}
                    </span>
                  )}
                </div>

                <div className="border-agent-outline-variant bg-agent-surface-low flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
                  <span className="text-agent-on-surface-variant">
                    Role terms present
                  </span>
                  <span className="text-agent-on-surface font-medium">
                    {quickAnalysis.matchedKeywords.length} /{" "}
                    {quickAnalysis.matchedKeywords.length +
                      quickAnalysis.missingKeywords.length}
                  </span>
                </div>

                <div className="border-agent-outline-variant bg-agent-surface-low flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
                  <span className="text-agent-on-surface-variant">
                    Quantified bullets
                  </span>
                  <span className="text-agent-on-surface font-medium">
                    {quickAnalysis.achievementStrength.strong} /{" "}
                    {quickAnalysis.achievementStrength.strong +
                      quickAnalysis.achievementStrength.weak}
                  </span>
                </div>

                {quickAnalysis.missingKeywords.length > 0 ? (
                  <div>
                    <p className="text-agent-on-surface-variant mb-2 text-xs font-medium uppercase">
                      Missing
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {quickAnalysis.missingKeywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {quickAnalysis.overusedKeywords.length > 0 ? (
                  <div className="rounded-(--radius-agent) border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
                    {quickAnalysis.overusedKeywords.map((keyword) => (
                      <p key={keyword}>
                        ⚠ &ldquo;{keyword}&rdquo; appears often — stuffing reads
                        as stuffing when a recruiter pastes your resume to the
                        hiring manager.
                      </p>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-agent-on-surface-variant border-agent-outline-variant rounded-(--radius-agent) border border-dashed px-3 py-2 text-xs">
                Add a job description to this job to run the offline check.
              </p>
            )}

            <p className="text-agent-on-surface-variant/70 text-center text-[11px]">
              Powered by{" "}
              <a
                href="https://github.com/Pranavraut033/ats-checker#readme"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-agent-on-surface-variant underline"
              >
                @pranavraut033/ats-checker
              </a>
            </p>
          </div>
        ) : null}

        {view === "findings" &&
        analysis &&
        selected.size > 0 &&
        !props.standalone ? (
          <div className="border-agent-outline-variant/70 bg-agent-surface-lowest sticky bottom-0 z-10 -mx-4 -mb-4 border-t px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur-xs sm:-mx-5 sm:-mb-5 sm:px-5">
            <Button
              size="sm"
              variant="secondary"
              onClick={onApplySelected}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg"
            >
              <SparklesIcon width="11" height="11" aria-hidden />
              Apply selected ({selected.size})
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  // ── L1: empty / splash (no analysis yet, non-standalone only — standalone
  // always carries a required atsAnalysis prop) ───────────────────────────
  if (!analysis) {
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div>
          <p className="text-agent-on-surface text-sm font-medium">
            What to change in the document.
          </p>
          <p className="text-agent-on-surface-variant mt-1 text-xs">
            Typos, weak wording, missing keywords, title alignment.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-agent-on-surface-variant text-xs">
            Model: <ModelSelector variant="minimal" />
          </span>
          <Button
            onClick={onGenerate}
            disabled={isPending}
            variant="gradient"
            className="relative w-full overflow-hidden rounded-lg"
          >
            <ProgressFill percent={runPercent} />
            <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
              <SparklesIcon
                width="12"
                height="12"
                className={cn(isPending && "animate-pulse")}
                aria-hidden
              />
              {isPending ? "Running Deep Analysis..." : "Run Deep Analysis"}
            </span>
          </Button>
        </div>

        {error instanceof Error ? (
          <p
            role="alert"
            className="border-agent-error/40 bg-agent-error/10 text-agent-error rounded-(--radius-agent) border px-3 py-2 text-xs"
          >
            {error.message}
          </p>
        ) : null}

        <div className="border-agent-outline-variant/60 border-t pt-3">
          <DrillInRow
            icon="search"
            label="Keyword check (offline, no AI)"
            meta={offlineMeta}
            onClick={openOfflineRow}
          />
        </div>
      </div>
    );
  }

  // ── L1: summary ──────────────────────────────────────────────────────
  const totalFindings = visibleFindings.length;
  const coveredCount = quickAnalysis?.matchedKeywords.length ?? 0;
  const missingCount = quickAnalysis?.missingKeywords.length ?? 0;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5">
      <article className="border-agent-outline-variant bg-agent-surface-low rounded-lg border p-3">
        <p className="text-agent-on-surface text-xs font-semibold">
          Deep Analysis verdict
        </p>
        <p className="text-agent-on-surface-variant mt-1 text-xs leading-relaxed">
          {analysis.summary}
        </p>
        {/* Title alignment earns a line here because under-titling yourself is
            one of the most common resume mistakes, and a title-weighted system
            (Workday et al.) is one of the few places a literal string match
            genuinely moves the needle. Only rendered when the model actually
            flagged a title finding. */}
        {titleFinding ? (
          <p className="border-agent-outline-variant/70 text-agent-on-surface-variant mt-3 border-t pt-3 text-[11px] leading-relaxed">
            <span className="text-agent-on-surface font-medium">
              Title alignment:
            </span>{" "}
            {titleFinding.why}
          </p>
        ) : null}
      </article>

      <div className="flex flex-col gap-2">
        <DrillInRow
          icon="sparkles"
          label={`${totalFindings} finding${totalFindings === 1 ? "" : "s"} to review`}
          meta={
            totalFindings > 0
              ? KIND_ORDER.filter((k) => countsByKind[k] > 0)
                  .map((k) => `${KIND_META[k].label} ${countsByKind[k]}`)
                  .join(" · ")
              : undefined
          }
          onClick={totalFindings > 0 ? openFindingsRow : undefined}
        />
        <DrillInRow
          icon="checkCircle"
          label="Keyword check (offline)"
          meta={offlineMeta}
          onClick={openOfflineRow}
        />
      </div>

      {coveredCount + missingCount > 0 ? (
        <p className="text-agent-on-surface-variant text-[11px]">
          Offline role-term coverage: {coveredCount} covered, {missingCount}{" "}
          missing.
        </p>
      ) : null}

      {error instanceof Error ? (
        <p
          role="alert"
          className="border-agent-error/40 bg-agent-error/10 text-agent-error rounded-(--radius-agent) border px-3 py-2 text-xs"
        >
          {error.message}
        </p>
      ) : null}

      {!props.standalone && chatCtx?.onOpenFitCheckDrawer ? (
        <button
          type="button"
          onClick={chatCtx.onOpenFitCheckDrawer}
          className="border-agent-outline-variant/60 border-t pt-3 text-left"
        >
          <p className="text-agent-on-surface-variant text-[11px]">
            Wording is the easy half.
          </p>
          <p className="text-agent-primary text-xs font-medium">
            Are you actually a fit? → Fit Check
          </p>
        </button>
      ) : null}

      {!props.standalone ? (
        <Button
          size="sm"
          variant="secondary"
          onClick={onGenerate}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 self-start rounded-lg"
        >
          <Icon
            name="refreshCw"
            className={cn("h-3.5 w-3.5", isPending && "animate-spin")}
          />
          {isPending ? "Re-running..." : "Re-run"}
        </Button>
      ) : null}
    </div>
  );
}

export default DeepAnalysisPanel;
