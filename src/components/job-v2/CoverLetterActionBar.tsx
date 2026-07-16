"use client";

import { useRef, useState } from "react";

import { ModelSelector } from "@/components/ModelSelector";
import { Icon } from "@/components/ui/Icon";
import { ProgressFill } from "@/components/ui/ProgressFill";
import { useToast } from "@/components/ui/ToastProvider";
import { useJobPageContext } from "@/contexts/JobPageContext";
import { useFakeProgress } from "@/hooks/useFakeProgress";
import useGenerateCoverLetter from "@/hooks/useGenerateCoverLetter";
import useHumanizeContent from "@/hooks/useHumanizeContent";
import cn from "@/lib/cn";
import { applyChangesToText } from "@/lib/humanizer/applyChanges";
import { htmlToText } from "@/lib/resumeToText";

import { HumanizerModal } from "./HumanizerModal";

const INSTRUCTION_SUGGESTIONS = [
  "Keep it under 250 words",
  "Use a formal / conversational tone",
  "Emphasize leadership experience",
  "Highlight remote-work skills",
  "Focus on culture fit over technical skills",
];

/**
 * CoverLetterActionBar — floating action bar that appears above the cover letter
 * document canvas in V2. Provides Generate + Model selector controls.
 */
export function CoverLetterActionBar() {
  const {
    coverLetter,
    resume,
    job,
    customization,
    updateCoverLetterState,
    saveToDb,
    refetch,
  } = useJobPageContext();

  const [customInstructions, setCustomInstructions] = useState("");
  const [showTip, setShowTip] = useState(false);
  const [isHumanizerOpen, setIsHumanizerOpen] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);

  const { pushToast } = useToast();

  const { mutate: generateCoverLetter, status } = useGenerateCoverLetter({
    onSuccess: (generated) => {
      updateCoverLetterState(generated.result);
      refetch(undefined, "coverLetter");
      saveToDb("coverLetter", generated.result, customization);
    },
    onError: (err) => {
      pushToast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "error",
      });
    },
  });

  const {
    mutate: humanize,
    data: humanizeResult,
    status: humanizeStatus,
    reset: resetHumanize,
  } = useHumanizeContent({
    onError: (err) => {
      pushToast({
        title: "Humanize failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "error",
      });
      setIsHumanizerOpen(false);
    },
  });

  const isGenerating = status === "pending";
  const isHumanizing = humanizeStatus === "pending";
  const generatePercent = useFakeProgress(isGenerating);
  const humanizePercent = useFakeProgress(isHumanizing);

  const handleHumanizeAccept = (
    selected: NonNullable<typeof humanizeResult>["result"]["changes"]
  ) => {
    const next = applyChangesToText(coverLetter, selected);
    updateCoverLetterState(next);
    refetch(undefined, "coverLetter");
    saveToDb("coverLetter", next, customization);
    setIsHumanizerOpen(false);
    resetHumanize();
    pushToast({ title: "Cover letter updated", variant: "success" });
  };

  return (
    <div
      className={cn(
        "border-agent-outline-variant bg-agent-surface-lowest/90 shadow-agent-float mx-auto mb-3 flex flex-col gap-2 rounded-xl border px-3 py-2 backdrop-blur-sm",
        "w-full max-w-[794px]"
      )}
    >
      {/* Top row: icon + model + generate */}
      <div className="flex items-center gap-2.5">
        <Icon name="sparkles" className="text-agent-primary h-4 w-4 shrink-0" />

        <div className="flex-1">
          <ModelSelector label="Model" variant="compact" className="w-auto" />
        </div>

        <button
          onClick={() =>
            generateCoverLetter({
              resume,
              jobData: job?.details,
              customInstructions: customInstructions.trim() || undefined,
            })
          }
          disabled={isGenerating}
          className={cn(
            "relative flex items-center gap-1.5 overflow-hidden rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
            "from-agent-primary to-agent-primary-container bg-linear-to-r text-white",
            "hover:-translate-y-px hover:opacity-90",
            "disabled:cursor-not-allowed disabled:opacity-90"
          )}
        >
          <ProgressFill percent={generatePercent} />
          <span className="relative z-10 flex items-center gap-1.5">
            {isGenerating ? (
              <span className="animate-spin">
                <Icon name="loader-2" className="h-3.5 w-3.5" />
              </span>
            ) : (
              <Icon name="zap" className="h-3.5 w-3.5" />
            )}
            {isGenerating ? "Generating…" : "Generate"}
          </span>
        </button>

        <button
          onClick={() => {
            setIsHumanizerOpen(true);
            humanize({ text: htmlToText(coverLetter) });
          }}
          disabled={isHumanizing || !coverLetter.trim()}
          className={cn(
            "border-agent-outline-variant text-agent-on-surface-variant hover:bg-agent-surface-container hover:text-agent-on-surface relative flex items-center gap-1.5 overflow-hidden rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all",
            "disabled:cursor-not-allowed disabled:opacity-90"
          )}
          title="Humanize"
        >
          <ProgressFill
            percent={humanizePercent}
            className="bg-agent-primary/10"
          />
          <span className="relative z-10 flex items-center gap-1.5">
            <Icon
              name={isHumanizing ? "spinner" : "wand"}
              className={cn("h-3.5 w-3.5", isHumanizing && "animate-spin")}
            />
            {isHumanizing ? "Humanizing…" : "Humanize"}
          </span>
        </button>
      </div>

      {/* Instructions row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="Custom instructions (tone, length, focus…)"
            className="border-agent-outline-variant bg-agent-surface-low text-agent-on-surface placeholder:text-agent-on-surface-variant focus:border-agent-primary w-full rounded-lg border px-2.5 py-1.5 text-xs outline-none"
          />
        </div>
        <div className="relative" ref={tipRef}>
          <button
            type="button"
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
            className="text-agent-on-surface-variant hover:text-agent-on-surface shrink-0"
            aria-label="Suggestions"
          >
            <Icon name="lightbulb" className="h-3.5 w-3.5" />
          </button>
          {showTip && (
            <div className="border-agent-outline-variant bg-agent-surface-container shadow-agent-float absolute right-0 bottom-full z-20 mb-2 w-52 rounded-xl border p-2.5">
              <p className="text-agent-on-surface mb-1.5 text-xs font-medium">
                Suggestions
              </p>
              <ul className="space-y-0.5">
                {INSTRUCTION_SUGGESTIONS.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() =>
                        setCustomInstructions((prev) =>
                          prev ? `${prev} · ${s}` : s
                        )
                      }
                      className="text-agent-on-surface-variant hover:text-agent-on-surface hover:bg-agent-surface-lowest w-full rounded-lg px-2 py-1 text-left text-xs transition-colors"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <HumanizerModal
        key={humanizeResult ? "result" : "pending"}
        isOpen={isHumanizerOpen}
        isLoading={isHumanizing}
        changes={humanizeResult?.result.changes ?? []}
        onAccept={handleHumanizeAccept}
        onClose={() => {
          setIsHumanizerOpen(false);
          resetHumanize();
        }}
      />
    </div>
  );
}
