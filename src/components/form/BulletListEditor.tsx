/**
 * BulletListEditor Component
 * Reusable component for managing lists of items (achievements, technologies, skills, etc.)
 * Supports add, edit, delete operations with inline editing.
 * AI generation happens at the panel level, not field level.
 */

"use client";

import { useState } from "react";

import { Button } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";

interface BulletListEditorProps {
  label: string;
  items: string[];
  onItemsChange: (items: string[]) => void;
  placeholder?: string;
  helpText?: string;
}

export function BulletListEditor({
  label,
  items,
  onItemsChange,
  placeholder = "Add an item and press Enter",
  helpText,
}: BulletListEditorProps) {
  const [newItem, setNewItem] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");

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
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      {/* Input for new item */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
        />
        <Button
          variant="primary"
          size="sm"
          onClick={handleAddItem}
          disabled={!newItem.trim()}
        >
          <Icon name="plus" className="h-4 w-4" />
        </Button>
      </div>

      {/* List of items */}
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={index}
              className="group flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800"
            >
              <Icon
                name="checkCircle"
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400"
              />
              {editingIndex === index ? (
                <input
                  type="text"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={handleKeyDownEdit}
                  autoFocus
                  className="flex-1 rounded border border-blue-500 bg-white px-2 py-1 text-gray-900 dark:bg-gray-700 dark:text-white"
                />
              ) : (
                <span className="flex-1 break-words text-gray-700 dark:text-gray-300">
                  {item}
                </span>
              )}
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {editingIndex === index ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveEdit}
                    title="Save"
                  >
                    <Icon
                      name="check"
                      className="h-4 w-4 text-green-600 dark:text-green-400"
                    />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStartEdit(index)}
                    title="Edit"
                  >
                    <Icon
                      name="pencil"
                      className="h-4 w-4 text-gray-500 dark:text-gray-400"
                    />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteItem(index)}
                  title="Delete"
                >
                  <Icon
                    name="trash"
                    className="h-4 w-4 text-red-500 dark:text-red-400"
                  />
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
