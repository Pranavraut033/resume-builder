/**
 * TagsEditor Component
 * Reusable component for managing tags/arrays of short strings (skills, technologies, etc.)
 * Similar to BulletListEditor but optimized for short items displayed as chips.
 */

"use client";

import { Button } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { useState } from "react";

interface TagsEditorProps {
  label: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  helpText?: string;
  onAIGenerate?: () => Promise<string[]>;
}

export function TagsEditor({
  label,
  tags,
  onTagsChange,
  placeholder = "Add a tag and press Enter",
  helpText,
  onAIGenerate,
}: TagsEditorProps) {
  const [newTag, setNewTag] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

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

  const handleAIGenerate = async () => {
    if (!onAIGenerate) return;

    try {
      setIsGenerating(true);
      const generated = await onAIGenerate();
      const newTags = generated.filter((tag) => !tags.includes(tag));
      onTagsChange([...tags, ...newTags]);
    } catch (error) {
      console.error("AI generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
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
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        {onAIGenerate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAIGenerate}
            disabled={isGenerating}
            title="Generate suggestions with AI"
          >
            <Icon name="SparklesIcon" className="w-4 h-4" />
            <span className="ml-1 text-xs">{isGenerating ? "Generating..." : "AI Generate"}</span>
          </Button>
        )}
      </div>

      {/* Input for new tag */}
      <input
        type="text"
        value={newTag}
        onChange={(e) => setNewTag(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
      />

      {/* Tags display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium"
            >
              <span>{tag}</span>
              <button
                onClick={() => handleRemoveTag(index)}
                className="hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
                title="Remove"
              >
                <Icon name="XMarkIcon" className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {helpText && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helpText}</p>
      )}
    </div>
  );
}
