"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Icon } from "@/components/ui/Icon";
import cn from "@/lib/cn";

interface EditableItemProps {
  /** Stable sortable id, e.g. `experience-0`. */
  id: string;
  /** Accessible label for the controls, e.g. "experience entry". */
  label: string;
  onDelete: () => void;
  children: React.ReactNode;
}

/**
 * EditableItem — wraps a single resume entry (experience/education/project/
 * certification) with hover-revealed reorder + delete controls.
 *
 * Rendered only on the visible page (never in the off-screen measurement
 * copy), so each `id` registers exactly once with the parent SortableContext.
 *
 * The drag handle uses @dnd-kit's `useSortable`, which requires a dynamic
 * `transform` style — the same established pattern as EditableSection.
 */
export function EditableItem({
  id,
  label,
  onDelete,
  children,
}: EditableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "group/item relative rounded-md transition-shadow duration-150",
        isDragging
          ? "ring-agent-primary bg-agent-surface-lowest z-20 shadow-lg ring-1"
          : "ring-0"
      )}
    >
      {/* Hover gutter controls — sit in the page's left margin */}
      <div
        className={cn(
          "absolute top-0 -left-7 flex flex-col items-center gap-0.5",
          "opacity-0 transition-opacity duration-150",
          "group-hover/item:opacity-100 focus-within:opacity-100",
          isDragging && "opacity-100"
        )}
      >
        <button
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${label}`}
          className="text-agent-on-surface-variant hover:text-agent-primary hover:bg-agent-surface-container flex h-5 w-5 cursor-grab touch-none items-center justify-center rounded transition-colors active:cursor-grabbing"
        >
          <Icon name="gripVertical" className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          aria-label={`Delete ${label}`}
          title={`Delete ${label}`}
          className="text-agent-on-surface-variant hover:text-agent-error hover:bg-agent-error-container/40 flex h-5 w-5 items-center justify-center rounded transition-colors"
        >
          <Icon name="trash" className="h-3.5 w-3.5" />
        </button>
      </div>

      {children}
    </div>
  );
}
