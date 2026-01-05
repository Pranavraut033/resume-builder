/**
 * Creative Modern Cover Letter Template
 * Matches the style of CreativeModernTemplate resume
 */

import React from "react";

import { ResumeJSON, ThemeColors } from "@/types/resume";

interface CreativeModernCoverLetterProps {
  coverLetter: string;
  resume: ResumeJSON | null;
  colors: ThemeColors;
  fontSize: "small" | "medium" | "large";
  fontFamily: string;
}

const fontSizeMap = {
  small: "text-xs",
  medium: "text-sm",
  large: "text-base",
};

export const CreativeModernCoverLetter: React.FC<
  CreativeModernCoverLetterProps
> = ({ coverLetter, resume, colors, fontSize, fontFamily }) => {
  const textSize = fontSizeMap[fontSize];
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="cover-letter-content relative mx-auto min-h-[11in] w-[8.5in] overflow-hidden bg-white shadow-lg"
      style={{
        fontFamily: fontFamily,
        color: colors.text,
        backgroundColor: colors.background,
      }}
    >
      {/* Creative accent stripe */}
      <div
        className="absolute top-0 left-0 h-full w-2"
        style={{ backgroundColor: colors.accent }}
      />

      {/* Content with left margin for stripe */}
      <div className="ml-8 p-12">
        {/* Header with creative styling */}
        <header className="mb-8">
          <h1
            className="mb-1 text-4xl font-bold"
            style={{ color: colors.primary }}
          >
            {resume?.header?.name || "[Your Name]"}
          </h1>
          <div
            className="mb-4 h-1 w-24"
            style={{ backgroundColor: colors.accent }}
          />
          <div
            className={`${textSize} space-y-1`}
            style={{ color: colors.secondary }}
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
                  style={{ color: colors.accent }}
                >
                  LinkedIn
                </a>
              )}
              {resume?.header?.github && (
                <a
                  href={resume.header.github}
                  className="hover:underline"
                  style={{ color: colors.accent }}
                >
                  GitHub
                </a>
              )}
              {resume?.header?.website && (
                <a
                  href={resume.header.website}
                  className="hover:underline"
                  style={{ color: colors.accent }}
                >
                  Website
                </a>
              )}
            </div>
          </div>
        </header>

        {/* Date */}
        <div className={`${textSize} mb-6`} style={{ color: colors.secondary }}>
          {today}
        </div>

        {/* Cover Letter Content */}
        <div className={`${textSize} leading-relaxed whitespace-pre-wrap`}>
          {coverLetter || "Your cover letter content will appear here..."}
        </div>

        {/* Signature with creative styling */}
        <div className={`${textSize} mt-8`}>
          <p>Sincerely,</p>
          <p className="mt-4 font-bold" style={{ color: colors.primary }}>
            {resume?.header?.name || "[Your Name]"}
          </p>
          <div
            className="mt-2 h-0.5 w-32"
            style={{ backgroundColor: colors.accent }}
          />
        </div>
      </div>
    </div>
  );
};
