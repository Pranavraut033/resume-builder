// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import React from "react";
import { ResumeJSON, TemplateType, ResumeColors } from "@/types/resume";
import { ModernMinimalTemplate } from "./ModernMinimalTemplate";
import { TechSidebarTemplate } from "./TechSidebarTemplate";
import { BusinessProfessionalTemplate } from "./BusinessProfessionalTemplate";
import { ElegantTimelineTemplate } from "./ElegantTimelineTemplate";
import { CreativeModernTemplate } from "./CreativeModernTemplate";
import { BJetProfessionalTemplate } from "./BJetProfessionalTemplate";

interface TemplateRendererProps {
  template: TemplateType;
  resume: ResumeJSON;
  colors: ResumeColors;
  fontSize: "small" | "medium" | "large";
  fontFamily: string;
}

const templateMap = {
  "modern-minimal": ModernMinimalTemplate,
  "tech-sidebar": TechSidebarTemplate,
  "business-professional": BusinessProfessionalTemplate,
  "elegant-timeline": ElegantTimelineTemplate,
  "creative-modern": CreativeModernTemplate,
  "bjet-professional": BJetProfessionalTemplate,
};

export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  template,
  resume,
  colors,
  fontSize,
  fontFamily,
}) => {
  const TemplateComponent = templateMap[template] || ModernMinimalTemplate;

  return (
    <TemplateComponent
      resume={resume}
      colors={colors}
      fontSize={fontSize}
      fontFamily={fontFamily}
    />
  );
};
