"use client";

import { useState } from "react";

import { RichTextEditor } from "@/components/form/RichTextEditor";
import { CoverLetterRenderer } from "@/components/job/templates/coverLetter/CoverLetterRenderer";
import { Button } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useJobPageContext } from "@/contexts/JobPageContext";
import useGenerateCoverLetter from "@/hooks/useGenerateCoverLetter";

import { ModelSelector } from "../ModelSelector";

import { EditorLayout } from ".";

const INSTRUCTION_SUGGESTIONS = [
  "Keep it under 250 words",
  "Use a formal / conversational tone",
  "Emphasize leadership experience",
  "Highlight remote-work skills",
  "Focus on culture fit over technical skills",
  "Avoid mentioning salary expectations",
];

export default function CoverLetterEditorContent() {
  const {
    coverLetter,
    resume,
    updateCoverLetterState,
    job,
    customization,
    saveStatus,
    refetch,
    saveToDb,
  } = useJobPageContext();

  const [customInstructions, setCustomInstructions] = useState("");
  const [showTip, setShowTip] = useState(false);

  const { pushToast } = useToast();

  const { mutate: generateCoverLetter, status: generateStatus } =
    useGenerateCoverLetter({
      onSuccess: (generated) => {
        updateCoverLetterState(generated.result);
        refetch(undefined, "coverLetter");
        saveToDb("coverLetter", generated.result, customization);
      },
      onError: (err) => {
        const errorMsg =
          err instanceof Error
            ? err.message
            : "Failed to generate cover letter";
        console.error("Failed to generate cover letter:", err);
        pushToast({
          title: "Generation failed",
          description: errorMsg,
          variant: "error",
        });
      },
    });

  const isSaving = saveStatus === "saving";
  const isGenerating = generateStatus === "pending";

  const leftPanel = (
    <div className="relative flex h-full flex-col gap-6">
      <div className="flex justify-between gap-2.5">
        <div>
          <ModelSelector
            label="Change Model"
            className="w-full"
            variant="compact"
          />
        </div>
        <div>
          <Button
            variant="primary"
            onClick={() =>
              generateCoverLetter({
                resume,
                jobData: job?.details,
                customInstructions: customInstructions.trim() || undefined,
              })
            }
            disabled={isGenerating}
            icon={
              isGenerating ? (
                <span className="animate-spin">
                  <Icon name="loader-2" />
                </span>
              ) : (
                <Icon name="sparkles" />
              )
            }
            className="from-agent-primary via-agent-primary-container to-agent-tertiary-container w-full justify-center rounded-xl bg-gradient-to-r py-2.5 font-semibold text-white transition-all duration-200 hover:-translate-y-px hover:opacity-90 disabled:animate-pulse disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isGenerating
              ? "Generating your cover letter…"
              : "Generate with AI"}
          </Button>
        </div>
      </div>

      {/* Custom Instructions */}
      <div className="relative">
        <div className="mb-1 flex items-center gap-1.5">
          <label
            className="text-agent-on-surface-variant text-xs font-medium"
            htmlFor="cover-letter-instructions"
          >
            Custom instructions
          </label>
          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowTip(true)}
              onMouseLeave={() => setShowTip(false)}
              className="text-agent-on-surface-variant hover:text-agent-on-surface"
            >
              <Icon name="info" className="h-3.5 w-3.5" />
            </button>
            {showTip && (
              <div
                className="border-agent-outline-variant bg-agent-surface-container shadow-agent-float absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-xl border p-3"
              >
                <p className="text-agent-on-surface mb-2 text-xs font-medium">Suggestions</p>
                <ul className="space-y-1">
                  {INSTRUCTION_SUGGESTIONS.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() =>
                          setCustomInstructions((prev) =>
                            prev ? `${prev}\n${s}` : s
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
        <textarea
          id="cover-letter-instructions"
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          placeholder="e.g. Keep it under 250 words · Use a formal tone · Emphasize leadership"
          rows={2}
          className="border-agent-outline-variant bg-agent-surface-lowest text-agent-on-surface placeholder:text-agent-on-surface-variant focus:border-agent-primary focus:ring-agent-primary/20 w-full resize-none rounded-xl border px-3 py-2 text-xs outline-none focus:ring-2"
        />
      </div>

      {/* Editor */}
      <div className="border-agent-outline-variant from-agent-surface-lowest to-agent-surface-low relative flex-1 overflow-hidden rounded-xl border bg-linear-to-b shadow-inner">
        <div className="from-agent-primary via-agent-primary-container to-agent-tertiary-container absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-linear-to-r" />
        <RichTextEditor
          value={coverLetter}
          onChange={updateCoverLetterState}
          placeholder="Your compelling story starts here…"
        />
      </div>

      {/* Footer */}
      <div className="border-agent-outline-variant flex items-center justify-between border-t pt-3">
        <p className="text-agent-on-surface-variant text-xs">
          {coverLetter
            ? `${coverLetter.length} characters`
            : "Start typing or generate with AI"}
        </p>
        {(isSaving || isGenerating) && (
          <span className="text-agent-primary inline-flex items-center gap-1.5 text-xs font-medium">
            <span className="bg-agent-primary h-1.5 w-1.5 animate-pulse rounded-full" />
            {isSaving ? "Saving" : "Generating"}
          </span>
        )}
      </div>
    </div>
  );

  const previewPanel = (
    <CoverLetterRenderer
      coverLetter={coverLetter}
      resume={resume}
      customization={customization}
    />
  );

  return (
    <EditorLayout
      leftSection={<></>}
      templateRenderer={previewPanel}
      mainSection={leftPanel}
    />
  );
}
