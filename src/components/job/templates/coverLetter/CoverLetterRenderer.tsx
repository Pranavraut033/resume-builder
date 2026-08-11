/**
 * Cover Letter Template Renderer
 * Dynamically renders cover letter based on selected template
 */

import React from "react";

import { simpleI32HashString, toStableJsonString } from "@/lib";
import { SanitizedCustomization, TemplateType } from "@/types/customization";
import { ResumeJSON } from "@/types/resume";

import { AcademicSerifCoverLetter } from "./AcademicSerifCoverLetter";
import { BJetProfessionalCoverLetter } from "./BJetProfessionalCoverLetter";
import { BusinessProfessionalCoverLetter } from "./BusinessProfessionalCoverLetter";
import { CompactModernCoverLetter } from "./CompactModernCoverLetter";
import { CreativeModernCoverLetter } from "./CreativeModernCoverLetter";
import { ElegantTimelineCoverLetter } from "./ElegantTimelineCoverLetter";
import { ModernMinimalCoverLetter } from "./ModernMinimalCoverLetter";
import { TechSidebarCoverLetter } from "./TechSidebarCoverLetter";
import { TwoToneCoverLetter } from "./TwoToneCoverLetter";

export interface CoverLetterRendererProps {
  coverLetter: string;
  resume: ResumeJSON | null;
  customization: SanitizedCustomization;
  editable?: boolean;
  onChange?: (html: string) => void;
}

export const CoverLetterRenderer: React.FC<CoverLetterRendererProps> = ({
  coverLetter,
  resume,
  customization,
  editable,
  onChange,
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
    "compact-modern": CompactModernCoverLetter,
    "two-tone": TwoToneCoverLetter,
    "academic-serif": AcademicSerifCoverLetter,
    // No dedicated cover-letter component yet for "euro-sidebar" — reuse its
    // nearest structural sibling (also a full-height solid sidebar) rather
    // than leaving it unmapped. See report: needs a purpose-built component.
    "euro-sidebar": TechSidebarCoverLetter,
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
      editable={editable}
      onChange={onChange}
    />
  );
};
