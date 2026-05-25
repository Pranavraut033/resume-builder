"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { useJobPageContext } from "@/contexts/JobPageContext";

import { ChatPanel } from "./ChatPanel";

export function ChatFAB() {
  const { contentType, chatSnapPosition } = useJobPageContext();

  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  // When snapped in resume mode, hide the FAB — EditorLayout renders the panel
  if (contentType === "resume" && chatSnapPosition !== "undocked") return null;
  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-3">
      {/* Floating panel */}
      <div
        className="origin-bottom-right transition-all duration-200"
        style={{
          opacity: isOpen ? 1 : 0,
          transform: isOpen
            ? "scale(1) translateY(0)"
            : "scale(0.95) translateY(8px)",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        {isOpen && <ChatPanel onClose={handleClose} />}
      </div>

      {/* FAB */}
      <button
        type="button"
        title={isOpen ? "Close AI chat" : "Open AI chat"}
        onClick={isOpen ? handleClose : handleOpen}
        className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: isOpen
            ? "var(--color-agent-surface-high)"
            : "var(--color-agent-primary)",
          color: isOpen
            ? "var(--color-agent-on-surface)"
            : "var(--color-agent-on-primary)",
          boxShadow: "var(--shadow-agent-float)",
        }}
      >
        <Icon
          name={isOpen ? "circleX" : "sparkles"}
          className="h-5 w-5 transition-transform duration-200"
        />
      </button>
    </div>
  );
}
