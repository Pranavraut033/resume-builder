// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

"use client";

import { Settings } from "lucide-react";
import React, { useState } from "react";

import {
  ThemeCustomization,
  TemplateType,
  PageFormat,
  FontSize,
  AVAILABLE_FONTS,
} from "@/types/resume";

import { ColorCustomizer } from "./ColorCustomizer";
import { TemplateSelector } from "./TemplateSelector";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Modal } from "./ui/Modal";

interface ResumeCustomizationPanelProps {
  jobId: number;
  customization: ThemeCustomization;
  onCustomizationChange: (customization: Partial<ThemeCustomization>) => void;
}

export const ResumeCustomizationPanel: React.FC<
  ResumeCustomizationPanelProps
> = ({ _jobId, customization, onCustomizationChange }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"template" | "colors" | "format">(
    "template"
  );

  const handleTemplateChange = (template: TemplateType) => {
    onCustomizationChange({ template });
  };

  const handlePageFormatChange = (pageFormat: PageFormat) => {
    onCustomizationChange({ pageFormat });
  };

  const handleFontSizeChange = (fontSize: FontSize) => {
    onCustomizationChange({ fontSize });
  };

  const handleFontFamilyChange = (fontFamily: string) => {
    onCustomizationChange({ fontFamily });
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed right-8 bottom-8 z-10 flex gap-2">
        <Button
          onClick={() => setShowSettings(true)}
          className="h-12 w-12 rounded-full shadow-lg"
          title="Customize Resume"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {/* Customization Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Customize Resume"
      >
        <div className="space-y-block">
          {/* Tabs */}
          <div className="border-blocky-300 flex gap-2 border-b pb-2">
            <button
              onClick={() => setActiveTab("template")}
              className={`rounded-block px-4 py-2 font-medium transition-all ${
                activeTab === "template"
                  ? "bg-blocky-500 text-white"
                  : "bg-blocky-100 text-blocky-700 hover:bg-blocky-200"
              }`}
            >
              Template
            </button>
            <button
              onClick={() => setActiveTab("colors")}
              className={`rounded-block px-4 py-2 font-medium transition-all ${
                activeTab === "colors"
                  ? "bg-blocky-500 text-white"
                  : "bg-blocky-100 text-blocky-700 hover:bg-blocky-200"
              }`}
            >
              Colors
            </button>
            <button
              onClick={() => setActiveTab("format")}
              className={`rounded-block px-4 py-2 font-medium transition-all ${
                activeTab === "format"
                  ? "bg-blocky-500 text-white"
                  : "bg-blocky-100 text-blocky-700 hover:bg-blocky-200"
              }`}
            >
              Format
            </button>
          </div>

          {/* Tab Content */}
          <div className="max-h-[60vh] overflow-y-auto">
            {activeTab === "template" && (
              <TemplateSelector
                selectedTemplate={customization.template}
                onSelectTemplate={handleTemplateChange}
              />
            )}

            {activeTab === "colors" && (
              <ColorCustomizer
                colors={customization.colors}
                onColorsChange={(colors) => onCustomizationChange({ colors })}
              />
            )}

            {activeTab === "format" && (
              <Card>
                <div className="p-block space-y-block">
                  <div>
                    <h3 className="font-blocky text-blocky-900 mb-2 text-lg font-semibold">
                      Page Format
                    </h3>
                    <p className="text-blocky-700 mb-block text-sm">
                      Configure page size, font, and layout
                    </p>
                  </div>

                  {/* Page Size */}
                  <div>
                    <label className="text-blocky-900 mb-2 block text-sm font-medium">
                      Page Size
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePageFormatChange("letter")}
                        className={`rounded-block flex-1 border-2 px-4 py-3 transition-all ${
                          customization.pageFormat === "letter"
                            ? "border-blocky-500 bg-blocky-50"
                            : "border-blocky-300 hover:border-blocky-400"
                        }`}
                      >
                        <div className="font-medium">US Letter</div>
                        <div className="text-blocky-600 text-xs">
                          8.5" × 11"
                        </div>
                      </button>
                      <button
                        onClick={() => handlePageFormatChange("a4")}
                        className={`rounded-block flex-1 border-2 px-4 py-3 transition-all ${
                          customization.pageFormat === "a4"
                            ? "border-blocky-500 bg-blocky-50"
                            : "border-blocky-300 hover:border-blocky-400"
                        }`}
                      >
                        <div className="font-medium">A4</div>
                        <div className="text-blocky-600 text-xs">
                          210 × 297 mm
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Font Size */}
                  <div>
                    <label className="text-blocky-900 mb-2 block text-sm font-medium">
                      Font Size
                    </label>
                    <div className="flex gap-2">
                      {(["small", "medium", "large"] as FontSize[]).map(
                        (size) => (
                          <button
                            key={size}
                            onClick={() => handleFontSizeChange(size)}
                            className={`rounded-block flex-1 border-2 px-4 py-2 capitalize transition-all ${
                              customization.fontSize === size
                                ? "border-blocky-500 bg-blocky-50"
                                : "border-blocky-300 hover:border-blocky-400"
                            }`}
                          >
                            {size}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Font Family */}
                  <div>
                    <label className="text-blocky-900 mb-2 block text-sm font-medium">
                      Font Family
                    </label>
                    <select
                      value={customization.fontFamily}
                      onChange={(e) => handleFontFamilyChange(e.target.value)}
                      className="rounded-block border-blocky-300 focus:border-blocky-500 focus:ring-blocky-500 focus:ring-opacity-20 w-full border bg-white px-4 py-2 focus:ring-2"
                    >
                      {AVAILABLE_FONTS.map((font) => (
                        <option
                          key={font}
                          value={font}
                          style={{ fontFamily: font }}
                        >
                          {font}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Actions */}
          <div className="pt-block border-blocky-300 flex justify-end gap-2 border-t">
            <Button onClick={() => setShowSettings(false)} variant="secondary">
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
