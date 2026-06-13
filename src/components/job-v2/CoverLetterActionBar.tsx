"use client";

import { ModelSelector } from "@/components/ModelSelector";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useJobPageContext } from "@/contexts/JobPageContext";
import useGenerateCoverLetter from "@/hooks/useGenerateCoverLetter";
import cn from "@/lib/cn";

/**
 * CoverLetterActionBar — floating action bar that appears above the cover letter
 * document canvas in V2. Provides Generate + Model selector controls.
 */
export function CoverLetterActionBar() {
  const {
    coverLetter: _cl,
    resume,
    job,
    customization,
    updateCoverLetterState,
    saveToDb,
    refetch,
  } = useJobPageContext();

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

  const isGenerating = status === "pending";

  return (
    <div
      className={cn(
        "border-agent-outline-variant bg-agent-surface-lowest/90 shadow-agent-float mx-auto mb-3 flex items-center gap-2.5 rounded-xl border px-3 py-2 backdrop-blur-sm",
        "w-full max-w-[794px]"
      )}
    >
      <Icon name="sparkles" className="text-agent-primary h-4 w-4 shrink-0" />

      <div className="flex-1">
        <ModelSelector label="Model" variant="compact" className="w-auto" />
      </div>

      <button
        onClick={() => generateCoverLetter({ resume, jobData: job?.details })}
        disabled={isGenerating}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
          "from-agent-primary to-agent-primary-container bg-linear-to-r text-white",
          "hover:-translate-y-px hover:opacity-90",
          "disabled:animate-pulse disabled:cursor-not-allowed disabled:opacity-60"
        )}
      >
        {isGenerating ? (
          <span className="animate-spin">
            <Icon name="loader-2" className="h-3.5 w-3.5" />
          </span>
        ) : (
          <Icon name="zap" className="h-3.5 w-3.5" />
        )}
        {isGenerating ? "Generating…" : "Generate"}
      </button>
    </div>
  );
}
