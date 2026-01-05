/**
 * Business Professional Cover Letter Template
 * Matches the style of BusinessProfessionalTemplate resume
 */

import React from "react";

import { ResumeJSON, ThemeColors } from "@/types/resume";

interface BusinessProfessionalCoverLetterProps {
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

export const BusinessProfessionalCoverLetter: React.FC<
  BusinessProfessionalCoverLetterProps
> = ({ coverLetter, resume, colors, fontSize, fontFamily }) => {
  const textSize = fontSizeMap[fontSize];
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="cover-letter-content mx-auto min-h-[11in] w-[8.5in] bg-white p-16 shadow-lg"
      style={{
        fontFamily: fontFamily,
        color: colors.text,
        backgroundColor: colors.background,
      }}
    >
      {/* Header - Centered */}
      <header
        className="mb-8 border-b pb-6 text-center"
        style={{ borderColor: colors.secondary }}
      >
        <h1
          className="mb-2 font-serif text-3xl font-bold"
          style={{ color: colors.primary }}
        >
          {resume?.header?.name || "[Your Name]"}
        </h1>
        <div
          className={`${textSize} space-y-1`}
          style={{ color: colors.secondary }}
        >
          <div className="flex justify-center gap-3">
            {resume?.header?.email && <span>{resume.header.email}</span>}
            {resume?.header?.phone && <span>•</span>}
            {resume?.header?.phone && <span>{resume.header.phone}</span>}
          </div>
          <div className="flex justify-center gap-3">
            {resume?.header?.location && <span>{resume.header.location}</span>}
            {resume?.header?.linkedin && <span>•</span>}
            {resume?.header?.linkedin && <span>LinkedIn</span>}
          </div>
        </div>
      </header>

      {/* Date */}
      <div className={`${textSize} mb-6`}>{today}</div>

      {/* Cover Letter Content */}
      <div
        className={`${textSize} text-justify leading-relaxed whitespace-pre-wrap`}
      >
        {coverLetter || "Your cover letter content will appear here..."}
      </div>

      {/* Signature */}
      <div className={`${textSize} mt-8`}>
        <p>Sincerely,</p>
        <p
          className="mt-4 font-serif font-semibold"
          style={{ color: colors.primary }}
        >
          {resume?.header?.name || "[Your Name]"}
        </p>
      </div>
    </div>
  );
};
