/**
 * Modern Minimal Cover Letter Template
 * Matches the style of ModernMinimalTemplate resume
 */

import React from "react";

import { ResumeJSON, ThemeColors } from "@/types/resume";

interface ModernMinimalCoverLetterProps {
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

export const ModernMinimalCoverLetter: React.FC<
  ModernMinimalCoverLetterProps
> = ({ coverLetter, resume, colors, fontSize, fontFamily }) => {
  const textSize = fontSizeMap[fontSize];
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="cover-letter-content mx-auto min-h-[11in] w-[8.5in] bg-white p-12 shadow-lg"
      style={{
        fontFamily: fontFamily,
        color: colors.text,
        backgroundColor: colors.background,
      }}
    >
      {/* Header */}
      <header
        className="mb-8 border-b-2 pb-4"
        style={{ borderColor: colors.primary }}
      >
        <h1
          className="mb-2 text-3xl font-bold"
          style={{ color: colors.primary }}
        >
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
      <div className={`${textSize} mb-6`}>{today}</div>

      {/* Cover Letter Content */}
      <div className={`${textSize} leading-relaxed whitespace-pre-wrap`}>
        {coverLetter || "Your cover letter content will appear here..."}
      </div>

      {/* Signature */}
      <div className={`${textSize} mt-12`}>
        <p>Sincerely,</p>
        <p className="mt-8 font-semibold" style={{ color: colors.primary }}>
          {resume?.header?.name || "[Your Name]"}
        </p>
      </div>
    </div>
  );
};
