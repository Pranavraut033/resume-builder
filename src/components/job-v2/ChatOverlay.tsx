"use client";

import { useEffect } from "react";

import { ChatPanel } from "@/components/chat/ChatPanel";
import cn from "@/lib/cn";

interface ChatOverlayProps {
  open: boolean;
  onClose: () => void;
}

/**
 * ChatOverlay — side panel that slides in from the right by transitioning width.
 * No backdrop, no absolute positioning — the document canvas shrinks to make room.
 */
export function ChatOverlay({ open, onClose }: ChatOverlayProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <aside
      className={cn(
        "border-agent-outline-variant bg-agent-surface-lowest flex shrink-0 flex-col overflow-hidden border-l transition-[width] duration-200 ease-in-out",
        open ? "w-96" : "w-0"
      )}
      aria-hidden={!open}
    >
      {/* Fixed-width inner so content doesn't reflow during the slide animation */}
      <div className="flex h-full w-96 min-w-0 flex-col">
        <ChatPanel onClose={onClose} />
      </div>
    </aside>
  );
}
