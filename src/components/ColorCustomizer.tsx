// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

"use client";

import React from "react";
import { ResumeColors, DEFAULT_COLORS } from "@/types/resume";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";

interface ColorCustomizerProps {
  colors: ResumeColors;
  onColorsChange: (colors: ResumeColors) => void;
}

const COLOR_PRESETS: Array<{ name: string; colors: ResumeColors }> = [
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
];

export const ColorCustomizer: React.FC<ColorCustomizerProps> = ({
  colors,
  onColorsChange,
}) => {
  const handleColorChange = (key: keyof ResumeColors, value: string) => {
    onColorsChange({
      ...colors,
      [key]: value,
    });
  };

  const applyPreset = (preset: ResumeColors) => {
    onColorsChange(preset);
  };

  return (
    <Card>
      <div className="p-block space-y-block">
        <div>
          <h3 className="text-lg font-blocky font-semibold text-blocky-900 mb-2">
            Customize Colors
          </h3>
          <p className="text-sm text-blocky-700">
            Personalize your resume with custom colors
          </p>
        </div>

        {/* Color Presets */}
        <div>
          <label className="block text-sm font-medium text-blocky-900 mb-2">
            Quick Presets
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset.colors)}
                className="flex items-center gap-2 p-2 rounded-block border border-blocky-300 hover:border-blocky-500 hover:shadow-block transition-all"
              >
                <div className="flex gap-1">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: preset.colors.primary }}
                  />
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: preset.colors.secondary }}
                  />
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: preset.colors.accent }}
                  />
                </div>
                <span className="text-xs text-blocky-700">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Individual Color Pickers */}
        <div className="space-y-block">
          <label className="block text-sm font-medium text-blocky-900">
            Custom Colors
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-block">
            <div>
              <label className="block text-sm text-blocky-700 mb-1">
                Primary Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={colors.primary}
                  onChange={(e) => handleColorChange("primary", e.target.value)}
                  className="w-12 h-10 rounded-block border border-blocky-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={colors.primary}
                  onChange={(e) => handleColorChange("primary", e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1 px-4 py-2 rounded-block border border-blocky-300 focus:border-blocky-500 focus:ring-2 focus:ring-blocky-500 focus:ring-opacity-20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-blocky-700 mb-1">
                Secondary Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={colors.secondary}
                  onChange={(e) =>
                    handleColorChange("secondary", e.target.value)
                  }
                  className="w-12 h-10 rounded-block border border-blocky-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={colors.secondary}
                  onChange={(e) =>
                    handleColorChange("secondary", e.target.value)
                  }
                  placeholder="#64748b"
                  className="flex-1 px-4 py-2 rounded-block border border-blocky-300 focus:border-blocky-500 focus:ring-2 focus:ring-blocky-500 focus:ring-opacity-20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-blocky-700 mb-1">
                Accent Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={colors.accent}
                  onChange={(e) => handleColorChange("accent", e.target.value)}
                  className="w-12 h-10 rounded-block border border-blocky-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={colors.accent}
                  onChange={(e) => handleColorChange("accent", e.target.value)}
                  placeholder="#8b5cf6"
                  className="flex-1 px-4 py-2 rounded-block border border-blocky-300 focus:border-blocky-500 focus:ring-2 focus:ring-blocky-500 focus:ring-opacity-20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-blocky-700 mb-1">
                Text Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={colors.text}
                  onChange={(e) => handleColorChange("text", e.target.value)}
                  className="w-12 h-10 rounded-block border border-blocky-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={colors.text}
                  onChange={(e) => handleColorChange("text", e.target.value)}
                  placeholder="#1f2937"
                  className="flex-1 px-4 py-2 rounded-block border border-blocky-300 focus:border-blocky-500 focus:ring-2 focus:ring-blocky-500 focus:ring-opacity-20"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-block border-t border-blocky-200">
          <Button
            onClick={() => applyPreset(DEFAULT_COLORS)}
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
