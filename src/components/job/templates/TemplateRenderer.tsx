// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import React from "react";

import { TemplateEngine } from "@/components/job-v2/engine/TemplateEngine";
import { TEMPLATE_CONFIG } from "@/components/job-v2/engine/templates";
import { simpleI32HashString, toStableJsonString } from "@/lib";
import { SanitizedCustomization, TemplateType } from "@/types/customization";
import { ResumeJSON } from "@/types/resume";

import { ModernMinimalTemplate } from "./ModernMinimalTemplate";

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

  // All 9 templates are now config objects dispatched to the shared engine
  // (see migration plan). ModernMinimalTemplate stays as the legacy fallback
  // for a corrupt/unrecognized `template` value only.
  const engineConfig = TEMPLATE_CONFIG[template];
  if (engineConfig) {
    return (
      <TemplateEngine
        key={rerenderHash}
        resume={resume}
        customization={customization}
        config={engineConfig}
      />
    );
  }

  return (
    <ModernMinimalTemplate
      key={rerenderHash}
      resume={resume}
      customization={customization}
    />
  );
};
