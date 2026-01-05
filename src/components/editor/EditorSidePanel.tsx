/**
 * Shared Editor Side Panel
 * Provides customization options for both Resume and Cover Letter editors
 * Includes: Template selection, Theme/Color customization, Font selection, Export options
 */

"use client";

import { useState, useEffect, useCallback } from "react";

import { ExportDropdown } from "@/components/ExportDropdown";
import { FontSelector } from "@/components/FontSelector";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { loadGoogleFont } from "@/lib/fontLoader";
import {
  ThemeCustomization,
  ThemeColors,
  DEFAULT_COLORS,
  TemplateType,
} from "@/types/resume";

type IconName = React.ComponentProps<typeof Icon>["name"];

export const COLOR_PRESETS: Array<{ name: string; colors: ThemeColors }> = [
  {
    name: "Default Blue",
    colors: DEFAULT_COLORS,
  },
  {
    name: "Professional Gray",
    colors: {
      primary: "#6b7280",
      secondary: "#9ca3af",
      accent: "#374151",
      text: "#1f2937",
      background: "#ffffff",
    },
  },
  {
    name: "Modern Green",
    colors: {
      primary: "#10b981",
      secondary: "#6ee7b7",
      accent: "#059669",
      text: "#1f2937",
      background: "#ffffff",
    },
  },
  {
    name: "Creative Purple",
    colors: {
      primary: "#8b5cf6",
      secondary: "#a78bfa",
      accent: "#7c3aed",
      text: "#1f2937",
      background: "#ffffff",
    },
  },
  {
    name: "Executive Navy",
    colors: {
      primary: "#1e40af",
      secondary: "#3b82f6",
      accent: "#1e3a8a",
      text: "#1f2937",
      background: "#ffffff",
    },
  },
  {
    name: "Elegant Rose",
    colors: {
      primary: "#e11d48",
      secondary: "#fb7185",
      accent: "#be123c",
      text: "#1f2937",
      background: "#ffffff",
    },
  },
  {
    name: "Tech Teal",
    colors: {
      primary: "#14b8a6",
      secondary: "#5eead4",
      accent: "#0d9488",
      text: "#1f2937",
      background: "#ffffff",
    },
  },
  {
    name: "Warm Orange",
    colors: {
      primary: "#f97316",
      secondary: "#fb923c",
      accent: "#ea580c",
      text: "#1f2937",
      background: "#ffffff",
    },
  },
];

interface EditorSidePanelProps {
  customization: ThemeCustomization;
  onCustomizationChange: (updates: Partial<ThemeCustomization>) => void;
  exportOptions: Array<{
    label: string;
    icon: IconName;
    description: string;
    onExport: () => void;
  }>;
  onPreview?: () => void;
  additionalContent?: React.ReactNode;
}

export function EditorSidePanel({
  customization,
  onCustomizationChange,
  exportOptions,
  onPreview,
  additionalContent,
}: EditorSidePanelProps) {
  const [isCustom, setIsCustom] = useState(false);

  // Derive selectedTheme from current colors instead of managing state
  const getSelectedTheme = useCallback((): string => {
    const colors = customization.colors || DEFAULT_COLORS;
    const matchingPreset = COLOR_PRESETS.find(
      (preset) =>
        preset.colors.primary === colors.primary &&
        preset.colors.secondary === colors.secondary &&
        preset.colors.accent === colors.accent &&
        preset.colors.text === colors.text &&
        preset.colors.background === colors.background
    );
    return isCustom ? "custom" : matchingPreset?.name || "custom";
  }, [customization.colors, isCustom]);

  const selectedTheme = getSelectedTheme();

  // Load font when fontFamily changes
  useEffect(() => {
    if (customization.fontFamily) {
      loadGoogleFont(customization.fontFamily);
    }
  }, [customization.fontFamily]);

  const handleThemeChange = (themeName: string) => {
    if (themeName !== "custom") {
      const preset = COLOR_PRESETS.find((p) => p.name === themeName);
      if (preset) {
        onCustomizationChange({
          colors: preset.colors,
        });
      }
    }
  };

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    setIsCustom(true);
    onCustomizationChange({
      colors: {
        ...customization.colors,
        [key]: value,
      },
    });
  };

  return (
    <div className="w-80 overflow-y-auto border-l border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
      <div className="sticky top-0 z-10 space-y-4 border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
        {/* Header with action buttons */}
        {onPreview && (
          <Button
            variant="secondary"
            onClick={onPreview}
            icon={<Icon name="grid" />}
            className="w-full text-sm"
          >
            Preview
          </Button>
        )}
        <ExportDropdown options={exportOptions} defaultLabel="Export" />
      </div>

      {/* Additional Content (e.g., AI Assist, ATS Panel) */}
      <div className="space-y-4 p-4">{additionalContent}</div>

      {/* Appearance Section */}
      <div className="space-y-4 p-4">
        {/* Template Selection */}
        <Card>
          <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
            Template
          </label>
          <select
            value={customization.template || "modern-minimal"}
            onChange={(e) =>
              onCustomizationChange({
                template: e.target.value as TemplateType,
              })
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="modern-minimal">Modern Minimal</option>
            <option value="tech-sidebar">Tech Sidebar</option>
            <option value="business-professional">Business Professional</option>
            <option value="elegant-timeline">Elegant Timeline</option>
            <option value="creative-modern">Creative Modern</option>
            <option value="bjet-professional">BJet Professional</option>
          </select>
        </Card>

        {/* Font Selection */}
        <Card>
          <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
            Font
          </label>
          <FontSelector
            value={customization.fontFamily || "Inter"}
            onChange={(font: string) =>
              onCustomizationChange({
                fontFamily: font,
              })
            }
          />
        </Card>

        {/* Font Size Selection */}
        <Card>
          <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
            Font Size
          </label>
          <select
            value={customization.fontSize || "medium"}
            onChange={(e) =>
              onCustomizationChange({
                fontSize: e.target.value as "small" | "medium" | "large",
              })
            }
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </Card>

        {/* Color Theme Selection */}
        <Card>
          <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
            Color Theme
          </label>
          <select
            value={selectedTheme}
            onChange={(e) => handleThemeChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            {COLOR_PRESETS.map((preset) => (
              <option key={preset.name} value={preset.name}>
                {preset.name}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>

          {/* Color Preview for Preset Themes */}
          {selectedTheme !== "custom" && (
            <div className="mt-3">
              <div className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                Theme Colors
              </div>
              <div className="flex gap-2">
                <div
                  className="h-10 w-10 rounded border border-gray-300 dark:border-gray-600"
                  style={{
                    backgroundColor:
                      customization.colors?.primary || DEFAULT_COLORS.primary,
                  }}
                  title="Primary"
                />
                <div
                  className="h-10 w-10 rounded border border-gray-300 dark:border-gray-600"
                  style={{
                    backgroundColor:
                      customization.colors?.secondary ||
                      DEFAULT_COLORS.secondary,
                  }}
                  title="Secondary"
                />
                <div
                  className="h-10 w-10 rounded border border-gray-300 dark:border-gray-600"
                  style={{
                    backgroundColor:
                      customization.colors?.accent || DEFAULT_COLORS.accent,
                  }}
                  title="Accent"
                />
                <div
                  className="h-10 w-10 rounded border border-gray-300 dark:border-gray-600"
                  style={{
                    backgroundColor:
                      customization.colors?.text || DEFAULT_COLORS.text,
                  }}
                  title="Text"
                />
              </div>
            </div>
          )}

          {/* Custom Color Pickers - Only show when Custom is selected */}
          {selectedTheme === "custom" && (
            <div className="mt-3 space-y-2">
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">
                  Primary
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="color"
                    value={
                      customization.colors?.primary || DEFAULT_COLORS.primary
                    }
                    onChange={(e) =>
                      handleColorChange("primary", e.target.value)
                    }
                    className="h-8 w-12 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                  />
                  <input
                    type="text"
                    value={
                      customization.colors?.primary || DEFAULT_COLORS.primary
                    }
                    onChange={(e) =>
                      handleColorChange("primary", e.target.value)
                    }
                    placeholder="#3b82f6"
                    className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">
                  Secondary
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="color"
                    value={
                      customization.colors?.secondary ||
                      DEFAULT_COLORS.secondary
                    }
                    onChange={(e) =>
                      handleColorChange("secondary", e.target.value)
                    }
                    className="h-8 w-12 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                  />
                  <input
                    type="text"
                    value={
                      customization.colors?.secondary ||
                      DEFAULT_COLORS.secondary
                    }
                    onChange={(e) =>
                      handleColorChange("secondary", e.target.value)
                    }
                    placeholder="#64748b"
                    className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">
                  Accent
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="color"
                    value={
                      customization.colors?.accent || DEFAULT_COLORS.accent
                    }
                    onChange={(e) =>
                      handleColorChange("accent", e.target.value)
                    }
                    className="h-8 w-12 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                  />
                  <input
                    type="text"
                    value={
                      customization.colors?.accent || DEFAULT_COLORS.accent
                    }
                    onChange={(e) =>
                      handleColorChange("accent", e.target.value)
                    }
                    placeholder="#8b5cf6"
                    className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400">
                  Text
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="color"
                    value={customization.colors?.text || DEFAULT_COLORS.text}
                    onChange={(e) => handleColorChange("text", e.target.value)}
                    className="h-8 w-12 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                  />
                  <input
                    type="text"
                    value={customization.colors?.text || DEFAULT_COLORS.text}
                    onChange={(e) => handleColorChange("text", e.target.value)}
                    placeholder="#1f2937"
                    className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
