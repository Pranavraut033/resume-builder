/**
 * Elegant Timeline Cover Letter Template
 * Matches the style of ElegantTimelineTemplate resume
 */

import React from "react";

import { ResumeJSON, ThemeColors } from "@/types/resume";

interface ElegantTimelineCoverLetterProps {
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

export const ElegantTimelineCoverLetter: React.FC<
  ElegantTimelineCoverLetterProps
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
      {/* Elegant Header - Centered to match resume */}
      <header className="mb-8 text-center">
        <h1
          className="mb-2 text-4xl font-light"
          style={{ color: colors.primary }}
        >
          {resume?.header?.name || "[Your Name]"}
        </h1>
        <div
          className={`${textSize} mb-2 flex flex-wrap justify-center gap-3`}
          style={{ color: colors.secondary }}
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
              Portfolio
            </a>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="space-y-6">
        {/* Date */}
        <div className={`${textSize}`} style={{ color: colors.secondary }}>
          {today}
        </div>

        {/* Cover Letter Content */}
        <div
          className={`${textSize} text-justify leading-relaxed whitespace-pre-wrap`}
        >
          {coverLetter || "Your cover letter content will appear here..."}
        </div>

        {/* Signature */}
        <div className={`${textSize} mt-8`}>
          <p>Sincerely,</p>
          <p className="mt-4 font-semibold" style={{ color: colors.primary }}>
            {resume?.header?.name || "[Your Name]"}
          </p>
        </div>
      </div>
    </div>
  );
};
