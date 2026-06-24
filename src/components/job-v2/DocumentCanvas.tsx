"use client";

import { useRef, useState } from "react";

import { RichTextEditor } from "@/components/form/RichTextEditor";
import { CoverLetterRenderer } from "@/components/job/templates/coverLetter/CoverLetterRenderer";
import { TemplateRenderer } from "@/components/job/templates/TemplateRenderer";
import { useJobPageContext } from "@/contexts/JobPageContext";
import useResolveCustomization from "@/hooks/useResolveCustomization";
import cn from "@/lib/cn";

import { CoverLetterActionBar } from "./CoverLetterActionBar";
import { InlineEditProvider } from "./resume/InlineEditContext";
import { InlineSuggestionData } from "./resume/InlineSuggestion";

interface DocumentCanvasProps {
  activeSuggestions?: InlineSuggestionData[];
  onSuggestionAccept?: (suggestion: InlineSuggestionData) => void;
  onSuggestionDismiss?: (id: string) => void;
}

/**
 * DocumentCanvas — the central WYSIWYG editing surface for the V2 inline editor.
 *
 * For the resume it renders the full TemplateRenderer as-is — section reorder/
 * hide/custom-section management lives in the SectionOutlinePanel drawer (see
 * InlineJobPageLayout), not as an overlay here. For cover letter it renders
 * CoverLetterRenderer with a click-to-edit overlay.
 */
export function DocumentCanvas({
  activeSuggestions: _suggestions = [],
  onSuggestionAccept: _onAccept,
  onSuggestionDismiss: _onDismiss,
}: DocumentCanvasProps) {
  const {
    resume,
    coverLetter,
    customization,
    contentType,
    updateCoverLetterState,
    updateResumeState,
  } = useJobPageContext();

  const { textSize, lineHeight, fontFamily, textColor } =
    useResolveCustomization(customization);

  const [isCoverLetterEditing, setIsCoverLetterEditing] = useState(false);
  const clContainerRef = useRef<HTMLDivElement>(null);

  if (contentType === "coverLetter") {
    return (
      <div className="flex flex-1 flex-col overflow-y-auto px-6 py-4">
        {/* Floating action bar */}
        <CoverLetterActionBar />

        {/* Cover letter document canvas */}
        <div
          ref={clContainerRef}
          className={cn(
            "shadow-agent-modal relative mx-auto w-full max-w-[794px] cursor-text",
            "rounded-sm bg-white ring-1 ring-black/5"
          )}
          onClick={() => setIsCoverLetterEditing(true)}
        >
          {isCoverLetterEditing ? (
            /* Inline RTE overlay — mounted over the rendered position */
            <div className="relative z-10 min-h-[1056px] w-full">
              <RichTextEditor
                value={coverLetter}
                onChange={updateCoverLetterState}
                placeholder="Your cover letter…"
                stickyToolbar
              />
              <button
                className="bg-agent-surface-container text-agent-on-surface-variant hover:bg-agent-surface-high absolute top-2 right-2 z-20 rounded-md px-2 py-1 text-xs shadow"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCoverLetterEditing(false);
                }}
              >
                Done
              </button>
            </div>
          ) : (
            <CoverLetterRenderer
              coverLetter={coverLetter}
              resume={resume}
              customization={customization}
            />
          )}
        </div>
        {/* Bottom spacer */}
        <div className="h-16" />
      </div>
    );
  }

  // ── Resume WYSIWYG canvas ──────────────────────────────────────────────────

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-6 py-20">
      <div className="relative mx-auto w-full max-w-[794px]">
        {/* The TemplateRenderer is the single source of truth — it IS the document.
            InlineEditProvider makes every wired field click-to-edit. */}
        <div className="shadow-agent-modal rounded-sm bg-white ring-1 ring-black/5">
          <InlineEditProvider resume={resume} updateResume={updateResumeState}>
            <div
              className={cn(textSize, lineHeight)}
              style={{ fontFamily, color: textColor }}
            >
              <TemplateRenderer resume={resume} customization={customization} />
            </div>
          </InlineEditProvider>
        </div>
      </div>

      {/* Bottom spacer so last section isn't flush against viewport edge */}
      <div className="h-16" />
    </div>
  );
}
