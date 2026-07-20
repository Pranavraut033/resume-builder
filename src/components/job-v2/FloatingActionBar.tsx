"use client";

import { Icon } from "@/components/ui/Icon";
import { useJobPageContext } from "@/contexts/JobPageContext";
import cn from "@/lib/cn";

import { TemplatePicker } from "./TemplatePicker";

interface FloatingActionBarProps {
  hidden: boolean;
  historyState: {
    canUndo: boolean;
    canRedo: boolean;
    redoLabel: string | null;
    undoLabel: string | null;
  };
  isCustomizationOpen: boolean;
  onToggleCustomization: () => void;
  isAtsOpen: boolean;
  onToggleAts: () => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
  isOutlineOpen: boolean;
  onToggleOutline: () => void;
  isHistoryOpen: boolean;
  onToggleHistory: () => void;
  isHumanizerOpen: boolean;
  onToggleHumanizer: () => void;
}

/**
 * FloatingActionBar — position: fixed pill centered below the header, over
 * the V2 WYSIWYG canvas. Hides on scroll down and reappears on scroll up
 * (see `hidden` prop, driven by useHideOnScroll in the parent).
 *
 * Layout: Export PDF | Download JSON | Undo | Redo | Customize ▾ | Template ▾ | ATS | Chat 💬
 *
 * Customize / ATS / Chat are controlled toggles (overlays managed by the parent).
 * Template is a self-contained popover (TemplatePicker).
 * Undo/Redo/History/Sections/ATS/Humanize only apply to the resume, so they're
 * hidden while editing the cover letter.
 */
export function FloatingActionBar({
  hidden,
  historyState,
  isCustomizationOpen,
  onToggleCustomization,
  isAtsOpen,
  onToggleAts,
  isChatOpen,
  onToggleChat,
  isOutlineOpen,
  onToggleOutline,
  isHistoryOpen,
  onToggleHistory,
  isHumanizerOpen,
  onToggleHumanizer,
}: FloatingActionBarProps) {
  const {
    contentType,
    isExportingPdf,
    onJSONExport,
    onPDFExport,
    redoResume,
    undoResume,
  } = useJobPageContext();
  const isResume = contentType === "resume";

  return (
    <div
      className={cn(
        "pointer-events-none fixed top-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-1.5 transition-all duration-300",
        hidden && "-translate-y-20 opacity-0"
      )}
    >
      <div className="border-agent-outline-variant bg-agent-surface-lowest/80 shadow-agent-modal pointer-events-auto flex items-center gap-0.5 rounded-full border p-1 backdrop-blur-xs">
        {/* Export PDF */}
        <button
          onClick={onPDFExport}
          disabled={isExportingPdf}
          className="text-agent-on-surface-variant hover:bg-agent-surface-container hover:text-agent-on-surface flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all disabled:opacity-50"
          title="Export as PDF"
        >
          <Icon
            name={isExportingPdf ? "spinner" : "download"}
            className={cn("h-3.5 w-3.5", isExportingPdf && "animate-spin")}
          />
          <span className="hidden sm:inline">PDF</span>
        </button>

        {/* Download JSON */}
        <button
          onClick={onJSONExport}
          className="text-agent-on-surface-variant hover:bg-agent-surface-container hover:text-agent-on-surface flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all"
          title="Download resume JSON"
        >
          <Icon name="braces" className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">JSON</span>
        </button>

        {isResume && (
          <>
            <span className="bg-agent-outline-variant mx-0.5 h-5 w-px" />

            {/* Undo / Redo */}
            <button
              onClick={undoResume}
              disabled={!historyState.canUndo}
              className="text-agent-on-surface-variant hover:bg-agent-surface-container hover:text-agent-on-surface flex h-7 w-7 items-center justify-center rounded-full transition-all disabled:opacity-30"
              title={historyState.undoLabel || "Undo"}
            >
              <Icon name="undo" className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={redoResume}
              disabled={!historyState.canRedo}
              className="text-agent-on-surface-variant hover:bg-agent-surface-container hover:text-agent-on-surface flex h-7 w-7 items-center justify-center rounded-full transition-all disabled:opacity-30"
              title={historyState.redoLabel || "Redo"}
            >
              <Icon name="redo" className="h-3.5 w-3.5" />
            </button>

            {/* History */}
            <button
              onClick={onToggleHistory}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full transition-all",
                isHistoryOpen
                  ? "bg-agent-primary text-agent-on-primary"
                  : "text-agent-on-surface-variant hover:bg-agent-surface-container hover:text-agent-on-surface"
              )}
              title="Version history"
            >
              <Icon name="history" className="h-3.5 w-3.5" />
            </button>
          </>
        )}

        <span className="bg-agent-outline-variant mx-0.5 h-5 w-px" />

        {/* Customize */}
        <button
          onClick={onToggleCustomization}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
            isCustomizationOpen
              ? "bg-agent-primary text-agent-on-primary"
              : "text-agent-on-surface-variant hover:bg-agent-surface-container hover:text-agent-on-surface"
          )}
          title="Customize theme"
        >
          <Icon name="palette" className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Customize</span>
        </button>

        {/* Template */}
        <TemplatePicker />

        {isResume && (
          <>
            {/* Sections outline */}
            <button
              onClick={onToggleOutline}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                isOutlineOpen
                  ? "bg-agent-primary text-agent-on-primary"
                  : "text-agent-on-surface-variant hover:bg-agent-surface-container hover:text-agent-on-surface"
              )}
              title="Reorder, hide, or add sections"
            >
              <Icon name="panelLeftClose" className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Sections</span>
            </button>

            {/* ATS */}
            <button
              onClick={onToggleAts}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                isAtsOpen
                  ? "bg-agent-primary text-agent-on-primary"
                  : "text-agent-on-surface-variant hover:bg-agent-surface-container hover:text-agent-on-surface"
              )}
              title="ATS analysis"
            >
              <Icon name="barChart" className="h-3.5 w-3.5" />
              <span className="hidden md:inline">ATS</span>
            </button>

            {/* Humanize */}
            <button
              onClick={onToggleHumanizer}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                isHumanizerOpen
                  ? "bg-agent-primary text-agent-on-primary"
                  : "text-agent-on-surface-variant hover:bg-agent-surface-container hover:text-agent-on-surface"
              )}
              title="Humanize"
            >
              <Icon name="wand" className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Humanize</span>
            </button>
          </>
        )}

        {/* Chat */}
        <button
          onClick={onToggleChat}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
            isChatOpen
              ? "bg-agent-primary text-agent-on-primary"
              : "text-agent-on-surface-variant hover:bg-agent-surface-container hover:text-agent-on-surface"
          )}
          title="Toggle AI chat"
        >
          <Icon name="messageSquare" className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Chat</span>
        </button>
      </div>
    </div>
  );
}
