"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import {
  updateCoverLetter as updateCoverLetterAction,
  updateCoverLetterCustomization,
} from "@/actions/job";
import { EditorLayout } from "@/components/editor/EditorLayout";
import { EditorSidePanel } from "@/components/editor/EditorSidePanel";
import RichTextEditor from "@/components/form/RichTextEditor";
import { CoverLetterRenderer } from "@/components/templates/coverLetter/CoverLetterRenderer";
import { Button } from "@/components/ui";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useEditorContext } from "@/contexts/EditorContext";
import useGenerateCoverLetter from "@/hooks/useGenerateCoverLetter";
import { htmlToPlainText, isHtml } from "@/lib/htmlUtils";
import { useModelStore } from "@/store/modelStore";
import { DEFAULT_COLORS, TemplateType } from "@/types/resume";

import { ModelSelector } from "./ModelSelector";

export default function CoverLetterEditorContent() {
  const {
    coverLetter,
    resume,
    job,
    customization,
    updateCustomization,
    refetch,
  } = useEditorContext();

  const jobId: number = job!.id!;
  const { pushToast } = useToast();
  const activeModelPair = useModelStore((state) => state.activeModelPair);
  const [editableText, setEditableText] = useState(coverLetter || "");

  const { mutate: saveCoverLetter, status } = useMutation({
    mutationFn: (newText: string) =>
      updateCoverLetterAction(jobId, newText, customization, {
        provider: activeModelPair ? activeModelPair[0] : undefined,
        model: activeModelPair ? activeModelPair[1] : undefined,
      }),
    onSuccess: () => {
      pushToast({
        title: "Cover letter saved",
        variant: "success",
      });
    },
    onError: (err) => {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to save cover letter";
      console.error("Failed to save cover letter:", err);
      pushToast({
        title: "Save failed",
        description: errorMsg,
        variant: "error",
      });
    },
  });

  const { mutate: generateCoverLetter, status: generateStatus } =
    useGenerateCoverLetter({
      onSuccess: (generated) => {
        saveCoverLetter(generated.result);
        setEditableText(generated.result);
        refetch(undefined, "coverLetter");
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

  const isSaving = status === "pending";
  const isGenerating = generateStatus === "pending";

  const handleCustomizationChange = async (
    updates: Partial<typeof customization>
  ) => {
    updateCustomization(updates);
    try {
      await updateCoverLetterCustomization(jobId, updates);
    } catch (err) {
      console.error("Failed to save customization:", err);
    }
  };

  const handleExportPDF = () => {
    pushToast({
      title: "Coming soon",
      description: "PDF export for cover letters is coming soon!",
      variant: "info",
    });
  };

  const handleExportTXT = () => {
    const text = isHtml(editableText)
      ? htmlToPlainText(editableText)
      : editableText;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cover-letter-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportOptions: Array<{
    label: string;
    icon: IconName;
    description: string;
    onExport: () => void;
  }> = [
    {
      label: "PDF",
      icon: "download",
      description: "Download as PDF",
      onExport: handleExportPDF,
    },
    {
      label: "TXT",
      icon: "fileText",
      description: "Export as plain text",
      onExport: handleExportTXT,
    },
  ];

  const leftPanel = (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="space-y-4 rounded-lg bg-white p-6 shadow dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Cover Letter Content
          </h2>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                generateCoverLetter({
                  resume: resume,
                  jobData: job?.details,
                })
              }
              disabled={isGenerating}
              icon={<Icon name="sparkle" />}
            >
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
            <Button
              variant="primary"
              onClick={() => saveCoverLetter(editableText)}
              disabled={isSaving}
              icon={<Icon name="check" />}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="h-96 w-full">
          <RichTextEditor
            value={editableText}
            onChange={setEditableText}
            placeholder="Your cover letter will appear here. Click 'Generate' to create one using AI, or type your own..."
          />
        </div>
      </div>
    </div>
  );

  const previewPanel = (
    <CoverLetterRenderer
      template={(customization.template as TemplateType) || "modern-minimal"}
      coverLetter={editableText}
      resume={resume}
      colors={customization.colors || DEFAULT_COLORS}
      fontSize={customization.fontSize || "medium"}
      fontFamily={customization.fontFamily || "Inter"}
    />
  );

  return (
    <EditorLayout
      title="Cover Letter Editor"
      leftPanel={leftPanel}
      previewPanel={previewPanel}
      rightPanel={
        <EditorSidePanel
          customization={customization}
          additionalContent={
            <div>
              <ModelSelector onModelSelected={() => {}} />
            </div>
          }
          onCustomizationChange={handleCustomizationChange}
          exportOptions={exportOptions}
        />
      }
    />
  );
}
