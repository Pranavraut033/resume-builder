"use client";

import { useEffect, useRef, useState } from "react";

import { RichTextEditor } from "@/components/form/RichTextEditor";
import { CoverLetterRenderer } from "@/components/job/templates/coverLetter/CoverLetterRenderer";
import { TemplateRenderer } from "@/components/job/templates/TemplateRenderer";
import { Icon } from "@/components/ui/Icon";
import { useJobPageContext } from "@/contexts/JobPageContext";
import useResolveCustomization from "@/hooks/useResolveCustomization";
import cn from "@/lib/cn";
import { getPageDimensions } from "@/lib/pageDimensions";

import { CoverLetterActionBar } from "./CoverLetterActionBar";
import { InlineEditProvider } from "./resume/InlineEditContext";
import { InlineSuggestionData } from "./resume/InlineSuggestion";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;
const CANVAS_PADDING_X = 48; // matches px-6 on each side

function clampZoom(z: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

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

  // ── Zoom (resume canvas only) ────────────────────────────────────────────
  const { widthPx } = getPageDimensions(
    customization.pageFormat,
    customization.marginSize
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number | "fit">("fit");
  const [fitScale, setFitScale] = useState(1);
  const [docHeight, setDocHeight] = useState(0);

  useEffect(() => {
    if (contentType !== "resume" || !scrollRef.current) return;
    const el = scrollRef.current;
    const observer = new ResizeObserver(() => {
      setFitScale(clampZoom((el.clientWidth - CANVAS_PADDING_X) / widthPx));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [contentType, widthPx]);

  useEffect(() => {
    if (contentType !== "resume" || !docRef.current) return;
    const el = docRef.current;
    const observer = new ResizeObserver(() => setDocHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, [contentType]);

  const effectiveScale = zoom === "fit" ? fitScale : zoom;

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
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col overflow-auto px-6 py-20"
      >
        {/* Placeholder sized to the scaled document so scrollbars stay accurate
            and the unscaled content (laid out at its natural width) can be
            centered via margin auto. */}
        <div
          style={{
            width: widthPx * effectiveScale,
            height: docHeight * effectiveScale || undefined,
            margin: "0 auto",
          }}
        >
          <div
            ref={docRef}
            style={{
              width: widthPx,
              transform: `scale(${effectiveScale})`,
              transformOrigin: "top left",
            }}
          >
            {/* The TemplateRenderer is the single source of truth — it IS the document.
                InlineEditProvider makes every wired field click-to-edit. */}
            <div className="shadow-agent-modal rounded-sm bg-white ring-1 ring-black/5">
              <InlineEditProvider
                resume={resume}
                updateResume={updateResumeState}
              >
                <div
                  className={cn(textSize, lineHeight)}
                  style={{ fontFamily, color: textColor }}
                >
                  <TemplateRenderer
                    resume={resume}
                    customization={customization}
                  />
                </div>
              </InlineEditProvider>
            </div>
          </div>
        </div>

        {/* Bottom spacer so last section isn't flush against viewport edge */}
        <div className="h-16" />
      </div>

      {/* Zoom control pill */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-40 -translate-x-1/2">
        <div className="border-agent-outline-variant bg-agent-surface-lowest/80 shadow-agent-modal pointer-events-auto flex items-center gap-0.5 rounded-full border p-1 backdrop-blur-xs">
          <button
            onClick={() => setZoom(clampZoom(effectiveScale - ZOOM_STEP))}
            disabled={effectiveScale <= MIN_ZOOM}
            className="text-agent-on-surface-variant hover:bg-agent-surface-container hover:text-agent-on-surface flex h-7 w-7 items-center justify-center rounded-full transition-all disabled:opacity-30"
            title="Zoom out"
          >
            <Icon name="minus" className="h-3.5 w-3.5" />
          </button>
          <span className="text-agent-on-surface-variant w-11 text-center text-xs font-medium tabular-nums">
            {Math.round(effectiveScale * 100)}%
          </span>
          <button
            onClick={() => setZoom(clampZoom(effectiveScale + ZOOM_STEP))}
            disabled={effectiveScale >= MAX_ZOOM}
            className="text-agent-on-surface-variant hover:bg-agent-surface-container hover:text-agent-on-surface flex h-7 w-7 items-center justify-center rounded-full transition-all disabled:opacity-30"
            title="Zoom in"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
          </button>

          <span className="bg-agent-outline-variant mx-0.5 h-5 w-px" />

          <button
            onClick={() => setZoom("fit")}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              zoom === "fit"
                ? "bg-agent-primary text-agent-on-primary"
                : "text-agent-on-surface-variant hover:bg-agent-surface-container hover:text-agent-on-surface"
            )}
            title="Fit to window"
          >
            Fit
          </button>
          <button
            onClick={() => setZoom(1)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              zoom === 1
                ? "bg-agent-primary text-agent-on-primary"
                : "text-agent-on-surface-variant hover:bg-agent-surface-container hover:text-agent-on-surface"
            )}
            title="Actual size"
          >
            100%
          </button>
        </div>
      </div>
    </div>
  );
}
