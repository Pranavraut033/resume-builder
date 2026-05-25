/**
 * Cover Letter Template Renderer
 * Dynamically renders cover letter based on selected template
 */

import React from "react";

import { simpleI32HashString, toStableJsonString } from "@/lib";
import { SanitizedCustomization, TemplateType } from "@/types/customization";
import { ResumeJSON } from "@/types/resume";

import { BJetProfessionalCoverLetter } from "./BJetProfessionalCoverLetter";
import { BusinessProfessionalCoverLetter } from "./BusinessProfessionalCoverLetter";
import { CreativeModernCoverLetter } from "./CreativeModernCoverLetter";
import { ElegantTimelineCoverLetter } from "./ElegantTimelineCoverLetter";
import { ModernMinimalCoverLetter } from "./ModernMinimalCoverLetter";
import { TechSidebarCoverLetter } from "./TechSidebarCoverLetter";

export interface CoverLetterRendererProps {
  coverLetter: string;
  resume: ResumeJSON | null;
  customization: SanitizedCustomization;
}

export const CoverLetterRenderer: React.FC<CoverLetterRendererProps> = ({
  coverLetter,
  resume,
  customization,
}) => {
  const template = customization.template as TemplateType;

  const templateComponents: Record<
    TemplateType,
    React.ComponentType<CoverLetterRendererProps>
  > = {
    "modern-minimal": ModernMinimalCoverLetter,
    "tech-sidebar": TechSidebarCoverLetter,
    "business-professional": BusinessProfessionalCoverLetter,
    "elegant-timeline": ElegantTimelineCoverLetter,
    "creative-modern": CreativeModernCoverLetter,
    "bjet-professional": BJetProfessionalCoverLetter,
  };

  // Fallback to a default template if not found
  const TemplateComponent =
    templateComponents[template] || templateComponents["modern-minimal"];

  const rerenderHash = simpleI32HashString(toStableJsonString(customization));

  return (
    <TemplateComponent
      key={rerenderHash}
      coverLetter={coverLetter}
      resume={resume}
      customization={customization}
    />
  );
};
