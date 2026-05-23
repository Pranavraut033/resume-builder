// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import React from "react";

import { simpleI32HashString, toStableJsonString } from "@/lib";
import { SanitizedCustomization, TemplateType } from "@/types/customization";
import { ResumeJSON } from "@/types/resume";

import { BJetProfessionalTemplate } from "./BJetProfessionalTemplate";
import { BusinessProfessionalTemplate } from "./BusinessProfessionalTemplate";
import { CreativeModernTemplate } from "./CreativeModernTemplate";
import { ElegantTimelineTemplate } from "./ElegantTimelineTemplate";
import { ModernMinimalTemplate } from "./ModernMinimalTemplate";
import { TechSidebarTemplate } from "./TechSidebarTemplate";

export interface TemplateRendererProps {
  resume: ResumeJSON;
  customization: SanitizedCustomization;
}

const templateMap: Record<
  TemplateType,
  React.ComponentType<TemplateRendererProps>
> = {
  "modern-minimal": ModernMinimalTemplate,
  "tech-sidebar": TechSidebarTemplate,
  "business-professional": BusinessProfessionalTemplate,
  "elegant-timeline": ElegantTimelineTemplate,
  "creative-modern": CreativeModernTemplate,
  "bjet-professional": BJetProfessionalTemplate,
};

export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  resume,
  customization,
}) => {
  const template = customization.template as TemplateType;
  const TemplateComponent = templateMap[template] || ModernMinimalTemplate;

  const rerenderHash = simpleI32HashString(toStableJsonString(customization));

  return (
    <TemplateComponent
      key={rerenderHash}
      resume={resume}
      customization={customization}
    />
  );
};
