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

import { TemplateThumbnail } from "./TemplateThumbnail";
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
  const selected = AVAILABLE_TEMPLATES.find((t) => t.id === selectedTemplate);

  // Full mode for main template selection
  return (
    <Card>
      <h3
        className="mb-1 text-sm font-semibold"
        style={{ color: "var(--color-agent-on-surface)" }}
      >
        Template
      </h3>
      {/* Compact, dynamic — swaps to the selected template's own info so it
          reads correctly without needing to scroll the grid below. */}
      {selected ? (
        <div
          className="mb-3 flex flex-col gap-0.5 text-xs"
          style={{ color: "var(--color-agent-on-surface-variant)" }}
        >
          <span
            className="truncate"
            title={`${selected.fontFamily} — ${selected.features.join(" | ")}`}
          >
            <span
              className="font-semibold"
              style={{ color: "var(--color-agent-on-surface)" }}
            >
              {selected.fontFamily}
            </span>
            {" · "}
            {selected.features.join(" | ")}
          </span>
          <span className="line-clamp-2" title={selected.bestFor}>
            <span className="font-medium">Best for:</span> {selected.bestFor}
          </span>
        </div>
      ) : (
        <p
          className="mb-3 text-xs"
          style={{ color: "var(--color-agent-on-surface-variant)" }}
        >
          Pick a template style before exporting.
        </p>
      )}

      <div className="max-h-96 overflow-y-auto overscroll-contain pr-1.5">
        <div className="grid grid-cols-2 gap-2">
          {AVAILABLE_TEMPLATES.map((t) => {
            const isSelected = selectedTemplate === t.id;

            return (
              <button
                key={t.id}
                onClick={() => onSelectTemplate(t)}
                className={cn(
                  "relative flex flex-col gap-1.5 rounded-lg border p-1.5 text-left transition-all",
                  isSelected
                    ? "border-agent-primary bg-agent-primary-container text-agent-on-primary-container"
                    : "bg-agent-surface-container border-agent-outline-variant text-agent-on-surface hover:border-agent-outline"
                )}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 z-10">
                    <div className="bg-blocky-500 flex h-5 w-5 items-center justify-center rounded-full">
                      <Icon name="check" className="h-3 w-3" />
                    </div>
                  </div>
                )}
                <TemplateThumbnail templateId={t.id} />
                <span className="line-clamp-1 px-0.5 text-xs font-medium">
                  {t.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default TemplateSelector;
