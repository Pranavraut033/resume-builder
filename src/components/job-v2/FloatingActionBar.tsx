"use client";

import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { useJobPageContext } from "@/contexts/JobPageContext";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import cn from "@/lib/cn";

import { GenerateCoverLetterModal } from "./GenerateCoverLetterModal";

/** The six mutually-exclusive canvas-overlay drawers. `null` means none open. */
export type DrawerName =
  | "deepAnalysis"
  | "humanizer"
  | "fitCheck"
  | "history"
  | "outline"
  | "customization"
  | null;

interface OverflowItem {
  name: Exclude<DrawerName, null>;
  label: string;
  icon: string;
}

const OVERFLOW_ITEMS: OverflowItem[] = [
  { name: "outline", label: "Sections", icon: "panelLeftClose" },
  { name: "history", label: "History", icon: "history" },
  { name: "fitCheck", label: "Fit Check", icon: "target" },
];

interface FloatingActionBarProps {
  hidden: boolean;
  historyState: {
    canUndo: boolean;
    canRedo: boolean;
    redoLabel: string | null;
    undoLabel: string | null;
  };
  /** Which of the seven canvas drawers is currently open, if any. */
  activeDrawer: DrawerName;
  /** Opens `name`, or closes everything when passed `null` (e.g. from the
   * overflow menu's own outside-click). Toggling an already-open drawer is
   * the caller's job — every inline/overflow button here always calls this
   * with the drawer it represents. */
  onOpenDrawer: (name: DrawerName) => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
}

/**
 * FloatingActionBar — position: fixed pill centered below the header, over
 * the V2 WYSIWYG canvas. Hides on scroll down and reappears on scroll up
 * (see `hidden` prop, driven by useHideOnScroll in the parent).
 *
 * Inline: Export PDF | Undo | Redo (resume-only) | Customize ▾ |
 * Deep Analysis (resume-only) | Generate (cover-letter-only) | Humanize | Chat.
 *
 * Overflow `⋯` menu (lower-frequency actions): Sections | History |
 * Fit Check | Download JSON.
 */
export function FloatingActionBar({
  hidden,
  historyState,
  activeDrawer,
  onOpenDrawer,
  isChatOpen,
  onToggleChat,
}: FloatingActionBarProps) {
  const {
    contentType,
    coverLetter,
    isExportingPdf,
    onJSONExport,
    onPDFExport,
    redoResume,
    undoResume,
  } = useJobPageContext();
  const isResume = contentType === "resume";

  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOverflowOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        overflowRef.current &&
        !overflowRef.current.contains(e.target as Node)
      ) {
        setIsOverflowOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOverflowOpen]);

  useEscapeKey(isOverflowOpen, () => setIsOverflowOpen(false));

  const isOverflowItemActive = OVERFLOW_ITEMS.some(
    ({ name }) => name === activeDrawer
  );

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
          </>
        )}

        <span className="bg-agent-outline-variant mx-0.5 h-5 w-px" />

        {/* Customize */}
        <button
          onClick={() =>
            onOpenDrawer(
              activeDrawer === "customization" ? null : "customization"
            )
          }
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
            activeDrawer === "customization"
              ? "bg-agent-primary text-agent-on-primary"
              : "text-agent-on-surface-variant hover:bg-agent-surface-container hover:text-agent-on-surface"
          )}
          title="Customize theme"
        >
          <Icon name="palette" className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Customize</span>
        </button>

        {isResume && (
          <>
            {/* Deep Analysis */}
            <button
              onClick={() =>
                onOpenDrawer(
                  activeDrawer === "deepAnalysis" ? null : "deepAnalysis"
                )
              }
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                activeDrawer === "deepAnalysis"
                  ? "bg-agent-primary text-agent-on-primary"
                  : "text-agent-on-surface-variant hover:bg-agent-surface-container hover:text-agent-on-surface"
              )}
              title="Deep Analysis"
            >
              <Icon name="barChart" className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Analysis</span>
            </button>
          </>
        )}

        {!isResume && (
          <>
            {/* Generate — opens the model/style/instructions modal */}
            <button
              onClick={() => setIsGenerateOpen(true)}
              className="text-agent-on-surface-variant hover:bg-agent-surface-container hover:text-agent-on-surface flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all"
              title="Generate cover letter"
            >
              <Icon name="zap" className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Generate</span>
            </button>
            <GenerateCoverLetterModal
              open={isGenerateOpen}
              onClose={() => setIsGenerateOpen(false)}
            />
          </>
        )}

        {/* Humanize */}
        <button
          onClick={() =>
            onOpenDrawer(activeDrawer === "humanizer" ? null : "humanizer")
          }
          disabled={!isResume && !coverLetter.trim()}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-30",
            activeDrawer === "humanizer"
              ? "bg-agent-primary text-agent-on-primary"
              : "text-agent-on-surface-variant hover:bg-agent-surface-container hover:text-agent-on-surface"
          )}
          title="Humanize"
        >
          <Icon name="wand" className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Humanize</span>
        </button>

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

        {isResume && (
          <>
            <span className="bg-agent-outline-variant mx-0.5 h-5 w-px" />

            {/* Overflow — Sections, History, Fit Check, Download JSON */}
            <div ref={overflowRef} className="relative">
              <button
                onClick={() => setIsOverflowOpen((o) => !o)}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full transition-all",
                  isOverflowOpen || isOverflowItemActive
                    ? "bg-agent-primary text-agent-on-primary"
                    : "text-agent-on-surface-variant hover:bg-agent-surface-container hover:text-agent-on-surface"
                )}
                title="More actions"
                aria-label="More actions"
                aria-expanded={isOverflowOpen}
              >
                <Icon name="moreHorizontal" className="h-3.5 w-3.5" />
              </button>

              {isOverflowOpen && (
                <div
                  className={cn(
                    "absolute top-full right-0 z-50 mt-1.5 w-52",
                    "border-agent-outline-variant bg-agent-surface-lowest shadow-agent-modal rounded-xl border",
                    "animate-in fade-in slide-in-from-top-1 duration-150"
                  )}
                >
                  <div className="flex flex-col gap-0.5 p-1.5">
                    {OVERFLOW_ITEMS.map(({ name, label, icon }) => {
                      const isActive = activeDrawer === name;
                      return (
                        <button
                          key={name}
                          onClick={() => {
                            onOpenDrawer(isActive ? null : name);
                            setIsOverflowOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-all",
                            isActive
                              ? "bg-agent-primary-container text-agent-on-primary-container"
                              : "hover:bg-agent-surface-container text-agent-on-surface-variant hover:text-agent-on-surface"
                          )}
                        >
                          <Icon name={icon} className="h-3.5 w-3.5 shrink-0" />
                          {label}
                        </button>
                      );
                    })}

                    <span className="bg-agent-outline-variant my-0.5 h-px" />

                    <button
                      onClick={() => {
                        onJSONExport();
                        setIsOverflowOpen(false);
                      }}
                      className="hover:bg-agent-surface-container text-agent-on-surface-variant hover:text-agent-on-surface flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-all"
                    >
                      <Icon name="braces" className="h-3.5 w-3.5 shrink-0" />
                      Download JSON
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
