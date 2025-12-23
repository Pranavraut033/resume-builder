/**
 * TextAreaField Component
 * Reusable textarea field for multi-line content (summary, descriptions, etc.)
 * Includes optional AI Generate button for content generation.
 */

"use client";

import { Button } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { useState } from "react";

interface TextAreaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  helpText?: string;
  onAIGenerate?: () => Promise<string>;
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  rows = 5,
  helpText,
  onAIGenerate,
}: TextAreaFieldProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAIGenerate = async () => {
    if (!onAIGenerate) return;

    try {
      setIsGenerating(true);
      const generated = await onAIGenerate();
      onChange(generated);
    } catch (error) {
      console.error("AI generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className={`relative rounded-lg ${
        onAIGenerate ? "border-2 border-blue-500 dark:border-blue-400" : ""
      }`}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          required={required}
          className={`w-full px-3 py-2 ${onAIGenerate ? "pr-12" : ""} border-0 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
        />
        {onAIGenerate && (
          <button
            type="button"
            onClick={handleAIGenerate}
            disabled={isGenerating}
            className="absolute top-2 right-2 p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Generate with AI"
          >
            <Icon name="SparklesIcon" className="w-4 h-4" />
          </button>
        )}
      </div>
      {helpText && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helpText}</p>
      )}
    </div>
  );
}
