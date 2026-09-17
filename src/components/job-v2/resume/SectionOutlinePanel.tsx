"use client";

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

import {
  resolveTemplateConfig,
  TEMPLATE_CONFIG,
} from "@/components/job-v2/engine/templates";
import { SideDrawer } from "@/components/job-v2/SideDrawer";
import { Icon } from "@/components/ui/Icon";
import { useJobPageContext } from "@/contexts/JobPageContext";
import cn from "@/lib/cn";
import { TemplateType } from "@/types/customization";
import {
  BUILTIN_SECTION_LABELS,
  BuiltinSectionId,
  canMoveColumn,
  getSectionLayout,
  missingBuiltinSections,
} from "@/types/resume";

interface SectionOutlinePanelProps {
  open: boolean;
  onClose: () => void;
}

// Sentinel droppable ids for an empty column's drop zone — can't collide
// with a real section id (builtins are plain words, custom ids are
// "custom-<uuid>").
type ColumnDropId = "column-0" | "column-1";

// Rough visual weight per section, purely to make the mini canvas read like
// a page instead of a stack of same-size chips.
// ponytail: a hint, not a measurement — real block heights only exist
// inside TemplateEngine's pagination hooks (see the file doc comment below).
const SECTION_WEIGHT: Partial<Record<string, "tall" | "medium">> = {
  experience: "tall",
  projects: "tall",
  summary: "medium",
  education: "medium",
  skills: "medium",
};

/**
 * SectionOutlinePanel — drawer for reordering, hiding, moving between
 * columns, and managing resume sections. Single source of truth for
 * `resume.sectionLayout`: drag to reorder or move column, eye toggle to hide
 * a built-in section, +/- to add or remove a custom section, click a custom
 * title to rename it.
 *
 * Renders as a mini two-column page canvas (inspired by, not a copy of,
 * EnhanceCV's rearrange screen) so the side/main split is visible while
 * dragging — mirroring the current template's `columns`/`sectionColumn`.
 * Only sections in `canMoveColumn()` (small built-ins + custom sections) can
 * cross columns; summary/experience/projects/volunteer stay pinned to main,
 * and header is a locked bar. 1-column templates fall back to a single list.
 *
 * ponytail: the canvas is one abstract page, not per-page boxes — true page
 * grouping needs each section's resolved page index, which only exists
 * inside TemplateEngine's pagination hooks today. Wire a page-index callback
 * out of TemplateEngine when that's worth the complexity; until then this
 * still gives full reorder/column/hide/custom-section control, and the real
 * paginated preview is right next to this drawer.
 */
export function SectionOutlinePanel({
  open,
  onClose,
}: SectionOutlinePanelProps) {
  const { resume, customization, updateResumeState } = useJobPageContext();
  const sectionLayout = getSectionLayout(resume);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const config = resolveTemplateConfig(
    TEMPLATE_CONFIG[customization.template as TemplateType] ??
      TEMPLATE_CONFIG["modern-minimal"]!
  );
  const isTwoColumn = config.columns === 2;
  const sidebarRight = config.sidebarSide === "right";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const columnOf = (id: string): 0 | 1 => {
    const custom = sectionLayout.custom.find((c) => c.id === id);
    const builtinId = id as BuiltinSectionId;
    const fallbackKey = custom ? "custom" : builtinId;
    const base = config.sectionColumn?.[fallbackKey] ?? 0;
    if (!isTwoColumn || !canMoveColumn(id, sectionLayout)) return base;
    return sectionLayout.columns[id] ?? base;
  };

  const bodyOrder = sectionLayout.order.filter((id) => id !== "header");
  const col0Ids = bodyOrder.filter((id) => columnOf(id) === 0);
  const col1Ids = bodyOrder.filter((id) => columnOf(id) === 1);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const sourceColumn = columnOf(activeId);
    let destColumn = sourceColumn;
    let overSectionId: string | null = null;

    if (overId === "column-0" || overId === "column-1") {
      destColumn = overId === "column-0" ? 0 : 1;
    } else {
      overSectionId = overId;
      destColumn = columnOf(overId);
    }

    // Main-column-locked sections (and header) may reorder within main, but
    // can never land in the side column.
    if (destColumn === 0 && !canMoveColumn(activeId, sectionLayout)) return;

    const withoutActive = bodyOrder.filter((id) => id !== activeId);
    let insertIndex: number;
    if (overSectionId) {
      insertIndex = withoutActive.indexOf(overSectionId);
      if (insertIndex === -1) insertIndex = withoutActive.length;
    } else {
      let lastIndexInDest = -1;
      withoutActive.forEach((id, idx) => {
        if (columnOf(id) === destColumn) lastIndexInDest = idx;
      });
      insertIndex = lastIndexInDest + 1;
    }

    const newBodyOrder = [
      ...withoutActive.slice(0, insertIndex),
      activeId,
      ...withoutActive.slice(insertIndex),
    ];

    const newColumns =
      destColumn === sourceColumn
        ? sectionLayout.columns
        : { ...sectionLayout.columns, [activeId]: destColumn };

    updateResumeState(
      {
        sectionLayout: {
          ...sectionLayout,
          order: ["header", ...newBodyOrder],
          columns: newColumns,
        },
      },
      destColumn === sourceColumn ? "Reordered sections" : "Moved section"
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

  const addBuiltinSection = (id: BuiltinSectionId) => {
    updateResumeState(
      {
        sectionLayout: {
          ...sectionLayout,
          order: [...sectionLayout.order, id],
        },
      },
      `Added ${BUILTIN_SECTION_LABELS[id]}`
    );
  };

  const addCustomSection = () => {
    const id = `custom-${crypto.randomUUID()}`;
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

  const missing = missingBuiltinSections(sectionLayout);

  const columns = (
    <div
      className={cn("flex flex-1 gap-2", sidebarRight && "flex-row-reverse")}
    >
      <SectionColumn
        dropId="column-0"
        ids={col0Ids}
        widthClass="w-2/5"
        emptyLabel="Drag a small section here"
        renderChip={(id) => (
          <SectionChip
            key={id}
            id={id}
            label={labelFor(id)}
            hidden={sectionLayout.hidden.includes(id)}
            custom={isCustom(id)}
            locked={false}
            weight={SECTION_WEIGHT[id]}
            renaming={renamingId === id}
            onToggleHidden={() => toggleHidden(id)}
            onRemove={() => removeCustomSection(id)}
            onStartRename={() => setRenamingId(id)}
            onCommitRename={(title) => {
              renameCustomSection(id, title || "New Section");
              setRenamingId(null);
            }}
          />
        )}
      />
      <SectionColumn
        dropId="column-1"
        ids={col1Ids}
        widthClass="w-3/5"
        emptyLabel="Drag sections here"
        renderChip={(id) => (
          <SectionChip
            key={id}
            id={id}
            label={labelFor(id)}
            hidden={sectionLayout.hidden.includes(id)}
            custom={isCustom(id)}
            locked={!canMoveColumn(id, sectionLayout)}
            weight={SECTION_WEIGHT[id]}
            renaming={renamingId === id}
            onToggleHidden={() => toggleHidden(id)}
            onRemove={() => removeCustomSection(id)}
            onStartRename={() => setRenamingId(id)}
            onCommitRename={(title) => {
              renameCustomSection(id, title || "New Section");
              setRenamingId(null);
            }}
          />
        )}
      />
    </div>
  );

  const singleList = (
    <SortableContext items={bodyOrder} strategy={verticalListSortingStrategy}>
      <nav className="flex flex-1 flex-col gap-1.5">
        {bodyOrder.map((id) => (
          <SectionChip
            key={id}
            id={id}
            label={labelFor(id)}
            hidden={sectionLayout.hidden.includes(id)}
            custom={isCustom(id)}
            locked={false}
            weight={SECTION_WEIGHT[id]}
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
  );

  return (
    <SideDrawer
      open={open}
      onClose={onClose}
      icon="panelLeftClose"
      title="Sections"
      widthClass="w-[26rem]"
      footer={
        <div className="border-agent-outline-variant flex flex-col gap-1 border-t p-2">
          {missing.map((id) => (
            <button
              key={id}
              onClick={() => addBuiltinSection(id)}
              className="text-agent-on-surface-variant hover:bg-agent-surface-container flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              Add {BUILTIN_SECTION_LABELS[id]}
            </button>
          ))}
          <button
            onClick={addCustomSection}
            className="text-agent-on-surface-variant hover:bg-agent-surface-container flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            Add custom section
          </button>
        </div>
      }
    >
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {isTwoColumn && (
          <p className="text-agent-on-surface-variant px-1 text-[11px]">
            Drag the small sections between columns to balance the page.
          </p>
        )}
        <div className="border-agent-outline-variant bg-agent-surface flex flex-1 flex-col gap-2 rounded-xl border p-2 shadow-sm">
          {sectionLayout.order.includes("header") && (
            <div
              className={cn(
                "bg-agent-primary-container/50 text-agent-on-surface-variant group flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium",
                sectionLayout.hidden.includes("header") && "opacity-50"
              )}
            >
              <Icon name="lock" className="h-3 w-3" />
              <span className="flex-1">Header</span>
              <button
                onClick={() => toggleHidden("header")}
                className="hover:bg-agent-surface-container rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={
                  sectionLayout.hidden.includes("header")
                    ? "Show Header"
                    : "Hide Header"
                }
                title={
                  sectionLayout.hidden.includes("header")
                    ? "Show in export"
                    : "Hide from export"
                }
              >
                <Icon
                  name={
                    sectionLayout.hidden.includes("header") ? "eyeOff" : "eye"
                  }
                  className="h-3 w-3"
                />
              </button>
            </div>
          )}
          <DndContext
            id="section-outline-panel"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            {isTwoColumn ? columns : singleList}
          </DndContext>
        </div>
      </div>
    </SideDrawer>
  );
}

function SectionColumn({
  dropId,
  ids,
  widthClass,
  emptyLabel,
  renderChip,
}: {
  dropId: ColumnDropId;
  ids: string[];
  widthClass: string;
  emptyLabel: string;
  renderChip: (id: string) => React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId });

  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <div
        ref={setNodeRef}
        className={cn(
          "border-agent-outline-variant/60 flex min-h-24 flex-col gap-1.5 rounded-lg border border-dashed p-1.5 transition-colors",
          widthClass,
          isOver && "border-agent-primary bg-agent-primary-container/10"
        )}
      >
        {ids.length === 0 ? (
          <p className="text-agent-on-surface-variant/70 flex-1 px-1 py-2 text-center text-[11px]">
            {emptyLabel}
          </p>
        ) : (
          ids.map(renderChip)
        )}
      </div>
    </SortableContext>
  );
}

function SectionChip({
  id,
  label,
  hidden,
  custom,
  locked,
  weight,
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
  /** True for a main-column-locked section (can reorder within main, can't cross into the side column). */
  locked: boolean;
  weight?: "tall" | "medium";
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
        "group flex items-start gap-1.5 rounded-lg border px-2 py-1.5 transition-colors",
        weight === "tall" && "min-h-16",
        weight === "medium" && "min-h-10",
        isDragging
          ? "border-agent-primary bg-agent-primary-container/20"
          : "border-agent-outline-variant/60 hover:bg-agent-surface-container/50",
        hidden && "opacity-50"
      )}
      title={locked ? "Stays in the main column" : undefined}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-agent-on-surface-variant hover:text-agent-primary mt-0.5 cursor-grab touch-none rounded p-0.5 active:cursor-grabbing"
        aria-label={`Drag to reorder ${label}`}
      >
        <Icon name="gripVertical" className="h-3.5 w-3.5" />
      </button>

      {locked && (
        <Icon
          name="lock"
          className="text-agent-on-surface-variant/60 mt-1 h-2.5 w-2.5 shrink-0"
        />
      )}

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
