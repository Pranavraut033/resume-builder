import { analyzeResume } from "@pranavraut033/ats-checker";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import SparklesIcon from "@/components/icons/SparklesIcon";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ProgressFill } from "@/components/ui/ProgressFill";
import { useJobPageContext } from "@/contexts/JobPageContext";
import { useFakeProgress } from "@/hooks/useFakeProgress";
import { cn } from "@/lib/cn";
import LLMService from "@/lib/llm/llmService";
import { resumeToText } from "@/lib/resumeToText";
import { useModelStore } from "@/store/modelStore";
import { ATSAnalysisJSON } from "@/types/resume";

import { ATSScorePanel } from "./ATSScorePanel";
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

type ScoreKey = keyof ATSAnalysisJSON["scores"];

const SCORE_META: Array<{
  key: ScoreKey;
  label: string;
  description: string;
  emphasize?: boolean;
}> = [
  {
    key: "keyword_match_score",
    label: "Keyword Match Score",
    description: "Coverage of role-critical keywords and intent alignment.",
  },
  {
    key: "formatting_score",
    label: "Formatting Score",
    description: "Readability, section structure, and ATS parser clarity.",
  },
  {
    key: "content_quality_score",
    label: "Content Quality Score",
    description: "Specificity, achievement framing, and relevance depth.",
  },
  {
    key: "composite_score",
    label: "Composite Score",
    description: "Weighted overall readiness for ATS shortlisting.",
    emphasize: true,
  },
];

function normalizeScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreTierClasses(score: number): string {
  if (score >= 85) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 70) return "text-sky-700 bg-sky-50 border-sky-200";
  if (score >= 50) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-rose-700 bg-rose-50 border-rose-200";
}

// function severityClasses(
//   severity: ATSAnalysisJSON["formatting_issues"][number]["severity"]
// ): string {
//   switch (severity) {
//     case "high":
//       return "bg-rose-100 text-rose-800 border-rose-200";
//     case "medium":
//       return "bg-amber-100 text-amber-800 border-amber-200";
//     case "low":
//       return "bg-emerald-100 text-emerald-800 border-emerald-200";
//     default:
//       return "bg-agent-surface-low text-agent-on-surface border-agent-outline-variant";
//   }
// }

function ScoreMeter({ score }: { score: number }) {
  const value = normalizeScore(score);
  const filledSegments = Math.round(value / 10);

  return (
    <div className="grid grid-cols-10 gap-1" aria-hidden>
      {Array.from({ length: 10 }, (_, idx) => (
        <span
          key={idx}
          className={cn(
            "h-1.5 rounded-full transition-colors",
            idx < filledSegments
              ? value >= 85
                ? "bg-emerald-500"
                : value >= 70
                  ? "bg-sky-500"
                  : value >= 50
                    ? "bg-amber-500"
                    : "bg-rose-500"
              : "bg-agent-surface-high"
          )}
        />
      ))}
    </div>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={cn(
        "bg-agent-surface-high/80 animate-pulse rounded-md",
        className
      )}
    />
  );
}

function EmptyOrLoadingState({
  loading,
  error,
  onGenerate,
}: {
  loading: boolean;
  error?: string;
  onGenerate: () => void;
}) {
  const percent = useFakeProgress(loading);

  return (
    <section className="border-agent-outline-variant bg-agent-surface overflow-hidden rounded-(--radius-agent-xl) border shadow-(--shadow-agent-card)">
      <div className="border-agent-outline-variant/70 bg-agent-surface-low border-b px-5 py-4">
        <h2 className="font-agent-display text-agent-on-surface text-base font-semibold">
          ATS Analysis
        </h2>
        <p className="text-agent-on-surface-variant mt-1 text-xs">
          Generate a full ATS snapshot to prioritize high-impact resume updates.
        </p>
      </div>

      <div className="space-y-4 p-5">
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="border-agent-outline-variant/80 bg-agent-surface-low rounded-lg border p-4"
                >
                  <SkeletonBlock className="h-3 w-24" />
                  <SkeletonBlock className="mt-3 h-7 w-16" />
                  <SkeletonBlock className="mt-3 h-1.5 w-full" />
                </div>
              ))}
            </div>
            <SkeletonBlock className="h-16 w-full" />
            <SkeletonBlock className="h-24 w-full" />
          </div>
        ) : (
          <div className="border-agent-outline bg-agent-surface-low rounded-lg border border-dashed p-5">
            <h3 className="font-agent-display text-agent-on-surface text-sm font-semibold">
              No analysis generated yet
            </h3>
            <p className="text-agent-on-surface-variant mt-1 text-xs leading-relaxed">
              Run ATS analysis to evaluate keyword coverage, formatting quality,
              and high-confidence improvements for this role.
            </p>
          </div>
        )}

        {error ? (
          <p
            role="alert"
            className="border-agent-error/40 bg-agent-error/10 text-agent-error rounded-(--radius-agent) border px-3 py-2 text-xs"
          >
            {error}
          </p>
        ) : null}

        <Button
          onClick={onGenerate}
          disabled={loading}
          variant="gradient"
          className="relative w-full overflow-hidden rounded-lg"
        >
          <ProgressFill percent={percent} />
          <span className="relative z-10">
            {loading ? "Generating Analysis..." : "Generate ATS Analysis"}
          </span>
        </Button>
      </div>
    </section>
  );
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
        {isLoading ? "Fixing keywords..." : "Fix with AI"}
      </span>
    </Button>
  );
}

export function ATSAnalysisPanel(props: ATSAnalysisPanelProps) {
  const {
    resume,
    job,
    saveToDb,
    setAtsAnalysis,
    atsAnalysis: stateAtsAnalysis,
    saveStatus,
  } = useJobPageContext();

  const chatCtx = useChatContext(true);
  const [llmProvider, providerModel] = useModelStore(
    (state) => state.activeModelPair ?? EMPTY_MODEL_PAIR
  );

  const [tab, setTab] = useState<"quick" | "ai">("quick");
  const [quickRefreshNonce, setQuickRefreshNonce] = useState(0);

  const quickAnalysis = useMemo(() => {
    if (props.standalone || !job?.details?.raw_description) return null;
    return analyzeResume({
      resumeText: resumeToText(resume),
      jobDescription: job.details.raw_description,
    });
    // quickRefreshNonce is an intentional no-op dep — analyzeResume is
    // deterministic over resume/job, so this only exists to let the
    // "Regenerate" button force a recompute on demand.
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
    isSuccess,
  } = useMutation({
    mutationFn: async () => {
      if (props.standalone)
        throw new Error("ATS analysis cannot be generated in standalone mode");

      if (llmProvider == null || providerModel == null) {
        throw new Error(
          "LLM provider and model must be selected for ATS analysis"
        );
      }

      if (!job) {
        throw new Error("Job context is required for ATS analysis");
      }

      return LLMService.analyzeATS(resume, job.details!, {
        model: providerModel,
        provider: llmProvider,
      });
    },
    onSuccess(data) {
      if (saveStatus !== "saving") {
        saveToDb("ats", data.result);
        setAtsAnalysis(data.result);
      }
      pushToast({
        title: "ATS analysis generated",
        description: "Your resume's ATS analysis has been updated.",
        variant: "success",
      });
    },
    onError(e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";

      pushToast({
        title: "Failed to generate ATS analysis",
        description: errorMessage,
        variant: "error",
      });
    },
  });

  const regeneratePercent = useFakeProgress(isPending);

  const onGenerate = () => {
    generateATSAnalysis();
  };

  const analysis = useMemo<ATSAnalysisJSON | null>(
    () => (props.standalone ? props.atsAnalysis : stateAtsAnalysis),
    [props.atsAnalysis, stateAtsAnalysis, props.standalone]
  );

  const keyWordMap = useMemo(() => {
    if (!analysis)
      return {
        exact: [],
        semantic: [],
        missing: [],
      };

    const map: Record<
      "exact" | "semantic" | "missing",
      [present: boolean, keyword: string][]
    > = {
      exact: [],
      semantic: [],
      missing: [],
    };

    analysis.keyword_analysis.forEach((item) =>
      map[item.match_type].push([item.match_status === "present", item.keyword])
    );

    return {
      exact: map.exact.sort((a, b) => Number(b[0]) - Number(a[0])), // present keywords first
      semantic: map.semantic.sort((a, b) => Number(b[0]) - Number(a[0])), // present keywords first
      missing: map.missing,
    };
  }, [analysis]);

  const tabBar = !props.standalone && (
    <div className="border-agent-outline-variant/60 mb-1 flex gap-1 border-b pb-0">
      {(["quick", "ai"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTab(t)}
          className={cn(
            "px-3 py-2 text-xs font-medium transition-colors",
            tab === t
              ? "border-agent-primary text-agent-on-surface border-b-2"
              : "text-agent-on-surface-variant hover:text-agent-on-surface"
          )}
        >
          {t === "quick" ? "Quick Check" : "AI Analysis"}
        </button>
      ))}
    </div>
  );

  if (tab === "quick" && !props.standalone) {
    return (
      <section
        className={cn("space-y-4 p-4 sm:p-5", {
          "border-agent-outline-variant bg-agent-surface rounded-agent-xl shadow-agent-card border":
            !props.standalone,
        })}
      >
        {tabBar}
        <div className="flex items-center justify-between">
          <span className="text-agent-on-surface-variant text-xs">
            Recalculates instantly from your current resume — no AI call.
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setQuickRefreshNonce((n) => n + 1)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg"
          >
            <Icon name="refreshCw" className="h-3.5 w-3.5" />
            Regenerate
          </Button>
        </div>
        <ATSScorePanel analysis={quickAnalysis} />
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
      </section>
    );
  }

  if (!analysis) {
    return (
      <>
        {tabBar && (
          <div className="border-agent-outline-variant bg-agent-surface rounded-agent-xl shadow-agent-card space-y-0 border p-4 sm:p-5">
            {tabBar}
            <EmptyOrLoadingState
              loading={isPending}
              error={error instanceof Error ? error.message : undefined}
              onGenerate={onGenerate}
            />
          </div>
        )}
        {!tabBar && (
          <EmptyOrLoadingState
            loading={isPending}
            error={error instanceof Error ? error.message : undefined}
            onGenerate={onGenerate}
          />
        )}
      </>
    );
  }

  return (
    <section
      className={cn("space-y-4 p-4 sm:p-5", {
        "border-agent-outline-variant bg-agent-surface rounded-agent-xl shadow-agent-card border":
          !props.standalone,
      })}
    >
      {tabBar}
      <header className="border-agent-outline-variant/80 flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-agent-display text-agent-on-surface text-base font-semibold">
            ATS Analysis{" "}
            <span className="border-agent-outline-variant bg-agent-tertiary-fixed/80 text-agent-on-tertiary-fixed inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium">
              {isSuccess ? "Generated" : "Ready"}
            </span>
          </h2>
          <p className="text-agent-on-surface-variant mt-1 text-xs">
            Compact KPI view with targeted fixes to boost shortlisting outcomes.
          </p>
        </div>
      </header>
      {props.standalone ? null : (
        <div className="flex flex-col gap-2">
          <span className="text-xs">
            Generate use <ModelSelector variant="minimal" />
          </span>
          <Button
            size="sm"
            variant="primary"
            onClick={onGenerate}
            disabled={isPending}
            className="rounded-agent relative inline-flex items-center gap-2 overflow-hidden"
          >
            <ProgressFill percent={regeneratePercent} />
            <span className="relative z-10 inline-flex items-center gap-2">
              <SparklesIcon
                width="14"
                height="14"
                className={cn(isPending && "animate-pulse")}
                aria-hidden
              />
              {isPending ? "Regenerating..." : "Regenerate"}
            </span>
          </Button>
        </div>
      )}
      {error instanceof Error ? (
        <p
          role="alert"
          className="border-agent-error/40 bg-agent-error/10 text-agent-error rounded-(--radius-agent) border px-3 py-2 text-xs"
        >
          {error.message}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        {SCORE_META.filter((a) => a.key !== "formatting_score").map((item) => {
          const score = normalizeScore(analysis.scores[item.key]);
          const tier = scoreTierClasses(score);

          return (
            <article
              key={item.key}
              className={cn(
                "rounded-lg border p-4",
                item.key === "composite_score" ? "col-span-2" : "col-span-1",
                item.emphasize
                  ? "bg-agent-primary/10 border-agent-primary/30"
                  : "bg-agent-surface-low border-agent-outline-variant",
                !item.emphasize && "hover:bg-agent-surface-high/70"
              )}
            >
              <p className="text-agent-on-surface-variant text-[11px] font-medium tracking-wide uppercase">
                {item.label}
              </p>
              <div className="mt-2 flex items-end justify-between">
                <span
                  className={cn(
                    "font-agent-display rounded-md border px-2 py-1 text-2xl leading-none font-semibold",
                    tier,
                    item.emphasize && "text-3xl"
                  )}
                >
                  {score}
                </span>
                <span className="text-agent-on-surface-variant text-[11px]">
                  out of 100
                </span>
              </div>
              <div className="mt-3">
                <ScoreMeter score={score} />
              </div>
              <p className="text-agent-on-surface-variant mt-2 text-[11px] leading-relaxed">
                {item.description}
              </p>
            </article>
          );
        })}
      </div>

      <article className="border-agent-outline-variant bg-agent-surface-low rounded-lg border p-4">
        <h3 className="text-agent-on-surface text-sm font-semibold">Summary</h3>
        <p className="text-agent-on-surface-variant mt-2 text-xs leading-relaxed">
          {analysis.summary}
        </p>
      </article>

      <article className="border-agent-outline-variant bg-agent-surface-low rounded-lg border p-4">
        <h3 className="text-agent-on-surface text-sm font-semibold">
          Keyword Analysis
        </h3>
        <div className="mt-3 flex flex-col gap-4">
          {Object.entries(keyWordMap).map(
            ([matchType, keywords]) =>
              keywords.length > 0 && (
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
                    {matchType.toUpperCase()} MATCH
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {keywords.map(([present, keyword], idx) => (
                      <span
                        key={`${keyword}-${idx}`}
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          present
                            ? matchType === "exact"
                              ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                              : "border-sky-200 bg-sky-100 text-sky-800"
                            : "border-rose-200 bg-rose-100 text-rose-800"
                        )}
                      >
                        {keyword}
                      </span>
                    ))}
                    {matchType === "missing" &&
                      (keywords.length === 0 ? (
                        <span className="text-agent-on-surface-variant text-xs">
                          No missing keywords! Great job.
                        </span>
                      ) : !props.standalone && chatCtx ? (
                        <FixKeywordsButton
                          isLoading={chatCtx.isLoading}
                          onClick={() =>
                            chatCtx
                              .fixMissingKeywords(keywords.map(([, k]) => k))
                              .then(() =>
                                pushToast({
                                  title: "Keywords applied",
                                  description:
                                    "Missing keywords have been woven into your resume.",
                                  variant: "success",
                                })
                              )
                              .catch((e: unknown) =>
                                pushToast({
                                  title: "Failed to fix keywords",
                                  description:
                                    e instanceof Error
                                      ? e.message
                                      : "Unknown error",
                                  variant: "error",
                                })
                              )
                          }
                        />
                      ) : null)}
                  </div>
                </div>
              )
          )}
        </div>
      </article>
      {/*
        <article className="border-agent-outline-variant bg-agent-surface-low rounded-lg border p-4">
          <h3 className="text-agent-on-surface text-sm font-semibold">
            Missing Keywords
          </h3>

          {analysis.missing_keywords.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {analysis.missing_keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800"
                >
                  {keyword}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-(--radius-agent) border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Great coverage. No missing keywords detected.
            </p>
          )}
        </article>
    */}
      {/* <article className="border-agent-outline-variant bg-agent-surface-low rounded-lg border p-4">
        <h3 className="text-agent-on-surface text-sm font-semibold">
          Formatting Issues
        </h3>

        <div className="mt-3 space-y-2">
          {analysis.formatting_issues.length === 0 ? (
            <p className="rounded-(--radius-agent) border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              No formatting blockers found.
            </p>
          ) : (
            analysis.formatting_issues.map((issue, idx) => (
              <div
                key={`${issue.section}-${idx}`}
                className="border-agent-outline-variant bg-agent-surface rounded-(--radius-agent) border p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-agent-on-surface text-xs font-semibold">
                    {issue.section}
                  </p>
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      severityClasses(issue.severity)
                    )}
                  >
                    {issue.severity}
                  </span>
                </div>
                <p className="text-agent-on-surface-variant mt-1 text-xs leading-relaxed">
                  {issue.description}
                </p>
              </div>
            ))
          )}
        </div>
      </article> */}

      <article className="border-agent-outline-variant bg-agent-surface-low rounded-lg border p-4">
        <h3 className="text-agent-on-surface text-sm font-semibold">
          Improvements
        </h3>

        <div className="mt-3 grid grid-cols-1 gap-2">
          {analysis.improvements.map((improvement, idx) => (
            <div
              key={`${improvement.section}-${idx}`}
              className="border-agent-outline-variant bg-agent-surface rounded-(--radius-agent) border p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-agent-on-surface text-xs font-semibold">
                  {improvement.section}
                </p>
                <span className="border-agent-primary/30 bg-agent-primary/10 text-agent-primary rounded-full border px-2 py-0.5 text-xs font-semibold">
                  +{normalizeScore(improvement.estimated_score_delta)}
                </span>
              </div>
              <p className="text-agent-on-surface mt-1 text-xs">
                {improvement.issue}
              </p>
              <p className="bg-agent-surface-high text-agent-on-surface-variant mt-2 rounded-(--radius-agent-sm) px-2 py-1 text-[11px] leading-relaxed">
                {improvement.recommended_fix}
              </p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

export default ATSAnalysisPanel;
