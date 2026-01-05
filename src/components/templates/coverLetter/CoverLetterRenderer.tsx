/**
 * Cover Letter Template Renderer
 * Dynamically renders cover letter based on selected template
 */

import React from "react";

import { ResumeJSON, ThemeColors, TemplateType } from "@/types/resume";

import { BJetProfessionalCoverLetter } from "./BJetProfessionalCoverLetter";
import { BusinessProfessionalCoverLetter } from "./BusinessProfessionalCoverLetter";
import { CreativeModernCoverLetter } from "./CreativeModernCoverLetter";
import { ElegantTimelineCoverLetter } from "./ElegantTimelineCoverLetter";
import { ModernMinimalCoverLetter } from "./ModernMinimalCoverLetter";
import { TechSidebarCoverLetter } from "./TechSidebarCoverLetter";

export type CoverLetterTemplate = TemplateType;

interface CoverLetterRendererProps {
  template: CoverLetterTemplate;
  coverLetter: string;
  resume: ResumeJSON | null;
  colors: ThemeColors;
  fontSize: "small" | "medium" | "large";
  fontFamily: string;
}

export const CoverLetterRenderer: React.FC<CoverLetterRendererProps> = ({
  template,
  coverLetter,
  resume,
  colors,
  fontSize,
  fontFamily,
}) => {
  const templateComponents: Record<
    TemplateType,
    React.ComponentType<{
      coverLetter: string;
      resume: ResumeJSON | null;
      colors: ThemeColors;
      fontSize: "small" | "medium" | "large";
      fontFamily: string;
    }>
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

  return (
    <TemplateComponent
      coverLetter={coverLetter}
      resume={resume}
      colors={colors}
      fontSize={fontSize}
      fontFamily={fontFamily}
    />
  );
};
