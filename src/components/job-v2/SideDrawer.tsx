"use client";

import { Icon, IconName } from "@/components/ui/Icon";
import { useEscapeKey } from "@/hooks/useEscapeKey";
import cn from "@/lib/cn";

interface SideDrawerProps {
  open: boolean;
  onClose: () => void;
  icon: IconName;
  title: string;
  /** Panel width class, e.g. "w-96" or "w-80". Defaults to "w-96". */
  widthClass?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * SideDrawer — shared backdrop + slide-in panel + header chrome for the
 * canvas-overlay drawers (ATS, History, Sections). Escape-to-close and the
 * backdrop click are wired in; content and an optional footer are the
 * per-drawer part.
 */
export function SideDrawer({
  open,
  onClose,
  icon,
  title,
  widthClass = "w-96",
  children,
  footer,
}: SideDrawerProps) {
  useEscapeKey(open, onClose);

  return (
    <>
      {open && (
        <div
          className="absolute inset-0 z-30 bg-black/10 backdrop-blur-[1px]"
          onClick={onClose}
          aria-hidden
        />
      )}

      <div
        className={cn(
          "border-agent-outline-variant bg-agent-surface-lowest shadow-agent-modal absolute top-0 right-0 z-40 flex h-full flex-col overflow-hidden border-l transition-transform duration-200",
          widthClass,
          open ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!open}
      >
        <div className="border-agent-outline-variant flex items-center gap-2 border-b px-4 py-3">
          <Icon name={icon} className="text-agent-primary h-4 w-4" />
          <h2 className="text-agent-on-surface flex-1 text-sm font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-agent-on-surface-variant hover:bg-agent-surface-container flex h-7 w-7 items-center justify-center rounded-md transition-colors"
            aria-label={`Close ${title.toLowerCase()} drawer`}
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        {children}

        {footer}
      </div>
    </>
  );
}
