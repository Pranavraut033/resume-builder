"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ReactNode } from "react";

import { Icon } from "./Icon";

interface SortableSectionProps {
  id: string;
  children: ReactNode;
}

export function SortableSection({ id, children }: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <div
        {...attributes}
        {...listeners}
        className="absolute top-4 -left-8 cursor-grab rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-100 active:cursor-grabbing"
        title="Drag to reorder"
      >
        <Icon name="gripVertical" size={16} className="text-gray-400" />
      </div>
      {children}
    </div>
  );
}
