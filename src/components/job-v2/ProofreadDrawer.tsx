"use client";

import { useState } from "react";

import { ModelSelector } from "@/components/ModelSelector";
import { Icon } from "@/components/ui/Icon";
import useProofreadResume from "@/hooks/useProofreadResume";
import cn from "@/lib/cn";
import { applyProofreadFixes } from "@/lib/proofread/applyFixes";
import { useModelStore } from "@/store/modelStore";
import { ProofreadIssue } from "@/types/proofread";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

import { SideDrawer } from "./SideDrawer";

interface ProofreadDrawerProps {
  open: boolean;
  onClose: () => void;
  resume: ResumeJSON;
  jobDetails?: JobDetailsJSON | null;
  onApply: (result: ReturnType<typeof applyProofreadFixes>) => void;
}

// Provenance categories need the base profile to judge — their suggestion is
// usually "delete this", so they're never pre-ticked and get a visually
// distinct chip regardless of severity.
const PROVENANCE_CATEGORIES = new Set<ProofreadIssue["category"]>([
  "unsupported_addition",
  "altered_fact",
]);

const SEVERITY_ORDER: ProofreadIssue["severity"][] = [
  "error",
  "warning",
  "suggestion",
];

const SEVERITY_META: Record<
  ProofreadIssue["severity"],
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

function categoryLabel(category: ProofreadIssue["category"]): string {
  return category
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * ProofreadDrawer — slides in from the right like HumanizerDrawer/ATSDrawer.
 * Splash (what it does + model picker + Start) → pending → issue list grouped
 * by severity, or "no issues found". Resets to the splash on every close so
 * reopening always starts fresh.
 */
export function ProofreadDrawer({
  open,
  onClose,
  resume,
  jobDetails,
  onApply,
}: ProofreadDrawerProps) {
  const activeModelPair = useModelStore((s) => s.activeModelPair);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  // Issues currently rendered — starts as the full LLM+lint result, shrinks
  // to just the not-yet-applied ones after each Apply pass so successfully
  // applied fixes drop off while stragglers stay visible with a note.
  const [visibleIssues, setVisibleIssues] = useState<ProofreadIssue[]>([]);
  const [unappliedOriginals, setUnappliedOriginals] = useState<Set<string>>(
    new Set()
  );
  const [summary, setSummary] = useState("");

  const {
    mutate: proofread,
    status,
    reset,
  } = useProofreadResume({
    onSuccess: (result) => {
      setUnappliedOriginals(new Set());
      setSummary(result.result.summary);
      setVisibleIssues(result.result.issues);
      setSelected(
        new Set(
          result.result.issues
            .map((issue, i) =>
              (issue.severity === "error" || issue.severity === "warning") &&
              !PROVENANCE_CATEGORIES.has(issue.category)
                ? i
                : -1
            )
            .filter((i) => i !== -1)
        )
      );
    },
  });

  const isLoading = status === "pending";
  const issues = visibleIssues;

  const groupedIssues = SEVERITY_ORDER.flatMap((severity) =>
    issues
      .map((issue, i) => ({ issue, index: i }))
      .filter(({ issue }) => issue.severity === severity)
  );

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
    setVisibleIssues([]);
    setUnappliedOriginals(new Set());
    setSummary("");
  };

  const handleStart = () => {
    setVisibleIssues([]);
    setUnappliedOriginals(new Set());
    setSummary("");
    proofread({ resume, jobDetails });
  };

  const handleApply = () => {
    const selectedIssues = issues.filter((_, i) => selected.has(i));
    const untouchedIssues = issues.filter((_, i) => !selected.has(i));
    const result = applyProofreadFixes(resume, selectedIssues);
    onApply(result);

    if (result.unapplied.length === 0) {
      handleClose();
      return;
    }

    // Keep unapplied selections visible (with a note) alongside any issues
    // the user never ticked in the first place; drop the ones that applied.
    setUnappliedOriginals(new Set(result.unapplied.map((i) => i.original)));
    setVisibleIssues([...result.unapplied, ...untouchedIssues]);
    setSelected(new Set());
  };

  return (
    <SideDrawer
      open={open}
      onClose={handleClose}
      icon="spellCheck"
      title="Proofread"
      footer={
        status === "success" && issues.length > 0 ? (
          <div className="border-agent-outline-variant flex justify-end gap-2 border-t px-4 py-3">
            <button
              onClick={handleClose}
              className="text-agent-on-surface-variant hover:bg-agent-surface-container rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={handleApply}
              disabled={selected.size === 0}
              className="bg-agent-primary text-agent-on-primary rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply selected ({selected.size})
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="flex-1 overflow-y-auto p-4">
        {status === "idle" && (
          <div className="flex flex-col gap-4">
            <div className="text-agent-on-surface-variant flex items-start gap-3 text-sm">
              <Icon
                name="spellCheck"
                className="text-agent-primary mt-0.5 h-5 w-5 shrink-0"
              />
              <p>
                Checks the resume for typos, formatting inconsistencies,
                duplicated bullets, keyword stuffing, and claims that don&apos;t
                match your base profile. You review and pick which fixes to
                apply — nothing is changed automatically.
              </p>
            </div>

            <ModelSelector label="Select model" variant="compact" />

            <button
              onClick={handleStart}
              disabled={!activeModelPair}
              className="bg-agent-primary text-agent-on-primary flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="spellCheck" className="h-4 w-4" />
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
            Proofreading…
          </div>
        )}

        {status === "success" && issues.length === 0 && (
          <p className="text-agent-on-surface-variant py-8 text-center text-sm">
            No issues found.
          </p>
        )}

        {status === "success" && issues.length > 0 && (
          <div className="flex flex-col gap-3">
            {summary && (
              <p className="text-agent-on-surface-variant text-xs">{summary}</p>
            )}
            <ul className="space-y-3">
              {groupedIssues.map(({ issue, index }) => {
                const isProvenance = PROVENANCE_CATEGORIES.has(issue.category);
                const severityMeta = SEVERITY_META[issue.severity];
                const couldNotApply = unappliedOriginals.has(issue.original);

                return (
                  <li
                    key={index}
                    className="border-agent-outline-variant bg-agent-surface-lowest rounded-lg border p-3"
                  >
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected.has(index)}
                        onChange={() => toggle(index)}
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
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                              isProvenance
                                ? "border-agent-tertiary/30 bg-agent-tertiary/10 text-agent-tertiary"
                                : "border-agent-outline-variant bg-agent-surface-high text-agent-on-surface"
                            )}
                          >
                            {categoryLabel(issue.category)}
                          </span>
                        </div>
                        <p className="text-agent-on-surface-variant mb-1 text-xs font-medium">
                          {issue.location}
                        </p>
                        {isProvenance && (
                          <p className="text-agent-tertiary mb-1 text-xs">
                            Not found in your base profile — verify before
                            applying.
                          </p>
                        )}
                        {issue.original && (
                          <p className="mb-1 text-red-600 line-through">
                            {issue.original}
                          </p>
                        )}
                        {issue.suggestion && (
                          <p className="text-green-700">{issue.suggestion}</p>
                        )}
                        <p className="text-agent-on-surface-variant mt-1 text-xs">
                          {issue.explanation}
                        </p>
                        {couldNotApply && (
                          <p className="mt-1 text-xs font-medium text-amber-700">
                            Couldn&apos;t apply automatically — edit manually.
                          </p>
                        )}
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </SideDrawer>
  );
}
