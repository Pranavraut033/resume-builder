"use client";

import { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes}
        {...listeners}
        className="absolute -left-8 top-4 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity p-1 hover:bg-gray-100 rounded"
        title="Drag to reorder"
      >
        <Icon name="gripVertical" size={16} className="text-gray-400" />
      </div>
      {children}
    </div>
  );
}
