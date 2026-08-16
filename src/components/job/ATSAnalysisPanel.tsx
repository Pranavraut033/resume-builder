import { analyzeResume } from "@pranavraut033/ats-checker";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import SparklesIcon from "@/components/icons/SparklesIcon";
import { Button } from "@/components/ui/Button";
import { Icon, IconName } from "@/components/ui/Icon";
import { ProgressFill } from "@/components/ui/ProgressFill";
import { useJobPageContext } from "@/contexts/JobPageContext";
import { useFakeProgress } from "@/hooks/useFakeProgress";
import { cn } from "@/lib/cn";
import LLMService from "@/lib/llm/llmService";
import { resumeToText } from "@/lib/resumeToText";
import { useModelStore } from "@/store/modelStore";
import { ATSAnalysisJSON, ResumeJSON } from "@/types/resume";

import { useChatContext } from "../chat/ChatContext";
import { ModelSelector } from "../ModelSelector";
import { useToast } from "../ui/ToastProvider";

// ponytail: stable reference so the Zustand selector doesn't return a new
// array every render (was tripping React's getServerSnapshot-caching check
// and crashing the page). Pre-existing bug, unrelated to this change — fixed
// here only because it blocked verifying the inline editor in-browser.
const EMPTY_MODEL_PAIR: [] = [];

export type ATSAnalysisPanelProps =
  | {
      atsAnalysis?: ATSAnalysisJSON;
      standalone?: false; // if false or undefined, the panel is rendered within the chat and uses context data
    }
  | {
      atsAnalysis: ATSAnalysisJSON;
      standalone: true; // if true, the panel is rendered outside of the chat and should fetch its own analysis data
    };

/** One panel, four views. Back-navigation is rendered by this component
 * (a `‹ <section title>` sub-header below SideDrawer's own header) — see
 * `BackHeader` below. `SideDrawer` itself gains no back-arrow support. */
type View = "summary" | "rewrites" | "keywords" | "offline";

const SECTION_TITLE: Record<Exclude<View, "summary">, string> = {
  rewrites: "Suggested rewrites",
  keywords: "Keyword coverage",
  offline: "Keyword check (offline)",
};

function knockoutSeverityClasses(
  severity: ATSAnalysisJSON["knockout_risks"][number]["severity"]
): string {
  switch (severity) {
    case "blocking":
      return "bg-rose-100 text-rose-800 border-rose-200";
    case "likely":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "possible":
      return "bg-sky-100 text-sky-800 border-sky-200";
    default:
      return "bg-agent-surface-high text-agent-on-surface border-agent-outline-variant";
  }
}

/**
 * Locate the resume field holding `originalText` verbatim (summary,
 * experience description/achievements, project description, or volunteer
 * description) and return the minimal partial update to replace it with
 * `rewrite`. Placeholders like `[X%]` in `rewrite` are passed through
 * untouched — this never strips or auto-fills bracketed content.
 */
function applyRewriteToResume(
  resume: ResumeJSON,
  originalText: string,
  rewrite: string
): Partial<ResumeJSON> | null {
  if (resume.summary === originalText) {
    return { summary: rewrite };
  }

  if (resume.experience.some((exp) => exp.description === originalText)) {
    return {
      experience: resume.experience.map((exp) =>
        exp.description === originalText
          ? { ...exp, description: rewrite }
          : exp
      ),
    };
  }

  if (
    resume.experience.some((exp) => exp.achievements.includes(originalText))
  ) {
    return {
      experience: resume.experience.map((exp) =>
        exp.achievements.includes(originalText)
          ? {
              ...exp,
              achievements: exp.achievements.map((a) =>
                a === originalText ? rewrite : a
              ),
            }
          : exp
      ),
    };
  }

  if (resume.projects.some((proj) => proj.description === originalText)) {
    return {
      projects: resume.projects.map((proj) =>
        proj.description === originalText
          ? { ...proj, description: rewrite }
          : proj
      ),
    };
  }

  if (resume.volunteer?.some((vol) => vol.description === originalText)) {
    return {
      volunteer: resume.volunteer.map((vol) =>
        vol.description === originalText
          ? { ...vol, description: rewrite }
          : vol
      ),
    };
  }

  return null;
}

function FixKeywordsButton({
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
      className="relative mt-2 inline-flex w-full items-center justify-center gap-1.5 overflow-hidden rounded-lg"
    >
      <ProgressFill percent={percent} />
      <span className="relative z-10 inline-flex items-center gap-1.5">
        <SparklesIcon
          width="11"
          height="11"
          className={cn(isLoading && "animate-pulse")}
          aria-hidden
        />
        {isLoading ? "Weaving in..." : "Weave these in"}
      </span>
    </Button>
  );
}

function FixAllButton({
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
      variant="secondary"
      disabled={isLoading}
      onClick={onClick}
      className="rounded-agent relative inline-flex w-full items-center justify-center gap-2 overflow-hidden"
    >
      <ProgressFill percent={percent} />
      <span className="relative z-10 inline-flex items-center gap-2">
        <SparklesIcon
          width="14"
          height="14"
          className={cn(isLoading && "animate-pulse")}
          aria-hidden
        />
        {isLoading ? "Applying all..." : "Apply all"}
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

/** One row in the L1 summary's three drill-in list. Renders as a plain,
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

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={onClick}
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
    </button>
  );
}

export function ATSAnalysisPanel(props: ATSAnalysisPanelProps) {
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
  const [llmProvider, providerModel] = useModelStore(
    (state) => state.activeModelPair ?? EMPTY_MODEL_PAIR
  );

  const [view, setView] = useState<View>("summary");
  const [quickRefreshNonce, setQuickRefreshNonce] = useState(0);

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
    mutate: generateATSAnalysis,
    error,
    isPending,
  } = useMutation({
    mutationFn: async () => {
      if (props.standalone)
        throw new Error(
          "Recruiter skim cannot be generated in standalone mode"
        );

      if (llmProvider == null || providerModel == null) {
        throw new Error(
          "LLM provider and model must be selected to run the skim"
        );
      }

      if (!job) {
        throw new Error("Job context is required to run the skim");
      }

      return LLMService.analyzeATS(resume, job.details!, {
        model: providerModel,
        provider: llmProvider,
      });
    },
    onSuccess(data) {
      saveToDb("ats", data.result);
      setAtsAnalysis(data.result);
      setView("summary");
      pushToast({
        title: "Recruiter skim ready",
        description: "Blockers, rewrites, and keyword coverage are updated.",
        variant: "success",
      });
    },
    onError(e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";

      pushToast({
        title: "Couldn't run the skim",
        description: errorMessage,
        variant: "error",
      });
    },
  });

  const runPercent = useFakeProgress(isPending);

  const onGenerate = () => {
    generateATSAnalysis();
  };

  const onApplyRewrite = (originalText: string, rewrite: string) => {
    const updates = applyRewriteToResume(resume, originalText, rewrite);
    if (!updates) {
      pushToast({
        title: "Couldn't apply rewrite",
        description:
          "The original text no longer matches your resume exactly — it may have already been edited.",
        variant: "error",
      });
      return;
    }

    updateResumeState(updates, "Applied recruiter-skim rewrite suggestion");
    saveToDb("resume", { ...resume, ...updates }, customization);
    pushToast({
      title: "Rewrite applied",
      description: "The suggested rewrite has been applied to your resume.",
      variant: "success",
    });
  };

  const analysis = useMemo<ATSAnalysisJSON | null>(
    () => (props.standalone ? props.atsAnalysis : stateAtsAnalysis),
    [props.atsAnalysis, stateAtsAnalysis, props.standalone]
  );

  const keyWordMap = useMemo(() => {
    const map: Record<"exact" | "semantic" | "missing", string[]> = {
      exact: [],
      semantic: [],
      missing: [],
    };

    if (!analysis) return map;

    // Presence is the match_type itself now — "missing" ⟺ absent, anything
    // else (exact/semantic) ⟺ present. See types/resume.ts's ATSAnalysisSchema.
    analysis.keyword_analysis.forEach((item) =>
      map[item.match_type].push(item.keyword)
    );

    return map;
  }, [analysis]);

  const onFixAllRewrites = () => {
    if (!chatCtx) return;
    chatCtx
      .fixAllAtsIssues()
      .then(() =>
        pushToast({
          title: "Rewrites applied",
          description:
            "All applicable findings have been woven into your resume.",
          variant: "success",
        })
      )
      .catch((e: unknown) =>
        pushToast({
          title: "Couldn't apply rewrites",
          description: e instanceof Error ? e.message : "Unknown error",
          variant: "error",
        })
      );
  };

  const onFixMissingKeywords = (keywords: string[]) => {
    if (!chatCtx) return;
    chatCtx
      .fixMissingKeywords(keywords)
      .then(() =>
        pushToast({
          title: "Keywords applied",
          description: "Missing keywords have been woven into your resume.",
          variant: "success",
        })
      )
      .catch((e: unknown) =>
        pushToast({
          title: "Couldn't apply keywords",
          description: e instanceof Error ? e.message : "Unknown error",
          variant: "error",
        })
      );
  };

  const openOfflineRow = props.standalone
    ? undefined
    : () => setView("offline");

  const offlineMeta = quickAnalysis
    ? `${quickAnalysis.matchedKeywords.length} / ${
        quickAnalysis.matchedKeywords.length +
        quickAnalysis.missingKeywords.length
      } role terms present`
    : "Instant, deterministic. Coverage + parse.";

  // ── L2 views ─────────────────────────────────────────────────────────
  if (view !== "summary" && !props.standalone) {
    return (
      <div className="flex flex-col gap-4 p-4 pt-0 sm:p-5 sm:pt-0">
        <BackHeader
          title={SECTION_TITLE[view]}
          onBack={() => setView("summary")}
        />

        {view === "rewrites" && analysis ? (
          <>
            <div className="flex flex-col gap-2">
              {analysis.improvements.length === 0 ? (
                <p className="rounded-(--radius-agent) border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  No suggested rewrites — nothing here reads as a duty instead
                  of an outcome.
                </p>
              ) : (
                analysis.improvements.map((improvement, idx) => (
                  <div
                    key={`${improvement.section}-${idx}`}
                    className="border-agent-outline-variant bg-agent-surface-low rounded-lg border p-3"
                  >
                    <p className="text-agent-on-surface text-xs font-semibold">
                      {improvement.section}
                    </p>
                    <p className="text-agent-on-surface-variant mt-1 text-xs">
                      {improvement.issue}
                    </p>
                    {improvement.original_text && improvement.rewrite ? (
                      <div className="mt-2 space-y-1.5">
                        <p className="rounded-(--radius-agent-sm) bg-rose-50 px-2 py-1 text-[11px] leading-relaxed text-black/80 line-through decoration-rose-400/70">
                          {improvement.original_text}
                        </p>
                        {/* Fixed dark green, not text-agent-on-surface: the
                            bg-emerald-50 here is a hardcoded light swatch, so a
                            theme-adaptive text color goes near-white on it in
                            dark mode and the rewrite becomes unreadable. */}
                        <p className="rounded-(--radius-agent-sm) border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] leading-relaxed text-emerald-900">
                          {improvement.rewrite}
                        </p>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            onApplyRewrite(
                              improvement.original_text!,
                              improvement.rewrite!
                            )
                          }
                          className="mt-1 inline-flex items-center gap-1.5 rounded-lg"
                        >
                          <SparklesIcon width="11" height="11" aria-hidden />
                          Apply rewrite
                        </Button>
                      </div>
                    ) : (
                      <p className="bg-agent-surface-high mt-2 rounded-(--radius-agent-sm) px-2 py-1 text-[11px] leading-relaxed text-black/80">
                        {improvement.recommended_fix}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            {chatCtx && analysis.improvements.length > 0 ? (
              <div className="border-agent-outline-variant/70 bg-agent-surface-lowest sticky bottom-0 z-10 -mx-4 -mb-4 border-t px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur-xs sm:-mx-5 sm:-mb-5 sm:px-5">
                <FixAllButton
                  isLoading={chatCtx.isLoading}
                  onClick={onFixAllRewrites}
                />
              </div>
            ) : null}
          </>
        ) : null}

        {view === "keywords" && analysis ? (
          <div className="flex flex-col gap-4">
            {(["exact", "semantic", "missing"] as const).map(
              (matchType) =>
                keyWordMap[matchType].length > 0 && (
                  <div key={matchType}>
                    <p
                      className={cn(
                        "mb-2 text-xs font-medium uppercase",
                        matchType === "exact"
                          ? "text-emerald-700"
                          : matchType === "semantic"
                            ? "text-sky-700"
                            : "text-rose-700"
                      )}
                    >
                      {matchType === "missing"
                        ? "Missing"
                        : `${matchType} match`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {keyWordMap[matchType].map((keyword) => (
                        <span
                          key={keyword}
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                            matchType === "exact"
                              ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                              : matchType === "semantic"
                                ? "border-sky-200 bg-sky-100 text-sky-800"
                                : "border-rose-200 bg-rose-100 text-rose-800"
                          )}
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                    {matchType === "missing" && chatCtx ? (
                      <FixKeywordsButton
                        isLoading={chatCtx.isLoading}
                        onClick={() => onFixMissingKeywords(keyWordMap.missing)}
                      />
                    ) : null}
                  </div>
                )
            )}
            {keyWordMap.exact.length === 0 &&
            keyWordMap.semantic.length === 0 &&
            keyWordMap.missing.length === 0 ? (
              <p className="text-agent-on-surface-variant text-xs">
                No keyword data yet.
              </p>
            ) : null}
          </div>
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
                    <span className="text-amber-700">
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
                    {chatCtx ? (
                      <FixKeywordsButton
                        isLoading={chatCtx.isLoading}
                        onClick={() =>
                          onFixMissingKeywords(quickAnalysis.missingKeywords)
                        }
                      />
                    ) : null}
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
            How a recruiter sees this in 5 seconds.
          </p>
          <p className="text-agent-on-surface-variant mt-1 text-xs">
            Not an ATS score — no ATS shows one.
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
              {isPending ? "Running the skim..." : "Run the skim"}
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
  const blockerCount = analysis.knockout_risks.length;
  const coveredCount = keyWordMap.exact.length + keyWordMap.semantic.length;
  const missingCount = keyWordMap.missing.length;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5">
      {blockerCount === 0 ? (
        <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-semibold text-emerald-800">
            No hard blockers found
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-emerald-700">
            Nothing here should trip an application form's knockout questions.
          </p>
        </article>
      ) : (
        <article className="rounded-lg border border-rose-200 bg-rose-50 p-3">
          <p className="text-xs font-semibold text-rose-800">
            {blockerCount} hard blocker{blockerCount === 1 ? "" : "s"}
          </p>
          <ul className="mt-2 space-y-1">
            {analysis.knockout_risks.map((risk, idx) => (
              <li
                key={`${risk.requirement}-${idx}`}
                className="text-[11px] leading-relaxed text-rose-800"
              >
                <span
                  className={cn(
                    "mr-1.5 inline-flex rounded-full border px-1.5 py-0 align-middle text-[10px] font-medium",
                    knockoutSeverityClasses(risk.severity)
                  )}
                >
                  {risk.severity}
                </span>
                {risk.requirement} — {risk.evidence}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] leading-relaxed text-rose-700/80">
            These are form questions, not parsing.
          </p>
        </article>
      )}

      <article className="border-agent-outline-variant bg-agent-surface-low rounded-lg border p-3">
        <p className="text-agent-on-surface text-xs font-semibold">
          Skim verdict
        </p>
        <p className="text-agent-on-surface-variant mt-1 text-xs leading-relaxed">
          {analysis.summary}
        </p>
        {/* Title alignment earns a line here because under-titling yourself is
            one of the most common resume mistakes, and a title-weighted system
            (Workday et al.) is one of the few places a literal string match
            genuinely moves the needle. Only worth surfacing when it's off. */}
        {analysis.title_alignment.verdict !== "aligned" &&
        analysis.title_alignment.note ? (
          <p className="border-agent-outline-variant/70 text-agent-on-surface-variant mt-3 border-t pt-3 text-[11px] leading-relaxed">
            <span className="text-agent-on-surface font-medium">
              Title reads {analysis.title_alignment.verdict}:
            </span>{" "}
            {analysis.title_alignment.note}
          </p>
        ) : null}
      </article>

      <div className="flex flex-col gap-2">
        <DrillInRow
          icon="sparkles"
          label={`${analysis.improvements.length} suggested rewrite${
            analysis.improvements.length === 1 ? "" : "s"
          }`}
          onClick={props.standalone ? undefined : () => setView("rewrites")}
        />
        <DrillInRow
          icon="search"
          label={`Keywords · ${coveredCount} covered, ${missingCount} missing`}
          onClick={props.standalone ? undefined : () => setView("keywords")}
        />
        <DrillInRow
          icon="checkCircle"
          label="Keyword check (offline)"
          meta={offlineMeta}
          onClick={props.standalone ? undefined : openOfflineRow}
        />
      </div>

      {error instanceof Error ? (
        <p
          role="alert"
          className="border-agent-error/40 bg-agent-error/10 text-agent-error rounded-(--radius-agent) border px-3 py-2 text-xs"
        >
          {error.message}
        </p>
      ) : null}

      {!props.standalone && chatCtx?.onOpenGapDrawer ? (
        <button
          type="button"
          onClick={chatCtx.onOpenGapDrawer}
          className="border-agent-outline-variant/60 border-t pt-3 text-left"
        >
          <p className="text-agent-on-surface-variant text-[11px]">
            Keywords are the easy half.
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

export default ATSAnalysisPanel;
