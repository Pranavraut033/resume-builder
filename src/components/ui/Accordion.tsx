"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Icon } from "./Icon";

interface AccordionSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  /** Shows a small dot next to the title when this section has unsaved edits. */
  dirty?: boolean;
  children: ReactNode;
  className?: string;
}

/** One collapsible section. Body only mounts while open. */
export function AccordionSection({
  title,
  isOpen,
  onToggle,
  dirty,
  children,
  className,
}: AccordionSectionProps) {
  return (
    <div
      className={cn(
        "bg-agent-surface-low overflow-hidden rounded-2xl",
        className
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="text-agent-on-surface flex w-full items-center justify-between gap-2 px-5 py-4 text-left text-base font-semibold"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2">
          {title}
          {dirty && (
            <span
              className="bg-agent-primary h-2 w-2 shrink-0 rounded-full"
              title="Unsaved changes"
            />
          )}
        </span>
        <Icon
          name="chevronDown"
          className={cn(
            "text-agent-on-surface-variant h-5 w-5 shrink-0 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
