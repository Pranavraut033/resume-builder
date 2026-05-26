/**
 * Modern Minimal Cover Letter Template
 * Matches the style of ModernMinimalTemplate resume
 */

import React from "react";

import { RichTextEditorContent } from "@/components/form/RichTextEditor";
import useResolveCustomization from "@/hooks/useResolveCustomization";

import type { CoverLetterRendererProps } from "./CoverLetterRenderer";

export const ModernMinimalCoverLetter: React.FC<CoverLetterRendererProps> = ({
  coverLetter,
  resume,
  customization,
}) => {
  const {
    primaryColor,
    secondaryColor: _,
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
      className={`cover-letter-content p-12 ${marginClass}`}
      style={{
        fontFamily: fontFamily,
        color: textColor,
        backgroundColor: backgroundColor,
      }}
    >
      {/* Header */}
      <header
        className="mb-8 border-b-2 pb-4"
        style={{ borderColor: primaryColor }}
      >
        <h1 className="mb-2 text-3xl font-bold" style={{ color: primaryColor }}>
          {resume?.header?.name || "[Your Name]"}
        </h1>
        <div className={`${textSize} space-y-1 text-gray-600`}>
          <div className="flex flex-wrap gap-4">
            {resume?.header?.email && <span>✉ {resume.header.email}</span>}
            {resume?.header?.phone && <span>📞 {resume.header.phone}</span>}
            {resume?.header?.location && (
              <span>📍 {resume.header.location}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
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
        </div>
      </header>

      {/* Date */}
      <div className={`${textSize} mb-6`}>{today}</div>

      <RichTextEditorContent
        content={coverLetter}
        className={`${textSize} ${lineHeight}`}
      />
    </div>
  );
};
