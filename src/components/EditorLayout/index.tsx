import { useEffect, useRef, useState } from "react";

import { useJobPageContext } from "@/contexts/JobPageContext";

import BackButton from "../BackButton";
import { FinalReviewExportLayout } from "./FinalReviewExportLayoutProps";
import PreviewViewport from "./PreviewViewport";
import { SaveButton } from "../ui/SaveButton";

type EditorLayoutProps = {
  leftSection: React.ReactNode;
  mainSection: React.ReactNode;
  livePreviewContent: React.ReactNode;
  exportContent: React.ReactNode;
  title: string;
  description: string;
  onSave: () => void;
};

type EditorTab = "edit" | "export";

const PREVIEW_MIN_WIDTH = 360;
const PREVIEW_MAX_WIDTH = 720;

export default function EditorLayout({
  leftSection,
  mainSection,
  livePreviewContent,
  title,
  description,
  onSave,
}: EditorLayoutProps) {
  const {
    onPDFExport,
    onTXTExport,
    onCopyText,
    customization,
    isExportingPdf,
    isExportingTxt,
    updateCustomization,
    saveStatus,
    isDirtyCoverLetter,
    isDirtyResume,
    contentType,
  } = useJobPageContext();

  const [activeTab, setActiveTab] = useState<EditorTab>("edit");
  const [previewWidth, setPreviewWidth] = useState<number>(416);
  const [isResizingPreview, setIsResizingPreview] = useState(false);
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null);

  useEffect(() => {
    if (!isResizingPreview) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!resizeStartRef.current) return;
      const delta = resizeStartRef.current.x - event.clientX;
      const nextWidth = Math.min(
        PREVIEW_MAX_WIDTH,
        Math.max(PREVIEW_MIN_WIDTH, resizeStartRef.current.width + delta)
      );
      setPreviewWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsResizingPreview(false);
      resizeStartRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingPreview]);

  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{
        background: "var(--color-agent-bg)",
        color: "var(--color-agent-on-bg)",
      }}
    >
      <div
        className="pointer-events-none absolute -top-36 -left-28 h-80 w-80 rounded-full opacity-35 blur-3xl"
        style={{ background: "var(--color-agent-primary-fixed-dim)" }}
      />
      <div
        className="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--color-agent-tertiary-fixed-dim)" }}
      />
      <div className="relative h-screen p-3 md:p-4">
        <div
          className="h-full overflow-hidden rounded-2xl border backdrop-blur"
          style={{
            borderColor: "var(--color-agent-outline-variant)",
            background: "var(--color-agent-surface-lowest)",
            boxShadow: "var(--shadow-agent-modal)",
          }}
        >
          <div
            className="flex h-full flex-col overflow-hidden"
            style={{ background: "var(--color-agent-surface-lowest)" }}
          >
            {/* Top bar */}
            <header
              className="flex shrink-0 items-center gap-3 border-b px-4 py-3"
              style={{
                background: "var(--color-agent-surface)",
                borderColor: "var(--color-agent-outline-variant)",
              }}
            >
              <BackButton />
              <div className="min-w-0">
                <h1
                  className="truncate text-base font-semibold"
                  style={{ color: "var(--color-agent-on-surface)" }}
                >
                  {title}
                </h1>
                <p
                  className="truncate text-xs"
                  style={{ color: "var(--color-agent-on-surface-variant)" }}
                >
                  {description}
                </p>
              </div>
              <div className="flex-1" />

              {/* Tab switcher */}
              <div
                className="ml-auto flex rounded-lg p-0.5"
                style={{ background: "var(--color-agent-surface-container)" }}
              >
                {(["edit", "export"] as EditorTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-all"
                    style={
                      activeTab === tab
                        ? {
                            background: "var(--color-agent-primary-container)",
                            color: "var(--color-agent-on-primary-container)",
                          }
                        : { color: "var(--color-agent-on-surface-variant)" }
                    }
                  >
                    {tab === "edit" ? "Editor" : "Final Review & Export"}
                  </button>
                ))}
              </div>
              <div>
                <SaveButton
                  onClick={onSave}
                  status={saveStatus}
                  isDirty={
                    contentType === "coverLetter"
                      ? isDirtyCoverLetter
                      : isDirtyResume
                  }
                />
              </div>
            </header>

            {/* Body */}
            {activeTab === "edit" ? (
              <div
                className="flex min-h-0 flex-1"
                style={
                  isResizingPreview
                    ? { userSelect: "none", cursor: "col-resize" }
                    : undefined
                }
              >
                {/* Left: Section nav */}
                {leftSection}

                {/* Center: Section editor */}
                <main
                  className="flex min-w-0 flex-1 flex-col overflow-y-auto"
                  style={{ background: "var(--color-agent-surface-low)" }}
                >
                  <div className="min-h-full px-4 py-4 md:px-6 md:py-5 lg:px-8 lg:py-6">
                    <div className="mx-auto w-full max-w-4xl">
                      {mainSection}
                    </div>
                  </div>
                </main>

                {/* Right: Draggable live preview */}
                <div className="hidden shrink-0 xl:flex">
                  <button
                    type="button"
                    aria-label="Resize preview panel"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      resizeStartRef.current = {
                        x: event.clientX,
                        width: previewWidth,
                      };
                      setIsResizingPreview(true);
                    }}
                    className="hover:bg-agent-primary-container/30 w-1.5 cursor-col-resize transition-colors"
                    style={{ background: "var(--color-agent-outline-variant)" }}
                  />

                  <aside
                    className="overflow-y-auto border-l"
                    style={{
                      width: `${previewWidth}px`,
                      background: "var(--color-agent-surface-lowest)",
                      borderColor: "var(--color-agent-outline-variant)",
                    }}
                  >
                    <div className="p-4">
                      <p
                        className="mb-2 text-xs font-medium tracking-wide uppercase"
                        style={{
                          color: "var(--color-agent-on-surface-variant)",
                        }}
                      >
                        Live Preview
                      </p>
                      <div
                        className="overflow-hidden rounded-lg border shadow-sm"
                        style={{
                          borderColor: "var(--color-agent-outline-variant)",
                        }}
                      >
                        <div className="origin-top-left">
                          <PreviewViewport
                            customization={customization}
                            updateCustomization={updateCustomization}
                            previewContent={livePreviewContent}
                            onCopyText={onCopyText}
                            rerender={customization.template} // Re-measure when template changes
                          />
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            ) : (
              <FinalReviewExportLayout
                customization={customization}
                onCustomizationChange={updateCustomization}
                onPDFExport={onPDFExport}
                onTXTExport={onTXTExport}
                onCopyText={onCopyText}
                previewContent={livePreviewContent}
                isExportingPdf={isExportingPdf}
                isExportingTxt={isExportingTxt}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
