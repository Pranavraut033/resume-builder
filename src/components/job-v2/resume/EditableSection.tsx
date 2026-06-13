"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Icon } from "@/components/ui/Icon";
import cn from "@/lib/cn";
import { V2SectionId } from "@/types/customization";

interface EditableSectionProps {
  sectionId: V2SectionId;
  title: string;
  children: React.ReactNode;
  isHidden?: boolean;
  onToggleVisibility?: (id: V2SectionId) => void;
  onAddItem?: (id: V2SectionId) => void;
}

/**
 * EditableSection — a sortable drag-and-drop wrapper for top-level resume sections
 * in the V2 inline editor. Exposes drag handle, hover affordances, and section
 * action controls (add item, toggle visibility).
 */
export function EditableSection({
  sectionId,
  title,
  children,
  isHidden = false,
  onToggleVisibility,
  onAddItem,
}: EditableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sectionId });

  return (
    <div
      id={`v2-section-${sectionId}`}
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={cn(
        "group/section relative mb-4 scroll-mt-4",
        isHidden && "opacity-40"
      )}
    >
      {/* Section container */}
      <div
        className={cn(
          "rounded-xl border transition-all duration-150",
          isDragging
            ? "border-agent-primary bg-agent-primary-container/20 shadow-agent-modal"
            : "hover:border-agent-outline-variant/60 hover:bg-agent-surface-container/30 border-transparent"
        )}
      >
        {/* Section header — visible on hover */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 opacity-0 transition-opacity duration-150",
            "group-hover/section:opacity-100",
            isDragging && "opacity-100"
          )}
        >
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className="text-agent-on-surface-variant hover:text-agent-primary cursor-grab touch-none rounded p-0.5 transition-colors active:cursor-grabbing"
            aria-label={`Drag to reorder ${title} section`}
          >
            <Icon name="gripVertical" className="h-4 w-4" />
          </button>

          <span className="text-agent-on-surface-variant text-xs font-semibold tracking-widest uppercase">
            {title}
          </span>

          <div className="flex-1" />

          {/* Toggle visibility */}
          {onToggleVisibility && (
            <button
              onClick={() => onToggleVisibility(sectionId)}
              className="text-agent-on-surface-variant hover:bg-agent-surface-container rounded p-1 transition-colors"
              aria-label={
                isHidden ? `Show ${title} section` : `Hide ${title} section`
              }
              title={isHidden ? "Show in export" : "Hide from export"}
            >
              <Icon
                name={isHidden ? "eyeOff" : "eye"}
                className="h-3.5 w-3.5"
              />
            </button>
          )}

          {/* Add item */}
          {onAddItem && (
            <button
              onClick={() => onAddItem(sectionId)}
              className="text-agent-on-surface-variant hover:bg-agent-surface-container rounded p-1 transition-colors"
              aria-label={`Add item to ${title}`}
              title="Add item"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="px-1 pb-1">{children}</div>
      </div>
    </div>
  );
}
