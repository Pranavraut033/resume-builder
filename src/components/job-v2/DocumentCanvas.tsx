"use client";

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useCallback, useRef, useState } from "react";

import { RichTextEditor } from "@/components/form/RichTextEditor";
import { CoverLetterRenderer } from "@/components/job/templates/coverLetter/CoverLetterRenderer";
import { TemplateRenderer } from "@/components/job/templates/TemplateRenderer";
import { useJobPageContext } from "@/contexts/JobPageContext";
import useResolveCustomization from "@/hooks/useResolveCustomization";
import cn from "@/lib/cn";
import {
  V2SectionId,
  V2_DEFAULT_SECTION_ORDER,
  V2Customization,
} from "@/types/customization";

import { CoverLetterActionBar } from "./CoverLetterActionBar";
import { EditableSection } from "./resume/EditableSection";
import { InlineEditProvider } from "./resume/InlineEditContext";
import { InlineSuggestionData } from "./resume/InlineSuggestion";

const SECTION_LABELS: Record<V2SectionId, string> = {
  personal: "Personal Info",
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certifications: "Certifications",
};

interface DocumentCanvasProps {
  activeSuggestions?: InlineSuggestionData[];
  onSuggestionAccept?: (suggestion: InlineSuggestionData) => void;
  onSuggestionDismiss?: (id: string) => void;
}

/**
 * DocumentCanvas — the central WYSIWYG editing surface for the V2 inline editor.
 *
 * For the resume it renders the full TemplateRenderer with section-level drag-and-drop
 * affordances overlaid via EditableSection wrappers. For cover letter it renders
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
    updateCustomizationState,
    updateCoverLetterState,
    updateResumeState,
  } = useJobPageContext();

  const { textSize, lineHeight, fontFamily, textColor } =
    useResolveCustomization(customization);

  // V2 extensions stored transiently (not persisted in this phase)
  const v2Customization = customization as V2Customization;
  const sectionOrder: V2SectionId[] =
    v2Customization.sectionOrder ?? V2_DEFAULT_SECTION_ORDER;
  const hiddenSections: V2SectionId[] = v2Customization.hiddenSections ?? [];

  const [isCoverLetterEditing, setIsCoverLetterEditing] = useState(false);
  const clContainerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sectionOrder.indexOf(active.id as V2SectionId);
      const newIndex = sectionOrder.indexOf(over.id as V2SectionId);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(sectionOrder, oldIndex, newIndex);
      updateCustomizationState({
        // Cast: sectionOrder is a V2 extension stored in the JSON-backed field
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ sectionOrder: newOrder } as any),
        sectionOrder: newOrder,
      });
    },
    [sectionOrder, updateCustomizationState]
  );

  const handleToggleVisibility = useCallback(
    (id: V2SectionId) => {
      const next = hiddenSections.includes(id)
        ? hiddenSections.filter((s) => s !== id)
        : [...hiddenSections, id];
      updateCustomizationState({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...({ hiddenSections: next } as any),
        hiddenSections: next,
      });
    },
    [hiddenSections, updateCustomizationState]
  );

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
      {/* The TemplateRenderer is the single source of truth — it IS the document */}
      <div className="relative mx-auto w-full max-w-[794px]">
        {/* Section drag-and-drop affordances overlaid above the template */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sectionOrder}
            strategy={verticalListSortingStrategy}
          >
            {/* Drag handles rendered as thin wrappers — do NOT obstruct the template */}
            <div className="pointer-events-none absolute inset-0 z-10">
              {sectionOrder.map((sectionId) => (
                <EditableSection
                  key={sectionId}
                  sectionId={sectionId}
                  title={SECTION_LABELS[sectionId]}
                  isHidden={hiddenSections.includes(sectionId)}
                  onToggleVisibility={handleToggleVisibility}
                >
                  {/* Transparent placeholder — visual content is from TemplateRenderer below */}
                  <div
                    className="pointer-events-auto h-px w-full"
                    id={`v2-section-${sectionId}`}
                  />
                </EditableSection>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* The actual template — rendered as-is (WYSIWYG output).
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
