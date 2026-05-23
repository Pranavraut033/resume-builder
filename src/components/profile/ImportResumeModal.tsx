"use client";

import { useState } from "react";

import { ModelSelector } from "@/components/ModelSelector";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import LLMService from "@/lib/llm/llmService";
import { createLogger } from "@/lib/logger";
import { useModelStore } from "@/store/modelStore";
import { ResumeJSON } from "@/types/resume";

const logger = createLogger("ImportResumeModal");

interface ImportResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (profile: ResumeJSON) => void;
}

export function ImportResumeModal({
  isOpen,
  onClose,
  onImport,
}: ImportResumeModalProps) {
  const [resumeText, setResumeText] = useState("");
  const [importing, setImporting] = useState(false);
  const { pushToast } = useToast();
  const selectedModel = useModelStore((state) => state.activeModelPair);

  const handleImport = async () => {
    if (!resumeText.trim()) {
      pushToast({
        title: "Resume text required",
        description: "Please paste your resume text.",
        variant: "error",
      });
      return;
    }

    if (!selectedModel) {
      pushToast({
        title: "Model required",
        description: "Please select a model first.",
        variant: "error",
      });
      return;
    }

    setImporting(true);
    try {
      const parsed = await LLMService.parseResume(resumeText, {
        model: selectedModel[1],
        provider: selectedModel[0],
        temperature: 0.2,
      });
      onImport(parsed.result);
      onClose();
      setResumeText("");
      pushToast({
        title: "Resume imported",
        description: "Review and save your profile.",
        variant: "success",
      });
    } catch (error) {
      logger.error("Error parsing resume", { error });
      pushToast({
        title: "Import failed",
        description:
          "Error parsing resume. Please make sure you have OpenAI API key configured.",
        variant: "error",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Resume">
      <div className="space-y-4">
        <p className="text-agent-on-surface-variant text-sm">
          Paste your resume text below. The AI will extract structured
          information to populate your profile.
        </p>

        <ModelSelector onModelSelected={() => {}} className="mb-4" />

        <p className="text-agent-on-surface-variant mt-2 text-xs">
          Note: Resume parsing is currently only supported with OpenAI models.
        </p>

        <div>
          <label
            htmlFor="resumeText"
            className="mb-2 block text-sm font-medium"
          >
            Resume Text
          </label>
          <textarea
            id="resumeText"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            className="h-96 w-full rounded border p-3 font-mono text-sm"
            placeholder="Paste your resume text here..."
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={importing || !resumeText.trim()}
          >
            {importing ? "Importing..." : "Import"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
