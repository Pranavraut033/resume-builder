/**
 * Shared Editor Layout
 * Provides consistent layout structure for both Resume and Cover Letter editors
 * Left panel: Controls and inputs
 * Right panel: Live preview
 */

"use client";

import { ReactNode, useState } from "react";

import BackButton from "@/components/BackButton";
import { Icon } from "@/components/ui/Icon";

export interface EditorLayoutProps {
  title: string;
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  previewPanel?: ReactNode; // Optional preview content for toggle
  onPreviewToggle?: (isPreview: boolean) => void;
  initialPreviewMode?: boolean;
}

export function EditorLayout({
  title,
  leftPanel,
  rightPanel,
  previewPanel,
  onPreviewToggle,
  initialPreviewMode = false,
}: EditorLayoutProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(initialPreviewMode);

  const handleToggle = () => {
    const newMode = !isPreviewMode;
    setIsPreviewMode(newMode);
    onPreviewToggle?.(newMode);
  };

  return (
    <div className="flex max-h-screen flex-col overflow-hidden rounded-2xl bg-gray-50 lg:flex-row dark:bg-gray-900">
      {/* Main Content Area */}
      <div className="flex-1">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto flex max-w-4xl items-center space-x-6">
            <BackButton />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>

            {/* Edit/Preview Toggle */}
            <div
              onClick={handleToggle}
              className="relative ml-auto h-10 w-20 cursor-pointer space-x-4 overflow-hidden rounded-full border border-gray-300 bg-gray-200 dark:border-gray-600 dark:bg-gray-700"
            >
              <div className="flex size-full items-center justify-around space-x-2 px-2">
                <Icon
                  name="pencil"
                  className={
                    "z-10 size-5 transition " +
                    (isPreviewMode ? "text-gray-400" : "text-primary-500")
                  }
                />
                <Icon
                  name="EyeIcon"
                  className={
                    "z-10 size-5 transition " +
                    (isPreviewMode ? "text-primary-500" : "text-gray-400")
                  }
                />
              </div>
              <div
                className={
                  "absolute inset-y-0 w-10 bg-white " +
                  (isPreviewMode ? "translate-x-10" : "translate-x-0") +
                  " transition-transform duration-300 ease-in-out"
                }
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-auto">
          {isPreviewMode ? previewPanel : leftPanel}
        </div>
      </div>

      {/* Right Panel (always visible on large screens) */}
      <div className="hidden lg:block">{rightPanel}</div>
    </div>
  );
}
