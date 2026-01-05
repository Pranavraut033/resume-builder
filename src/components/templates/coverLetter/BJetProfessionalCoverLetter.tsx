/**
 * BJet Professional Cover Letter Template
 * Matches the style of BJetProfessionalTemplate resume
 */

import React from "react";

import { ResumeJSON, ThemeColors } from "@/types/resume";

interface BJetProfessionalCoverLetterProps {
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

export const BJetProfessionalCoverLetter: React.FC<
  BJetProfessionalCoverLetterProps
> = ({ coverLetter, resume, colors, fontSize, fontFamily }) => {
  const textSize = fontSizeMap[fontSize];
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="cover-letter-content mx-auto min-h-[11in] w-[8.5in] bg-white shadow-lg"
      style={{
        fontFamily: fontFamily,
        color: colors.text,
        backgroundColor: colors.background,
      }}
    >
      {/* Professional Header with gradient effect */}
      <header
        className="p-8 pb-6"
        style={{
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
        }}
      >
        <h1 className="mb-2 text-3xl font-bold text-white">
          {resume?.header?.name || "[Your Name]"}
        </h1>
        <div className="flex flex-wrap gap-4 text-xs text-white opacity-95">
          {resume?.header?.email && <span>✉ {resume.header.email}</span>}
          {resume?.header?.phone && <span>📞 {resume.header.phone}</span>}
          {resume?.header?.location && <span>📍 {resume.header.location}</span>}
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-white opacity-90">
          {resume?.header?.linkedin && (
            <span className="hover:opacity-100">🔗 LinkedIn</span>
          )}
          {resume?.header?.github && (
            <span className="hover:opacity-100">💻 GitHub</span>
          )}
          {resume?.header?.website && (
            <span className="hover:opacity-100">🌐 Website</span>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="p-8">
        {/* Date */}
        <div className={`${textSize} mb-6`} style={{ color: colors.secondary }}>
          {today}
        </div>

        {/* Cover Letter Content */}
        <div className={`${textSize} leading-relaxed whitespace-pre-wrap`}>
          {coverLetter || "Your cover letter content will appear here..."}
        </div>

        {/* Signature */}
        <div className={`${textSize} mt-8`}>
          <p>Sincerely,</p>
          <div className="mt-4">
            <p className="font-bold" style={{ color: colors.primary }}>
              {resume?.header?.name || "[Your Name]"}
            </p>
            <div
              className="mt-1 h-1 w-20"
              style={{
                background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
