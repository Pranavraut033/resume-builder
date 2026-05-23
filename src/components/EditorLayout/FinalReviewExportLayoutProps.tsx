"use client";

import ATSAnalysisPanel from "../ATSAnalysisPanel";
import { ModelSelector } from "../ModelSelector";
import PreviewViewport from "./PreviewViewport";
import ThemeCustomizationPanel from "./ThemeCustomizationPanel";

interface FinalReviewExportLayoutProps {
  previewContent: React.ReactNode;
}

export function FinalReviewExportLayout({
  previewContent,
}: FinalReviewExportLayoutProps) {
  return (
    <div
      className="flex min-h-0 flex-1 overflow-hidden"
      style={{ background: "var(--color-agent-surface-lowest)" }}
    >
      <div className="max-h-full min-w-0 flex-1 overflow-hidden border-r">
        <PreviewViewport previewContent={previewContent} />
      </div>

      {/* Right: Settings & export */}
      <aside
        className="max-w-md space-y-4 overflow-y-auto p-4"
        style={{ background: "var(--color-agent-surface-low)" }}
      >
        <ModelSelector />
        <ATSAnalysisPanel />
        <ThemeCustomizationPanel />
      </aside>
    </div>
  );
}
