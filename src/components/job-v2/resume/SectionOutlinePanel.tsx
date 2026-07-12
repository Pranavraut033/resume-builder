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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

import { SideDrawer } from "@/components/job-v2/SideDrawer";
import { Icon } from "@/components/ui/Icon";
import { useJobPageContext } from "@/contexts/JobPageContext";
import cn from "@/lib/cn";
import {
  BUILTIN_SECTION_LABELS,
  BuiltinSectionId,
  getSectionLayout,
} from "@/types/resume";

interface SectionOutlinePanelProps {
  open: boolean;
  onClose: () => void;
}

/**
 * SectionOutlinePanel — drawer for reordering, hiding, and managing resume
 * sections. Single source of truth for `resume.sectionLayout`: drag to
 * reorder, eye toggle to hide a built-in section, +/- to add or remove a
 * custom section, click a custom title to rename it.
 *
 * ponytail: this is a flat ordered list, not Enhance-CV-style per-page boxes
 * — true page grouping needs each section's resolved page index, which only
 * exists inside TemplateEngine's pagination hooks today. Wire a page-index
 * callback out of TemplateEngine when that's worth the complexity; until
 * then the flat list still gives full reorder/hide/custom-section control.
 */
export function SectionOutlinePanel({
  open,
  onClose,
}: SectionOutlinePanelProps) {
  const { resume, updateResumeState } = useJobPageContext();
  const sectionLayout = getSectionLayout(resume);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sectionLayout.order.indexOf(active.id as string);
    const newIndex = sectionLayout.order.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    updateResumeState(
      {
        sectionLayout: {
          ...sectionLayout,
          order: arrayMove(sectionLayout.order, oldIndex, newIndex),
        },
      },
      "Reordered sections"
    );
  };

  const toggleHidden = (id: string) => {
    const hidden = sectionLayout.hidden.includes(id)
      ? sectionLayout.hidden.filter((h) => h !== id)
      : [...sectionLayout.hidden, id];
    updateResumeState(
      { sectionLayout: { ...sectionLayout, hidden } },
      "Toggled section visibility"
    );
  };

  const addCustomSection = () => {
    const id = `custom-${Date.now()}`;
    updateResumeState(
      {
        sectionLayout: {
          ...sectionLayout,
          order: [...sectionLayout.order, id],
          custom: [
            ...sectionLayout.custom,
            { id, title: "New Section", type: "bullets" as const, items: [] },
          ],
        },
      },
      "Added custom section"
    );
    setRenamingId(id);
  };

  const removeCustomSection = (id: string) => {
    updateResumeState(
      {
        sectionLayout: {
          ...sectionLayout,
          order: sectionLayout.order.filter((s) => s !== id),
          hidden: sectionLayout.hidden.filter((s) => s !== id),
          custom: sectionLayout.custom.filter((c) => c.id !== id),
        },
      },
      "Removed custom section"
    );
  };

  const renameCustomSection = (id: string, title: string) => {
    updateResumeState(
      {
        sectionLayout: {
          ...sectionLayout,
          custom: sectionLayout.custom.map((c) =>
            c.id === id ? { ...c, title } : c
          ),
        },
      },
      "Renamed section"
    );
  };

  const labelFor = (id: string) =>
    BUILTIN_SECTION_LABELS[id as BuiltinSectionId] ??
    sectionLayout.custom.find((c) => c.id === id)?.title ??
    id;

  const isCustom = (id: string) =>
    sectionLayout.custom.some((c) => c.id === id);

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      icon="panelLeftClose"
      title="Sections"
      widthClass="w-80"
      footer={
        <div className="border-agent-outline-variant border-t p-2">
          <button
            onClick={addCustomSection}
            className="text-agent-on-surface-variant hover:bg-agent-surface-container flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            Add section
          </button>
        </div>
      }
    >
      <DndContext
        id="section-outline-panel"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sectionLayout.order}
          strategy={verticalListSortingStrategy}
        >
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
            {sectionLayout.order.map((id) => (
              <SectionChip
                key={id}
                id={id}
                label={labelFor(id)}
                hidden={sectionLayout.hidden.includes(id)}
                custom={isCustom(id)}
                renaming={renamingId === id}
                onToggleHidden={() => toggleHidden(id)}
                onRemove={() => removeCustomSection(id)}
                onStartRename={() => setRenamingId(id)}
                onCommitRename={(title) => {
                  renameCustomSection(id, title || "New Section");
                  setRenamingId(null);
                }}
              />
            ))}
          </nav>
        </SortableContext>
      </DndContext>
    </SideDrawer>
  );
}

function SectionChip({
  id,
  label,
  hidden,
  custom,
  renaming,
  onToggleHidden,
  onRemove,
  onStartRename,
  onCommitRename,
}: {
  id: string;
  label: string;
  hidden: boolean;
  custom: boolean;
  renaming: boolean;
  onToggleHidden: () => void;
  onRemove: () => void;
  onStartRename: () => void;
  onCommitRename: (title: string) => void;
}) {
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
        opacity: isDragging ? 0.5 : 1,
      }}
      className={cn(
        "group flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-colors",
        isDragging
          ? "border-agent-primary bg-agent-primary-container/20"
          : "border-agent-outline-variant/60 hover:bg-agent-surface-container/50",
        hidden && "opacity-50"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-agent-on-surface-variant hover:text-agent-primary cursor-grab touch-none rounded p-0.5 active:cursor-grabbing"
        aria-label={`Drag to reorder ${label}`}
      >
        <Icon name="gripVertical" className="h-3.5 w-3.5" />
      </button>

      {renaming ? (
        <input
          autoFocus
          defaultValue={label}
          onBlur={(e) => onCommitRename(e.target.value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className="text-agent-on-surface ring-agent-primary min-w-0 flex-1 rounded border-none bg-transparent px-1 text-xs ring-1 outline-none"
        />
      ) : (
        <span
          onClick={custom ? onStartRename : undefined}
          className={cn(
            "min-w-0 flex-1 truncate text-xs font-medium",
            custom && "cursor-text hover:underline"
          )}
          title={custom ? "Click to rename" : undefined}
        >
          {label}
        </span>
      )}

      <button
        onClick={onToggleHidden}
        className="text-agent-on-surface-variant hover:bg-agent-surface-container rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
        aria-label={hidden ? `Show ${label}` : `Hide ${label}`}
        title={hidden ? "Show in export" : "Hide from export"}
      >
        <Icon name={hidden ? "eyeOff" : "eye"} className="h-3 w-3" />
      </button>

      {custom && (
        <button
          onClick={onRemove}
          className="text-agent-on-surface-variant hover:bg-agent-error-container hover:text-agent-on-error-container rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label={`Delete ${label}`}
          title="Delete section"
        >
          <Icon name="trash" className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
