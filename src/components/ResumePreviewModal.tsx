/**
 * Resume Preview Modal
 * Full-screen preview of the resume with the selected template.
 */

"use client";

import { useEffect } from "react";

import { Modal } from "@/components/ui/Modal";
import { loadGoogleFont } from "@/lib/fontLoader";
import { ResumeJSON, ThemeCustomization } from "@/types/resume";

import { TemplateRenderer } from "./templates/TemplateRenderer";


interface ResumePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resume: ResumeJSON;
  customization: ThemeCustomization;
}

export function ResumePreviewModal({
  isOpen,
  onClose,
  resume,
  customization,
}: ResumePreviewModalProps) {
  // Load font when modal opens or font changes
  useEffect(() => {
    if (isOpen && customization.fontFamily) {
      loadGoogleFont(customization.fontFamily);
    }
  }, [isOpen, customization.fontFamily]);

  if (!resume) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resume Preview" size="xl">
      <div className="h-[80vh] overflow-auto rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
        <div
          className="mx-auto rounded-lg bg-white shadow-lg dark:bg-gray-800"
          style={{
            width: customization.pageFormat === "a4" ? "210mm" : "8.5in",
            minHeight: customization.pageFormat === "a4" ? "297mm" : "11in",
            padding: "20px",
          }}
        >
          <TemplateRenderer
            template={customization.template || "modern-minimal"}
            resume={resume}
            colors={customization.colors || {}}
            fontSize={customization.fontSize || "medium"}
            fontFamily={customization.fontFamily || "Inter"}
          />
        </div>
      </div>
    </Modal>
  );
}
