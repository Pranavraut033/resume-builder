/**
 * Professional Cover Letter Template
 * Matches professional resume styles
 */

import React from "react";

import { ResumeJSON, ThemeColors } from "@/types/resume";

interface ProfessionalCoverLetterProps {
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

export const ProfessionalCoverLetter: React.FC<
  ProfessionalCoverLetterProps
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
      {/* Header Bar */}
      <div className="p-8 pb-6" style={{ backgroundColor: colors.primary }}>
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
      <div className="p-12 pt-8">
        {/* Date */}
        <div className={`${textSize} mb-8`}>{today}</div>

        {/* Cover Letter Body */}
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
    </div>
  );
};
