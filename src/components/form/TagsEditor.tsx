/**
 * TagsEditor Component
 * Reusable component for managing tags/arrays of short strings (skills, technologies, etc.)
 * Similar to BulletListEditor but optimized for short items displayed as chips.
 * AI generation happens at the panel level, not field level.
 */

"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

interface TagsEditorProps {
  label: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  helpText?: string;
  /** When provided, chips become clickable to toggle a "primary" state (e.g. skills). */
  isPrimary?: (tag: string) => boolean;
  onTogglePrimary?: (tag: string) => void;
}

export function TagsEditor({
  label,
  tags,
  onTagsChange,
  placeholder = "Add a tag and press Enter",
  helpText,
  isPrimary,
  onTogglePrimary,
}: TagsEditorProps) {
  const [newTag, setNewTag] = useState("");

  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === ",") {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === "Escape") {
      setNewTag("");
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-agent-on-surface block text-sm font-medium">
        {label}
      </label>

      {/* Input for new tag */}
      <input
        type="text"
        value={newTag}
        onChange={(e) => setNewTag(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="border-agent-outline-variant bg-agent-surface-lowest text-agent-on-surface caret-agent-primary w-full rounded-lg border px-3 py-1.5 text-sm transition-colors focus:ring-2 focus:outline-none"
      />

      {/* Tags display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => {
            const primary = isPrimary?.(tag) ?? false;
            return (
              <div
                key={index}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
                  primary
                    ? "bg-agent-primary text-agent-surface-lowest"
                    : "bg-agent-primary-container text-agent-on-primary-container"
                )}
              >
                {onTogglePrimary ? (
                  <button
                    type="button"
                    onClick={() => onTogglePrimary(tag)}
                    className="inline-flex items-center gap-1.5"
                    title={
                      primary
                        ? "Primary skill (click to unmark)"
                        : "Mark as primary"
                    }
                  >
                    {primary && (
                      <Icon name="star" className="h-3 w-3 fill-current" />
                    )}
                    <span>{tag}</span>
                  </button>
                ) : (
                  <span>{tag}</span>
                )}
                <button
                  onClick={() => handleRemoveTag(index)}
                  className="transition-opacity hover:opacity-80"
                  title="Remove"
                >
                  <Icon name="x" className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {helpText && (
        <p className="text-agent-on-surface-variant text-xs">{helpText}</p>
      )}
    </div>
  );
}
