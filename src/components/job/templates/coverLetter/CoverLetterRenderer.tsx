/**
 * Cover Letter Template Renderer
 * Dynamically renders cover letter based on selected template
 */

import React from "react";

import { simpleI32HashString, toStableJsonString } from "@/lib";
import {
  CoverLetterTemplateType,
  SanitizedCustomization,
} from "@/types/customization";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

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
  jobDetails?: JobDetailsJSON | null;
  editable?: boolean;
  onChange?: (html: string) => void;
}

export const CoverLetterRenderer: React.FC<CoverLetterRendererProps> = ({
  coverLetter,
  resume,
  customization,
  jobDetails,
  editable,
  onChange,
}) => {
  // No dedicated cover-letter component exists for "euro-sidebar" — it was
  // (and still is, for old rows with no coverLetterTemplate set) aliased to
  // its nearest structural sibling, TechSidebarCoverLetter. Resolved as an
  // explicit pre-check since "euro-sidebar" isn't a CoverLetterTemplateType.
  const legacyEuroSidebarFallback: CoverLetterTemplateType | null =
    customization.template === "euro-sidebar" &&
    !customization.coverLetterTemplate
      ? "tech-sidebar"
      : null;

  const template = (customization.coverLetterTemplate ??
    legacyEuroSidebarFallback ??
    customization.template) as CoverLetterTemplateType;

  const templateComponents: Record<
    CoverLetterTemplateType,
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
      jobDetails={jobDetails}
      editable={editable}
      onChange={onChange}
    />
  );
};
