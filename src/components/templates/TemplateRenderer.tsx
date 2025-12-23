// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import React from "react";
import { ResumeJSON, TemplateType, ResumeColors } from "@/types/resume";
import { ModernMinimalTemplate } from "./ModernMinimalTemplate";

interface TemplateRendererProps {
  template: TemplateType;
  resume: ResumeJSON;
  colors: ResumeColors;
  fontSize: "small" | "medium" | "large";
  fontFamily: string;
}

export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  template,
  resume,
  colors,
  fontSize,
  fontFamily,
}) => {
  // For now, we'll use ModernMinimalTemplate for all templates
  // In future PRs, we'll add the other 5 templates
  const TemplateComponent = ModernMinimalTemplate;

  return (
    <TemplateComponent
      resume={resume}
      colors={colors}
      fontSize={fontSize}
      fontFamily={fontFamily}
    />
  );
};
