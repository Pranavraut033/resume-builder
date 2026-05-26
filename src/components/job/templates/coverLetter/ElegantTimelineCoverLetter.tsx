/**
 * Elegant Timeline Cover Letter Template
 * Matches the style of ElegantTimelineTemplate resume
 */

import React from "react";

import { RichTextEditorContent } from "@/components/form/RichTextEditor";
import useResolveCustomization from "@/hooks/useResolveCustomization";

import type { CoverLetterRendererProps } from "./CoverLetterRenderer";

export const ElegantTimelineCoverLetter: React.FC<CoverLetterRendererProps> = ({
  coverLetter,
  resume,
  customization,
}) => {
  const {
    primaryColor,
    secondaryColor,
    accentColor,
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
      className={`${marginClass}`}
      style={{
        fontFamily: fontFamily,
        color: textColor,
        backgroundColor: backgroundColor,
      }}
    >
      {/* Elegant Header - Centered to match resume */}
      <header className="mb-8 text-center">
        <h1
          className="mb-2 text-4xl font-light"
          style={{ color: primaryColor }}
        >
          {resume?.header?.name || "[Your Name]"}
        </h1>
        <div
          className={`${textSize} mb-2 flex flex-wrap justify-center gap-3`}
          style={{ color: secondaryColor }}
        >
          {resume?.header?.email && <span>✉ {resume.header.email}</span>}
          {resume?.header?.phone && <span>📞 {resume.header.phone}</span>}
          {resume?.header?.location && <span>📍 {resume.header.location}</span>}
        </div>
        <div className={`${textSize} flex flex-wrap justify-center gap-3`}>
          {resume?.header?.linkedin && (
            <a
              href={resume.header.linkedin}
              className="hover:underline"
              style={{ color: accentColor }}
            >
              {resume.header.linkedin}
            </a>
          )}
          {resume?.header?.github && (
            <a
              href={resume.header.github}
              className="hover:underline"
              style={{ color: accentColor }}
            >
              {resume.header.github}
            </a>
          )}
          {resume?.header?.website && (
            <a
              href={resume.header.website}
              className="hover:underline"
              style={{ color: accentColor }}
            >
              {resume.header.website}
            </a>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="space-y-6">
        {/* Date */}
        <div className={`${textSize}`} style={{ color: secondaryColor }}>
          {today}
        </div>

        {/* Cover Letter Content */}
        <RichTextEditorContent
          content={coverLetter}
          className={`${textSize} ${lineHeight}`}
        />
      </div>
    </div>
  );
};
