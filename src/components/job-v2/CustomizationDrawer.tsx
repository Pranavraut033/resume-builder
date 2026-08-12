"use client";

import DownloadButton from "@/components/job/DownloadButton";
import ThemeCustomizationPanel from "@/components/job/ThemeCustomizationPanel";
import { Icon } from "@/components/ui/Icon";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import cn from "@/lib/cn";

interface CustomizationDrawerProps {
  open: boolean;
  onClose: () => void;
}

/**
 * CustomizationDrawer — side panel that slides in from the left by
 * transitioning width, mirroring ChatOverlay. No backdrop, no absolute
 * positioning — the document canvas shrinks to make room.
 */
export function CustomizationDrawer({
  open,
  onClose,
}: CustomizationDrawerProps) {
  useEscapeKey(open, onClose);

  return (
    <aside
      className={cn(
        "border-agent-outline-variant bg-agent-surface-lowest flex shrink-0 flex-col overflow-hidden border-r transition-[width] duration-200 ease-in-out",
        open ? "w-80" : "w-0"
      )}
      aria-hidden={!open}
    >
      {/* Fixed-width inner so content doesn't reflow during the slide animation */}
      <div className="flex h-full w-80 min-w-0 flex-col">
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

        {/* Export footer */}
        <div className="border-agent-outline-variant flex flex-col gap-2 border-t px-4 py-3">
          <h3 className="text-agent-on-surface text-sm font-semibold">
            Finalize &amp; Export
          </h3>
          <DownloadButton />
        </div>
      </div>
    </aside>
  );
}
