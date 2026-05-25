"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { Button, Icon, BackButton, SaveButton } from "@/components/ui";
import { useJobPageContext } from "@/contexts/JobPageContext";
import cn from "@/lib/cn";
import { HistoryChangeListener } from "@/lib/llm/ResumeHistory";

import PreviewViewport from "./PreviewViewport";

import { FinalReviewExportLayout } from ".";

type JobPageLayoutProps = {
  leftSection: React.ReactNode;
  mainSection: React.ReactNode;
  livePreviewContent: React.ReactNode;
  exportContent: React.ReactNode;
  title: string;
  description: string;
};

type EditorTab = "edit" | "export";

const PREVIEW_MIN_WIDTH = 360;
const PREVIEW_MAX_WIDTH = 720;
const CHAT_MIN_WIDTH = 320;
const CHAT_MAX_WIDTH = 680;

export default function JobPageLayout({
  leftSection,
  mainSection,
  livePreviewContent,
  title,
  description,
}: JobPageLayoutProps) {
  const {
    chatSnapPosition,
    contentType,
    coverLetter,
    customization,
    historyRef,
    isDirtyCoverLetter,
    isDirtyResume,
    resume,
    saveStatus,
    saveToDb,
    setChatSnapPosition,
    setContentType,
  } = useJobPageContext();

  const [activeTab, setActiveTab] = useState<EditorTab>("edit");
  const [previewWidth, setPreviewWidth] = useState<number>(416);
  const [isResizingPreview, setIsResizingPreview] = useState(false);
  const resizeStartRef = useRef<{ x: number; width: number } | null>(null);
  const [chatPanelWidth, setChatPanelWidth] = useState<number>(380);
  const [isChatResizing, setIsChatResizing] = useState(false);
  const chatResizeStartRef = useRef<{ x: number; width: number } | null>(null);
  const [historyState, setHistoryState] = useState<{
    canUndo: boolean;
    canRedo: boolean;
    redoLabel: string | null;
    undoLabel: string | null;
  }>({ canUndo: false, canRedo: false, redoLabel: null, undoLabel: null });

  const isChatSnapped =
    contentType === "resume" && chatSnapPosition !== "undocked";

  const onSave = useCallback(() => {
    if (contentType === "coverLetter") {
      saveToDb("coverLetter", coverLetter, customization);
    } else {
      saveToDb("resume", resume, customization);
    }
  }, [contentType, saveToDb, coverLetter, resume, customization]);

  useEffect(() => {
    const history = historyRef.current;
    if (!history) return;

    const listener: HistoryChangeListener = (
      canUndo,
      canRedo,
      redoLabel,
      undoLabel
    ) => {
      setHistoryState({ canUndo, canRedo, redoLabel, undoLabel });
    };
    history.addHistoryChangeListener(listener);

    return () => history.removeHistoryChangeListener(listener);
  }, [historyRef]);

  useEffect(() => {
    if (!isChatResizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!chatResizeStartRef.current) return;
      const delta =
        chatSnapPosition === "left"
          ? event.clientX - chatResizeStartRef.current.x
          : chatResizeStartRef.current.x - event.clientX;
      const nextWidth = Math.min(
        CHAT_MAX_WIDTH,
        Math.max(CHAT_MIN_WIDTH, chatResizeStartRef.current.width + delta)
      );
      setChatPanelWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsChatResizing(false);
      chatResizeStartRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isChatResizing, chatSnapPosition]);

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
    <div className="bg-agent-bg text-agent-on-bg relative h-full overflow-hidden">
      <div className="bg-agent-primary-fixed-dim pointer-events-none absolute -top-36 -left-28 h-80 w-80 rounded-full opacity-35 blur-3xl" />
      <div className="bg-agent-tertiary-fixed-dim pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full opacity-40 blur-3xl" />
      <div className="relative h-full p-3 md:p-4">
        <div className="border-agent-outline-variant bg-agent-surface-lowest shadow-agent-modal h-full overflow-hidden rounded-2xl border backdrop-blur">
          <div className="bg-agent-surface-lowest flex h-full flex-col overflow-hidden">
            {/* Top bar */}
            <header className="bg-agent-surface border-color-agent-outline-variant sticky flex shrink-0 items-center gap-3 border-b px-4 py-3">
              <BackButton />
              <Button
                onClick={() =>
                  setContentType(
                    contentType === "coverLetter" ? "resume" : "coverLetter"
                  )
                }
                variant="primary"
                size="sm"
                className="ml-4"
              >
                {contentType === "coverLetter" ? "Cover Letter" : "Resume"}
              </Button>
              <div className="min-w-0">
                <h1 className="text-agent-on-surface truncate text-base font-semibold">
                  {title}
                </h1>
                <p className="text-agent-on-surface-variant truncate text-xs">
                  {description}
                </p>
              </div>

              <div className="flex-1" />

              {contentType === "resume" && (
                <div className="flex items-center gap-1">
                  <Button
                    className="rounded-full"
                    variant="ghost"
                    title={historyState.undoLabel || "Undo"}
                    onClick={() => historyRef.current?.undo()}
                    disabled={!historyState.canUndo}
                  >
                    <Icon name="undo"></Icon>
                  </Button>
                  <Button
                    className="rounded-full"
                    variant="ghost"
                    title={historyState.redoLabel || "Redo"}
                    onClick={() => historyRef.current?.redo()}
                    disabled={!historyState.canRedo}
                  >
                    <Icon name="redo"></Icon>
                  </Button>
                </div>
              )}
              {/* Tab switcher */}
              <div className="bg-agent-surface-container ml-auto flex rounded-lg p-0.5">
                {(["edit", "export"] as EditorTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-all",
                      activeTab === tab
                        ? "bg-agent-primary-container text-agent-on-primary-container"
                        : "text-agent-on-surface-variant"
                    )}
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
                className={cn("flex min-h-0 flex-1", {
                  "cursor-col-resize select-none":
                    isResizingPreview || isChatResizing,
                })}
              >
                {/* Chat panel snapped to the left */}
                {isChatSnapped && chatSnapPosition === "left" && (
                  <>
                    <aside
                      className="border-agent-outline-variant bg-agent-surface-lowest flex shrink-0 flex-col overflow-hidden border-r"
                      style={{ width: `${chatPanelWidth}px` }}
                    >
                      <ChatPanel
                        onClose={() => setChatSnapPosition("undocked")}
                      />
                    </aside>
                    {/* Resize handle */}
                    <button
                      type="button"
                      aria-label="Resize chat panel"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        chatResizeStartRef.current = {
                          x: e.clientX,
                          width: chatPanelWidth,
                        };
                        setIsChatResizing(true);
                      }}
                      className="hover:bg-agent-primary-container/30 bg-agent-outline-variant w-1.5 shrink-0 cursor-col-resize transition-colors"
                    />
                  </>
                )}
                {/* Left: Section nav */}
                {leftSection}
                {/* Center: Section editor */}
                <main className="bg-agent-surface-low flex min-w-0 flex-1 flex-col overflow-y-auto">
                  <div className="min-h-full px-4 py-4 md:px-6 md:py-5 lg:px-8 lg:py-6">
                    <div className="mx-auto w-full max-w-4xl">
                      {mainSection}
                    </div>
                  </div>
                </main>

                {/* Right: Draggable live preview */}
                {isChatSnapped && chatSnapPosition === "left" ? null : (
                  <div
                    className={cn(
                      isChatSnapped && chatSnapPosition === "right"
                        ? "flex shrink-0"
                        : "hidden shrink-0 xl:flex"
                    )}
                  >
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
                      className="hover:bg-agent-primary-container/30 bg-agent-outline-variant w-1.5 cursor-col-resize transition-colors"
                    />

                    <aside
                      className="border-agent-outline-variant bg-agent-surface-lowest overflow-y-auto border-l"
                      style={{
                        width: `${previewWidth}px`,
                      }}
                    >
                      {isChatSnapped && chatSnapPosition === "right" ? (
                        <ChatPanel
                          onClose={() => setChatSnapPosition("undocked")}
                        />
                      ) : (
                        <div className="p-4">
                          <p className="text-agent-on-surface-variant mb-2 text-xs font-medium tracking-wide uppercase">
                            Live Preview
                          </p>
                          <div className="border-agent-outline-variant overflow-hidden rounded-lg border shadow-sm">
                            <div className="origin-top-left">
                              <PreviewViewport
                                showTemplateSelector
                                previewContent={livePreviewContent}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </aside>
                  </div>
                )}
              </div>
            ) : (
              <FinalReviewExportLayout previewContent={livePreviewContent} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
