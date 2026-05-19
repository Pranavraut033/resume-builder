"use client";

import { useState } from "react";

import RichTextEditor from "@/components/form/RichTextEditor";
import { CoverLetterRenderer } from "@/components/templates/coverLetter/CoverLetterRenderer";
import { Button } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useJobPageContext } from "@/contexts/JobPageContext";
import useGenerateCoverLetter from "@/hooks/useGenerateCoverLetter";

import EditorLayout from "./EditorLayout";
import { ModelSelector } from "./ModelSelector";

export default function CoverLetterEditorContent() {
  const {
    coverLetter,
    resume,
    job,
    customization,
    saveStatus,
    refetch,
    saveToDb,
  } = useJobPageContext();

  const { pushToast } = useToast();
  const [editableText, setEditableText] = useState(coverLetter || "");

  const { mutate: generateCoverLetter, status: generateStatus } =
    useGenerateCoverLetter({
      onSuccess: (generated) => {
        setEditableText(generated.result);
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
              generateCoverLetter({ resume, jobData: job?.details })
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

      {/* Editor */}
      <div className="border-agent-outline-variant from-agent-surface-lowest to-agent-surface-low relative flex-1 overflow-hidden rounded-xl border bg-linear-to-b shadow-inner">
        <div className="from-agent-primary via-agent-primary-container to-agent-tertiary-container absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-linear-to-r" />
        <RichTextEditor
          value={editableText}
          onChange={setEditableText}
          placeholder="Your compelling story starts here…"
        />
      </div>

      {/* Footer */}
      <div className="border-agent-outline-variant flex items-center justify-between border-t pt-3">
        <p className="text-agent-on-surface-variant text-xs">
          {editableText
            ? `${editableText.length} characters`
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
      coverLetter={editableText}
      resume={resume}
      customization={customization}
    />
  );

  return (
    <EditorLayout
      title={`Cover letter`}
      onSave={() => saveToDb("coverLetter", editableText, customization)}
      leftSection={<></>}
      description={`${job?.company?.name || "your job"} [${job?.role || "your role"}]`}
      livePreviewContent={previewPanel}
      exportContent={previewPanel}
      mainSection={leftPanel}
    />
  );
}
