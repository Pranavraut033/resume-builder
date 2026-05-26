"use client";

import PreviewViewport from "./PreviewViewport";
import ThemeCustomizationPanel from "./ThemeCustomizationPanel";

interface FinalReviewExportLayoutProps {
  previewContent: React.ReactNode;
}

export default function FinalReviewExportLayout({
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
      <aside className="bg-agent-surface-lowest max-w-md overflow-y-auto">
        <ThemeCustomizationPanel />
      </aside>
    </div>
  );
}
