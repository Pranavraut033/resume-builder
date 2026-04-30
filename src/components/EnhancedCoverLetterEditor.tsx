"use client";

import { useState, useEffect, useCallback } from "react";

import {
  updateCoverLetter as updateCoverLetterAction,
  updateCoverLetterCustomization,
} from "@/actions/job";
import { getProfile } from "@/actions/profile";
import { EditorLayout } from "@/components/editor/EditorLayout";
import { EditorSidePanel } from "@/components/editor/EditorSidePanel";
import { CoverLetterRenderer } from "@/components/templates/coverLetter/CoverLetterRenderer";
import { Button } from "@/components/ui";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useAIContext } from "@/contexts/AIContext";
import { useEditorContext } from "@/contexts/EditorContext";
import { DEFAULT_COLORS, TemplateType } from "@/types/resume";

import { ModelSelector } from "./ModelSelector";

export default function CoverLetterEditorContent() {
  const {
    coverLetter,
    updateCoverLetter,
    resume,
    job,
    customization,
    updateCustomization,
  } = useEditorContext();
  const { generateCoverLetter } = useAIContext();
  const jobId: number = job!.id!;

  const [isGenerating, setIsGenerating] = useState(false);
  const [editableText, setEditableText] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sync editable text with cover letter state
  useEffect(() => {
    if (coverLetter) {
      setEditableText(coverLetter);
    }
  }, [coverLetter]);

  const handleGenerate = async () => {
    if (!job?.description) {
      alert("Please select a model and ensure job description is available.");
      return;
    }

    try {
      setIsGenerating(true);

      const baseProfile = resume || (await getProfile());
      const jobRole = job?.details?.job?.job_title || "the position";
      const company = job?.details?.company?.company_name || "the company";

      const generated = await generateCoverLetter(
        baseProfile,
        resume || baseProfile,
        job.description,
        jobRole,
        company
      );

      updateCoverLetter(generated);
      setEditableText(generated);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to generate cover letter";
      console.error("Failed to generate cover letter:", err);
      alert(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      await updateCoverLetterAction(jobId, editableText, customization);
      updateCoverLetter(editableText);
      alert("Cover letter saved successfully!");
    } catch (err) {
      console.error("Failed to save cover letter:", err);
      alert("Failed to save cover letter");
    } finally {
      setIsSaving(false);
    }
  }, [jobId, editableText, customization, updateCoverLetter]);

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
    alert("PDF export for cover letters coming soon!");
  };

  const handleExportTXT = () => {
    const blob = new Blob([editableText], { type: "text/plain" });
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
              onClick={handleGenerate}
              disabled={isGenerating}
              icon={<Icon name="sparkle" />}
            >
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving}
              icon={<Icon name="check" />}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <textarea
          value={editableText}
          onChange={(e) => setEditableText(e.target.value)}
          className="h-96 w-full resize-none rounded-lg border border-gray-300 bg-white p-4 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          placeholder="Your cover letter will appear here. Click 'Generate' to create one using AI, or type your own..."
        />
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
