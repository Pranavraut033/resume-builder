/**
 * Creative Modern Cover Letter Template
 * Matches the style of CreativeModernTemplate resume
 */

import React from "react";

import RichTextEditorContent from "@/components/form/RichTextEditorContent";
import useResolveCustomization from "@/hooks/useResolveCustomization";

import type { CoverLetterRendererProps } from "./CoverLetterRenderer";

export const CreativeModernCoverLetter: React.FC<CoverLetterRendererProps> = ({
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
    lineHeight,
    marginClass,
  } = useResolveCustomization(customization);

  return (
    <div
      className={`${marginClass} overflow-hidden`}
      style={{
        fontFamily: fontFamily,
        color: textColor,
        backgroundColor: backgroundColor,
      }}
    >
      {/* Creative accent stripe */}
      <div
        className="absolute top-0 left-0 h-full w-2"
        style={{ backgroundColor: accentColor }}
      />

      {/* Content with left margin for stripe */}
      <div className="ml-8 p-12">
        {/* Header with creative styling */}
        <header className="mb-8">
          <h1
            className="mb-1 text-4xl font-bold"
            style={{ color: primaryColor }}
          >
            {resume?.header?.name || "[Your Name]"}
          </h1>
          <div
            className="mb-4 h-1 w-24"
            style={{ backgroundColor: accentColor }}
          />
          <div
            className={`${textSize} space-y-1`}
            style={{ color: secondaryColor }}
          >
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
                  LinkedIn
                </a>
              )}
              {resume?.header?.github && (
                <a
                  href={resume.header.github}
                  className="hover:underline"
                  style={{ color: accentColor }}
                >
                  GitHub
                </a>
              )}
              {resume?.header?.website && (
                <a
                  href={resume.header.website}
                  className="hover:underline"
                  style={{ color: accentColor }}
                >
                  Website
                </a>
              )}
            </div>
          </div>
        </header>

        {/* Date */}
        <div className={`${textSize} mb-6`} style={{ color: secondaryColor }}>
          {today}
        </div>

        {/* Cover Letter Content */}
        <RichTextEditorContent
          content={coverLetter}
          className={`${textSize} ${lineHeight}`}
        />

        <div
          className="mt-2 h-0.5 w-32"
          style={{ backgroundColor: accentColor }}
        />
      </div>
    </div>
  );
};
