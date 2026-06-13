"use client";

import { useEffect } from "react";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { Icon } from "@/components/ui/Icon";
import cn from "@/lib/cn";

interface ChatOverlayProps {
  open: boolean;
  onClose: () => void;
}

/**
 * ChatOverlay — slides in from the right over the document canvas.
 * Wraps the existing ChatPanel; must be mounted inside a ChatContextProvider.
 */
export function ChatOverlay({ open, onClose }: ChatOverlayProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="absolute inset-0 z-30 bg-black/10 backdrop-blur-[1px]"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          "border-agent-outline-variant bg-agent-surface-lowest shadow-agent-modal absolute top-0 right-0 z-40 flex h-full w-96 max-w-[90vw] flex-col overflow-hidden border-l transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="border-agent-outline-variant flex items-center gap-2 border-b px-4 py-3">
          <Icon name="messageSquare" className="text-agent-primary h-4 w-4" />
          <h2 className="text-agent-on-surface flex-1 text-sm font-semibold">
            Assistant
          </h2>
          <button
            onClick={onClose}
            className="text-agent-on-surface-variant hover:bg-agent-surface-container flex h-7 w-7 items-center justify-center rounded-md transition-colors"
            aria-label="Close chat"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        {/* Chat */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ChatPanel />
        </div>
      </div>
    </>
  );
}
