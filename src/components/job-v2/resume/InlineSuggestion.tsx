"use client";

import { useRef, useEffect, type ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";
import cn from "@/lib/cn";

export interface InlineSuggestionData {
  id: string;
  /** Dot-notation path into the resume object, e.g. "experience.0.description" */
  targetPath: string;
  originalText: string;
  suggestedText: string;
  /** Short preview label shown in the tooltip */
  preview?: string;
}

interface InlineSuggestionProps {
  suggestion: InlineSuggestionData;
  /** The wrapped content that carries the highlight */
  children: ReactNode;
  onAccept: (suggestion: InlineSuggestionData) => void;
  onDismiss: (id: string) => void;
}

/**
 * InlineSuggestion — wraps a piece of text with a subtle highlight and floats
 * an accept/dismiss tooltip above it. Suggestions are purely transient UI state.
 */
export function InlineSuggestion({
  suggestion,
  children,
  onAccept,
  onDismiss,
}: InlineSuggestionProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  // Dismiss on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss(suggestion.id);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onDismiss, suggestion.id]);

  return (
    <span ref={containerRef} className="group/suggestion relative inline">
      {/* Highlighted text */}
      <span
        className={cn(
          "relative inline cursor-pointer rounded-sm px-0.5 transition-colors",
          "decoration-agent-primary underline decoration-wavy decoration-2 underline-offset-2",
          "bg-agent-primary/10 hover:bg-agent-primary/20"
        )}
        title="AI suggestion available — click to review"
      >
        {children}
      </span>

      {/* Floating tooltip — visible on group hover */}
      <span
        className={cn(
          "absolute bottom-full left-0 z-50 mb-1.5 hidden max-w-[320px] min-w-[200px]",
          "border-agent-outline-variant bg-agent-surface-lowest shadow-agent-modal rounded-lg border",
          "flex-col gap-1.5 p-2.5 group-hover/suggestion:flex",
          "animate-in fade-in slide-in-from-bottom-1 duration-150"
        )}
      >
        {/* Preview text */}
        <p className="text-agent-on-surface-variant line-clamp-3 text-xs leading-relaxed">
          <span className="text-agent-primary mr-1 font-semibold">AI:</span>
          {suggestion.preview ?? suggestion.suggestedText}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <button
            onClick={() => onAccept(suggestion)}
            className="bg-agent-primary text-agent-on-primary flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-opacity hover:opacity-90"
            aria-label="Accept suggestion"
          >
            <Icon name="check" className="h-3 w-3" />
            Accept
          </button>
          <button
            onClick={() => onDismiss(suggestion.id)}
            className="text-agent-on-surface-variant hover:bg-agent-surface-container flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors"
            aria-label="Dismiss suggestion"
          >
            <Icon name="x" className="h-3 w-3" />
            Dismiss
          </button>
        </div>
      </span>
    </span>
  );
}
