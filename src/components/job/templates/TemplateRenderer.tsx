// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import React from "react";

import { TemplateEngine } from "@/components/job-v2/engine/TemplateEngine";
import { TEMPLATE_CONFIG } from "@/components/job-v2/engine/templates";
import { simpleI32HashString, toStableJsonString } from "@/lib";
import { SanitizedCustomization, TemplateType } from "@/types/customization";
import { ResumeJSON } from "@/types/resume";

export interface TemplateRendererProps {
  resume: ResumeJSON;
  customization: SanitizedCustomization;
}

export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  resume,
  customization,
}) => {
  const template = customization.template as TemplateType;
  const rerenderHash = simpleI32HashString(toStableJsonString(customization));

  // All 13 templates are config objects dispatched to the shared engine.
  // validateCustomization rejects unrecognized template ids at the write
  // boundary, so this falls back to modern-minimal only for legacy/corrupt data.
  const engineConfig =
    TEMPLATE_CONFIG[template] ?? TEMPLATE_CONFIG["modern-minimal"]!;

  return (
    <TemplateEngine
      key={rerenderHash}
      resume={resume}
      customization={customization}
      config={engineConfig}
    />
  );
};
