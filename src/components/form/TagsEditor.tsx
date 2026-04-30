/**
 * TagsEditor Component
 * Reusable component for managing tags/arrays of short strings (skills, technologies, etc.)
 * Similar to BulletListEditor but optimized for short items displayed as chips.
 * AI generation happens at the panel level, not field level.
 */

"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/Icon";

interface TagsEditorProps {
  label: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  helpText?: string;
}

export function TagsEditor({
  label,
  tags,
  onTagsChange,
  placeholder = "Add a tag and press Enter",
  helpText,
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
    <div className="space-y-3">
      <label
        className="block text-sm font-medium"
        style={{ color: "var(--color-agent-on-surface)" }}
      >
        {label}
      </label>

      {/* Input for new tag */}
      <input
        type="text"
        value={newTag}
        onChange={(e) => setNewTag(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full rounded-lg border px-3 py-2 transition-colors focus:ring-2 focus:outline-none"
        style={{
          borderColor: "var(--color-agent-outline-variant)",
          background: "var(--color-agent-surface-lowest)",
          color: "var(--color-agent-on-surface)",
          caretColor: "var(--color-agent-primary)",
        }}
      />

      {/* Tags display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium"
              style={{
                background: "var(--color-agent-primary-container)",
                color: "var(--color-agent-on-primary-container)",
              }}
            >
              <span>{tag}</span>
              <button
                onClick={() => handleRemoveTag(index)}
                className="transition-opacity hover:opacity-80"
                title="Remove"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {helpText && (
        <p
          className="text-xs"
          style={{ color: "var(--color-agent-on-surface-variant)" }}
        >
          {helpText}
        </p>
      )}
    </div>
  );
}
