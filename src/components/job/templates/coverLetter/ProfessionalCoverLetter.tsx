/**
 * Professional Cover Letter Template
 * Matches professional resume styles
 */

import React from "react";

import { RichTextEditorContent } from "@/components/form/RichTextEditor";
import useResolveCustomization from "@/hooks/useResolveCustomization";

import type { CoverLetterRendererProps } from "./CoverLetterRenderer";

export const ProfessionalCoverLetter: React.FC<CoverLetterRendererProps> = ({
  coverLetter,
  resume,
  customization,
}) => {
  const {
    primaryColor,
    secondaryColor: _,
    accentColor: __,
    textColor,
    backgroundColor,
    textSize,
    fontFamily,
    today,
    marginClass,
    lineHeight,
  } = useResolveCustomization(customization);

  return (
    <div
      style={{
        fontFamily: fontFamily,
        color: textColor,
        backgroundColor: backgroundColor,
      }}
    >
      {/* Header Bar */}
      <div className="p-8 pb-6" style={{ backgroundColor: primaryColor }}>
        <h1 className="mb-2 text-3xl font-bold text-white">
          {resume?.header?.name || "[Your Name]"}
        </h1>
        <div className={`${textSize} space-y-1 text-white/90`}>
          {resume?.header?.email && <div>✉ {resume.header.email}</div>}
          {resume?.header?.phone && <div>📞 {resume.header.phone}</div>}
          {resume?.header?.location && <div>📍 {resume.header.location}</div>}
        </div>
      </div>

      {/* Content */}
      <div className={`${marginClass}`}>
        {/* Date */}
        <div className={`${textSize} mb-8`}>{today}</div>

        {/* Cover Letter Body */}
        <RichTextEditorContent
          content={coverLetter}
          className={`${textSize} ${lineHeight}`}
        />
      </div>
    </div>
  );
};
