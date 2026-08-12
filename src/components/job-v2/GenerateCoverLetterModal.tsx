"use client";

import { useRef, useState } from "react";

import { ModelSelector } from "@/components/ModelSelector";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { ProgressFill } from "@/components/ui/ProgressFill";
import { useToast } from "@/components/ui/ToastProvider";
import { useJobPageContext } from "@/contexts/JobPageContext";
import { useFakeProgress } from "@/hooks/useFakeProgress";
import useGenerateCoverLetter from "@/hooks/useGenerateCoverLetter";
import cn from "@/lib/cn";
import {
  COVER_LETTER_STYLES,
  CoverLetterStyleId,
  DEFAULT_COVER_LETTER_STYLE,
} from "@/lib/llm/prompts/coverLetterStyles";

const INSTRUCTION_SUGGESTIONS = [
  "Keep it under 250 words",
  "Use a formal / conversational tone",
  "Emphasize leadership experience",
  "Highlight remote-work skills",
  "Focus on culture fit over technical skills",
];

interface GenerateCoverLetterModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * GenerateCoverLetterModal — model selector + style + custom instructions,
 * triggered from the shared FloatingActionBar's Generate button.
 */
export function GenerateCoverLetterModal({
  open,
  onClose,
}: GenerateCoverLetterModalProps) {
  const {
    resume,
    job,
    customization,
    updateCoverLetterState,
    saveToDb,
    refetch,
  } = useJobPageContext();

  const [customInstructions, setCustomInstructions] = useState("");
  const [styleId, setStyleId] = useState<CoverLetterStyleId>(
    DEFAULT_COVER_LETTER_STYLE
  );
  const [showTip, setShowTip] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);

  const { pushToast } = useToast();

  const { mutate: generateCoverLetter, status } = useGenerateCoverLetter({
    onSuccess: (generated) => {
      updateCoverLetterState(generated.result);
      refetch(undefined, "coverLetter");
      saveToDb("coverLetter", generated.result, customization);
      onClose();
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
  const generatePercent = useFakeProgress(isGenerating);

  return (
    <Modal isOpen={open} onClose={onClose} title="Generate cover letter">
      <div className="flex flex-col gap-3">
        <ModelSelector label="Model" />

        <div>
          <label className="text-agent-on-surface-variant mb-1 block text-xs font-medium">
            Style
          </label>
          <select
            value={styleId}
            onChange={(e) => setStyleId(e.target.value as CoverLetterStyleId)}
            title={COVER_LETTER_STYLES[styleId].description}
            className="border-agent-outline-variant bg-agent-surface-low text-agent-on-surface focus:border-agent-primary w-full rounded-lg border px-2.5 py-1.5 text-sm outline-none"
          >
            {Object.entries(COVER_LETTER_STYLES).map(([id, style]) => (
              <option key={id} value={id}>
                {style.label}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <label className="text-agent-on-surface-variant mb-1 flex items-center gap-1.5 text-xs font-medium">
            Custom instructions
            <div className="relative" ref={tipRef}>
              <button
                type="button"
                onMouseEnter={() => setShowTip(true)}
                onMouseLeave={() => setShowTip(false)}
                className="text-agent-on-surface-variant hover:text-agent-on-surface"
                aria-label="Suggestions"
              >
                <Icon name="lightbulb" className="h-3.5 w-3.5" />
              </button>
              {showTip && (
                <div className="border-agent-outline-variant bg-agent-surface-container shadow-agent-float absolute left-0 top-full z-20 mt-2 w-52 rounded-xl border p-2.5">
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
          </label>
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="Tone, length, focus…"
            rows={3}
            className="border-agent-outline-variant bg-agent-surface-low text-agent-on-surface placeholder:text-agent-on-surface-variant focus:border-agent-primary w-full resize-none rounded-lg border px-2.5 py-1.5 text-sm outline-none"
          />
        </div>

        <button
          onClick={() =>
            generateCoverLetter({
              resume,
              jobData: job?.details,
              customInstructions: customInstructions.trim() || undefined,
              styleId,
            })
          }
          disabled={isGenerating}
          className={cn(
            "relative flex items-center justify-center gap-1.5 overflow-hidden rounded-lg px-3 py-2 text-sm font-semibold transition-all",
            "from-agent-primary to-agent-primary-container bg-linear-to-r text-white",
            "hover:-translate-y-px hover:opacity-90",
            "disabled:cursor-not-allowed disabled:opacity-90"
          )}
        >
          <ProgressFill percent={generatePercent} />
          <span className="relative z-10 flex items-center gap-1.5">
            {isGenerating ? (
              <span className="animate-spin">
                <Icon name="loader-2" className="h-4 w-4" />
              </span>
            ) : (
              <Icon name="zap" className="h-4 w-4" />
            )}
            {isGenerating ? "Generating…" : "Generate"}
          </span>
        </button>
      </div>
    </Modal>
  );
}
