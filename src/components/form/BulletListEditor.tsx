/**
 * BulletListEditor Component
 * Reusable component for managing lists of items (achievements, technologies, skills, etc.)
 * Supports add, edit, delete operations with inline editing and AI generation.
 */

"use client";

import { Button } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { useState } from "react";

interface BulletListEditorProps {
  label: string;
  items: string[];
  onItemsChange: (items: string[]) => void;
  placeholder?: string;
  helpText?: string;
  onAIGenerate?: () => Promise<string[]>;
}

export function BulletListEditor({
  label,
  items,
  onItemsChange,
  placeholder = "Add an item and press Enter",
  helpText,
  onAIGenerate,
}: BulletListEditorProps) {
  const [newItem, setNewItem] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAddItem = () => {
    if (newItem.trim()) {
      onItemsChange([...items, newItem.trim()]);
      setNewItem("");
    }
  };

  const handleDeleteItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingValue(items[index]);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editingValue.trim()) {
      const updated = [...items];
      updated[editingIndex] = editingValue.trim();
      onItemsChange(updated);
      setEditingIndex(null);
      setEditingValue("");
    }
  };

  const handleAIGenerate = async () => {
    if (!onAIGenerate) return;

    try {
      setIsGenerating(true);
      const generated = await onAIGenerate();
      onItemsChange([...items, ...generated]);
    } catch (error) {
      console.error("AI generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAddItem();
    } else if (e.key === "Escape") {
      setNewItem("");
    }
  };

  const handleKeyDownEdit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      setEditingIndex(null);
      setEditingValue("");
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

      {/* Input for new item */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
        />
        <Button
          variant="primary"
          size="sm"
          onClick={handleAddItem}
          disabled={!newItem.trim()}
        >
          <Icon name="PlusIcon" className="w-4 h-4" />
        </Button>
      </div>

      {/* List of items */}
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={index}
              className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 group"
            >
              <Icon name="CheckCircleIcon" className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              {editingIndex === index ? (
                <input
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={handleKeyDownEdit}
                  autoFocus
                  className="flex-1 px-2 py-1 border border-blue-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <span className="flex-1 text-gray-700 dark:text-gray-300 break-words">
                  {item}
                </span>
              )}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {editingIndex === index ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveEdit}
                    title="Save"
                  >
                    <Icon name="CheckIcon" className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStartEdit(index)}
                    title="Edit"
                  >
                    <Icon name="PencilIcon" className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteItem(index)}
                  title="Delete"
                >
                  <Icon name="TrashIcon" className="w-4 h-4 text-red-500 dark:text-red-400" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {helpText && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helpText}</p>
      )}
    </div>
  );
}
