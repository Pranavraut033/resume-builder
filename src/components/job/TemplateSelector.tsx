// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

"use client";

import React from "react";

import cn from "@/lib/cn";
import {
  TemplateType,
  AVAILABLE_TEMPLATES,
  Template,
} from "@/types/customization";

import { Icon } from "../ui";
import { Card } from "../ui/Card";

interface TemplateSelectorProps {
  selectedTemplate: TemplateType;
  onSelectTemplate: (template: Template) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplate,
  onSelectTemplate,
}) => {
  // Full mode for main template selection
  return (
    <Card>
      <h3
        className="mb-3 text-sm font-semibold"
        style={{ color: "var(--color-agent-on-surface)" }}
      >
        Template
      </h3>
      <p
        className="mb-3 text-xs"
        style={{ color: "var(--color-agent-on-surface-variant)" }}
      >
        Pick a template style before exporting.
      </p>

      <div className="gap-block grid max-h-96 grid-cols-1 overflow-y-auto">
        <div className="grid gap-2">
          {AVAILABLE_TEMPLATES.map((t) => {
            const isSelected = selectedTemplate === t.id;

            return (
              <div key={t.id}>
                <button
                  onClick={() => onSelectTemplate(t)}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left text-xs transition-all",
                    {
                      "border-agent-primary bg-agent-primary-container text-agent-on-primary-container":
                        isSelected,
                      "bg-agent-surface-container border-agent-outline-variant text-agent-on-surface":
                        !isSelected,
                    }
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-blocky-500 flex h-6 w-6 items-center justify-center rounded-full">
                        <Icon name="check" />
                      </div>
                    </div>
                  )}
                  <span className="font-medium">{t.name}</span>
                </button>
                {isSelected && (
                  <div className="px-3">
                    <div
                      className="bg-agent-on-primary-container flex flex-col gap-1 border border-t-transparent p-3"
                      style={{ borderRadius: "0 0 12px 12px" }}
                    >
                      <div className="flex h-min items-center gap-1">
                        <span className="bg-agent-primary-container text-agent-primary-fixed text-blocky-700 border-blocky-300 rounded border px-2 py-1 text-xs">
                          {t.fontFamily}
                        </span>

                        <span
                          className="text-agent-on-primary space-y-0.5 text-xs"
                          dangerouslySetInnerHTML={{
                            __html: t.features
                              .map((f) => `<b>${f}</b>`)
                              .join(" | "),
                          }}
                        />
                      </div>

                      <p className="text-agent-on-primary border-blocky-200 border-t pt-2 text-xs">
                        <span className="font-medium">Best for:</span>{" "}
                        {t.bestFor}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default TemplateSelector;
