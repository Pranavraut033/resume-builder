"use client";

import { useEffect } from "react";

import ThemeCustomizationPanel from "@/components/job/ThemeCustomizationPanel";
import { Icon } from "@/components/ui/Icon";
import cn from "@/lib/cn";

interface CustomizationDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * CustomizationDrawer — slides in from the right side of the document canvas.
 * Wraps the existing ThemeCustomizationPanel; all state management remains in
 * JobPageContext via updateCustomizationState.
 */
export function CustomizationDrawer({
  open,
  onClose,
}: CustomizationDrawerProps) {
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

      {/* Drawer panel */}
      <div
        className={cn(
          "border-agent-outline-variant bg-agent-surface-lowest shadow-agent-modal absolute top-0 right-0 z-40 flex h-full w-80 flex-col overflow-hidden border-l transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!open}
      >
        {/* Header */}
        <div className="border-agent-outline-variant flex items-center gap-2 border-b px-4 py-3">
          <Icon name="palette" className="text-agent-primary h-4 w-4" />
          <h2 className="text-agent-on-surface flex-1 text-sm font-semibold">
            Customize
          </h2>
          <button
            onClick={onClose}
            className="text-agent-on-surface-variant hover:bg-agent-surface-container flex h-7 w-7 items-center justify-center rounded-md transition-colors"
            aria-label="Close customization drawer"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <ThemeCustomizationPanel />
        </div>
      </div>
    </>
  );
}
