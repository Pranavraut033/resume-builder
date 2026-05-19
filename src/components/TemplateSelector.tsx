// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

"use client";

import { Check } from "lucide-react";
import React from "react";

import { TemplateType, AVAILABLE_TEMPLATES } from "@/types/customization";

import { Card } from "./ui/Card";

interface TemplateSelectorProps {
  selectedTemplate: TemplateType;
  onSelectTemplate: (template: TemplateType) => void;
  compact?: boolean; // For side panel use
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplate,
  onSelectTemplate,
  compact = false,
}) => {
  if (compact) {
    // Compact mode for side panels
    return (
      <div className="space-y-1.5">
        {AVAILABLE_TEMPLATES.map((template) => {
          const isSelected = selectedTemplate === template.id;
          return (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template.id)}
              className={`w-full rounded-md border px-2 py-1.5 text-left text-xs transition-all ${
                isSelected
                  ? "border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100"
                  : "border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600"
              } `}
            >
              <div className="flex items-center justify-between">
                <span className="truncate font-medium">{template.name}</span>
                {isSelected && <Check className="ml-1 h-3 w-3 flex-shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // Full mode for main template selection
  return (
    <Card>
      <div className="p-block">
        <h3 className="font-blocky text-blocky-900 mb-block text-lg font-semibold">
          Choose Resume Template
        </h3>
        <p className="text-blocky-700 mb-block text-sm">
          Select a professional template that best fits your style
        </p>

        <div className="gap-block grid grid-cols-1 md:grid-cols-2">
          {AVAILABLE_TEMPLATES.map((template) => {
            const isSelected = selectedTemplate === template.id;

            return (
              <div
                key={template.id}
                className={`rounded-block p-block hover:shadow-block relative cursor-pointer border-2 transition-all ${
                  isSelected
                    ? "border-blocky-500 bg-blocky-50"
                    : "border-blocky-300 hover:border-blocky-400"
                } `}
                onClick={() => onSelectTemplate(template.id)}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-blocky-500 flex h-6 w-6 items-center justify-center rounded-full">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="text-blocky-900 text-base font-semibold">
                    {template.name}
                  </h4>

                  <p className="text-blocky-700 text-sm">
                    {template.description}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    <span className="bg-blocky-100 text-blocky-700 border-blocky-300 rounded border px-2 py-1 text-xs">
                      {template.fontFamily}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-blocky-700 text-xs font-medium">
                      Features:
                    </p>
                    <ul className="text-blocky-600 space-y-0.5 text-xs">
                      {template.features.slice(0, 3).map((feature, index) => (
                        <li key={index}>• {feature}</li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-blocky-600 border-blocky-200 border-t pt-2 text-xs">
                    <span className="font-medium">Best for:</span>{" "}
                    {template.bestFor}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
