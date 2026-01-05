// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

"use client";

import React, { useMemo } from "react";

import { ThemeColors, DEFAULT_COLORS } from "@/types/resume";

import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

interface ColorCustomizerProps {
  colors: ThemeColors;
  onColorsChange: (colors: ThemeColors) => void;
}

const COLOR_PRESETS: Array<{ name: string; colors: ThemeColors }> = [
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

export const ColorCustomizer: React.FC<ColorCustomizerProps> = ({
  colors,
  onColorsChange,
}) => {
  // Derive selected theme from current colors instead of using state
  const selectedTheme = useMemo(() => {
    const matchingPreset = COLOR_PRESETS.find(
      (preset) =>
        preset.colors.primary === colors.primary &&
        preset.colors.secondary === colors.secondary &&
        preset.colors.accent === colors.accent &&
        preset.colors.text === colors.text &&
        preset.colors.background === colors.background
    );
    return matchingPreset?.name || "custom";
  }, [colors]);

  const handleThemeChange = (themeName: string) => {
    setSelectedTheme(themeName);
    if (themeName !== "custom") {
      const preset = COLOR_PRESETS.find((p) => p.name === themeName);
      if (preset) {
        onColorsChange(preset.colors);
      }
    }
  };

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    setSelectedTheme("custom");
    onColorsChange({
      ...colors,
      [key]: value,
    });
  };

  const applyPreset = (preset: ThemeColors) => {
    onColorsChange(preset);
  };

  return (
    <Card>
      <div className="p-block space-y-block">
        <div>
          <h3 className="font-blocky text-blocky-900 mb-2 text-lg font-semibold">
            Color Theme
          </h3>
          <p className="text-blocky-700 text-sm">
            Select a preset theme or create your own custom colors
          </p>
        </div>

        {/* Theme Selector */}
        <div>
          <label className="text-blocky-900 mb-2 block text-sm font-medium">
            Select Theme
          </label>
          <select
            value={selectedTheme}
            onChange={(e) => handleThemeChange(e.target.value)}
            className="rounded-block border-blocky-300 focus:border-blocky-500 focus:ring-blocky-500 focus:ring-opacity-20 w-full border bg-white px-4 py-2 focus:ring-2"
          >
            {COLOR_PRESETS.map((preset) => (
              <option key={preset.name} value={preset.name}>
                {preset.name}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </div>

        {/* Color Preview */}
        {selectedTheme !== "custom" && (
          <div>
            <label className="text-blocky-900 mb-2 block text-sm font-medium">
              Theme Colors
            </label>
            <div className="rounded-block border-blocky-300 bg-blocky-50 flex items-center gap-2 border p-4">
              <div
                className="rounded-block h-12 w-12 shadow-sm"
                style={{ backgroundColor: colors.primary }}
                title="Primary"
              />
              <div
                className="rounded-block h-12 w-12 shadow-sm"
                style={{ backgroundColor: colors.secondary }}
                title="Secondary"
              />
              <div
                className="rounded-block h-12 w-12 shadow-sm"
                style={{ backgroundColor: colors.accent }}
                title="Accent"
              />
              <div
                className="rounded-block border-blocky-300 h-12 w-12 border shadow-sm"
                style={{ backgroundColor: colors.text }}
                title="Text"
              />
            </div>
          </div>
        )}

        {/* Individual Color Pickers - Only show when Custom is selected */}
        {selectedTheme === "custom" && (
          <div className="space-y-block">
            <label className="text-blocky-900 block text-sm font-medium">
              Custom Colors
            </label>

            <div className="gap-block grid grid-cols-1 md:grid-cols-2">
              <div>
                <label className="text-blocky-700 mb-1 block text-sm">
                  Primary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={colors.primary}
                    onChange={(e) =>
                      handleColorChange("primary", e.target.value)
                    }
                    className="rounded-block border-blocky-300 h-10 w-12 cursor-pointer border"
                  />
                  <input
                    type="text"
                    value={colors.primary}
                    onChange={(e) =>
                      handleColorChange("primary", e.target.value)
                    }
                    placeholder="#3b82f6"
                    className="rounded-block border-blocky-300 focus:border-blocky-500 focus:ring-blocky-500 focus:ring-opacity-20 flex-1 border px-4 py-2 focus:ring-2"
                  />
                </div>
              </div>

              <div>
                <label className="text-blocky-700 mb-1 block text-sm">
                  Secondary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={colors.secondary}
                    onChange={(e) =>
                      handleColorChange("secondary", e.target.value)
                    }
                    className="rounded-block border-blocky-300 h-10 w-12 cursor-pointer border"
                  />
                  <input
                    type="text"
                    value={colors.secondary}
                    onChange={(e) =>
                      handleColorChange("secondary", e.target.value)
                    }
                    placeholder="#64748b"
                    className="rounded-block border-blocky-300 focus:border-blocky-500 focus:ring-blocky-500 focus:ring-opacity-20 flex-1 border px-4 py-2 focus:ring-2"
                  />
                </div>
              </div>

              <div>
                <label className="text-blocky-700 mb-1 block text-sm">
                  Accent Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={colors.accent}
                    onChange={(e) =>
                      handleColorChange("accent", e.target.value)
                    }
                    className="rounded-block border-blocky-300 h-10 w-12 cursor-pointer border"
                  />
                  <input
                    type="text"
                    value={colors.accent}
                    onChange={(e) =>
                      handleColorChange("accent", e.target.value)
                    }
                    placeholder="#8b5cf6"
                    className="rounded-block border-blocky-300 focus:border-blocky-500 focus:ring-blocky-500 focus:ring-opacity-20 flex-1 border px-4 py-2 focus:ring-2"
                  />
                </div>
              </div>

              <div>
                <label className="text-blocky-700 mb-1 block text-sm">
                  Text Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={colors.text}
                    onChange={(e) => handleColorChange("text", e.target.value)}
                    className="rounded-block border-blocky-300 h-10 w-12 cursor-pointer border"
                  />
                  <input
                    type="text"
                    value={colors.text}
                    onChange={(e) => handleColorChange("text", e.target.value)}
                    placeholder="#1f2937"
                    className="rounded-block border-blocky-300 focus:border-blocky-500 focus:ring-blocky-500 focus:ring-opacity-20 flex-1 border px-4 py-2 focus:ring-2"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-block border-blocky-200 border-t">
          <Button
            onClick={() => {
              setSelectedTheme("Default Blue");
              applyPreset(DEFAULT_COLORS);
            }}
            variant="secondary"
            size="sm"
          >
            Reset to Default
          </Button>
        </div>
      </div>
    </Card>
  );
};
