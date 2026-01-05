/**
 * Prompt Preview Component
 * Displays the final prompt sent to the LLM for user transparency and understanding
 *
 * Features:
 * - Read-only display of system and user prompts
 * - Collapsible sections
 * - Copy to clipboard functionality
 * - Markdown formatting
 * - Useful for debugging and understanding AI decisions
 */

"use client";

import clsx from "clsx";
import { useState } from "react";

import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Prompt } from "@/lib/promptSystem";

interface PromptPreviewProps {
  prompt: Prompt | null;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  className?: string;
}

export function PromptPreview({
  prompt,
  isOpen: controlledIsOpen,
  onToggle,
  className = "",
}: PromptPreviewProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [copiedSection, setCopiedSection] = useState<"system" | "user" | null>(
    null
  );

  const isOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleToggle = () => {
    const newState = !isOpen;
    setInternalIsOpen(newState);
    onToggle?.(newState);
  };

  const copyToClipboard = (text: string, section: "system" | "user") => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    });
  };

  if (!prompt) {
    return null;
  }

  return (
    <div className={clsx("space-y-2", className)}>
      {/* Header / Toggle Button */}
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
      >
        <div className="flex items-center gap-2">
          <Icon
            name="eye"
            className="h-4 w-4 text-gray-600 dark:text-gray-400"
          />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            View Prompt
          </span>
        </div>
        <Icon
          name={isOpen ? "chevron-up" : "chevron-down"}
          className="h-4 w-4 text-gray-600 dark:text-gray-400"
        />
      </button>

      {/* Content */}
      {isOpen && (
        <Card className="space-y-4 border border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/50">
          {/* Purpose */}
          <div className="flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-700">
            <div>
              <h4 className="text-xs font-semibold tracking-wider text-gray-600 uppercase dark:text-gray-400">
                Purpose
              </h4>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {prompt.purpose.replace(/_/g, " ").toUpperCase()}
              </p>
            </div>
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold tracking-wider text-gray-600 uppercase dark:text-gray-400">
                System Prompt
              </h4>
              <button
                onClick={() => copyToClipboard(prompt.systemPrompt, "system")}
                className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-900 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                title="Copy system prompt"
              >
                {copiedSection === "system" ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
              <pre className="font-mono text-xs break-words whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {prompt.systemPrompt}
              </pre>
            </div>
          </div>

          {/* User Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold tracking-wider text-gray-600 uppercase dark:text-gray-400">
                User Prompt
              </h4>
              <button
                onClick={() => copyToClipboard(prompt.userPrompt, "user")}
                className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-900 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                title="Copy user prompt"
              >
                {copiedSection === "user" ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
              <pre className="font-mono text-xs break-words whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {prompt.userPrompt}
              </pre>
            </div>
          </div>

          {/* Context Summary */}
          {(prompt.context.resume ||
            prompt.context.jobData ||
            prompt.context.jobDescription) && (
            <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
              <h4 className="mb-2 text-xs font-semibold tracking-wider text-gray-600 uppercase dark:text-gray-400">
                Context Provided
              </h4>
              <div className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
                {prompt.context.resume && (
                  <div className="flex items-center gap-2">
                    <Icon name="check" className="h-3 w-3 text-green-600" />
                    <span>Resume data</span>
                  </div>
                )}
                {prompt.context.jobData && (
                  <div className="flex items-center gap-2">
                    <Icon name="check" className="h-3 w-3 text-green-600" />
                    <span>Job data</span>
                  </div>
                )}
                {prompt.context.jobDescription && (
                  <div className="flex items-center gap-2">
                    <Icon name="check" className="h-3 w-3 text-green-600" />
                    <span>Job description</span>
                  </div>
                )}
                {prompt.context.field && (
                  <div className="flex items-center gap-2">
                    <Icon name="check" className="h-3 w-3 text-green-600" />
                    <span>Field context: {prompt.context.field}</span>
                  </div>
                )}
                {prompt.context.additionalInstructions && (
                  <div className="flex items-center gap-2">
                    <Icon name="check" className="h-3 w-3 text-green-600" />
                    <span>Additional instructions</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              This prompt will be sent to the LLM to generate your content.
              Review it to ensure it captures your intent correctly.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
