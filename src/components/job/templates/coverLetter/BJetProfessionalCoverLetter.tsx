/**
 * BJet Professional Cover Letter Template
 * Matches the style of BJetProfessionalTemplate resume
 */

import React from "react";

import useResolveCustomization from "@/hooks/useResolveCustomization";
import BackgroundSvg from "@/lib/backgrounds/BackgroundSvg";
import { getPageDimensions } from "@/lib/pageDimensions";

import { CoverLetterBody } from "./CoverLetterBody";
import { CoverLetterRendererProps } from "./CoverLetterRenderer";

export const BJetProfessionalCoverLetter: React.FC<
  CoverLetterRendererProps
> = ({ coverLetter, resume, customization, editable, onChange }) => {
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
    background,
    colorsTuple,
  } = useResolveCustomization(customization);
  const { widthPx, heightPx } = getPageDimensions(
    customization.pageFormat,
    customization.marginSize
  );

  return (
    <div
      className="cover-letter-content relative mx-auto bg-white shadow-lg"
      style={{
        fontFamily: fontFamily,
        color: textColor, // text color
        backgroundColor: backgroundColor, // background color
      }}
    >
      <BackgroundSvg
        background={background}
        colors={colorsTuple}
        width={widthPx}
        height={heightPx}
      />
      <div className="relative z-1">
        {/* Professional Header with gradient effect */}
        <header
          className="p-8 pb-6"
          style={{
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          }}
        >
          <h1 className="mb-2 text-3xl font-bold text-white">
            {resume?.header?.name || "[Your Name]"}
          </h1>
          <div className="flex flex-wrap gap-4 text-xs text-white opacity-95">
            {resume?.header?.email && <span>✉ {resume.header.email}</span>}
            {resume?.header?.phone && <span>📞 {resume.header.phone}</span>}
            {resume?.header?.location && (
              <span>📍 {resume.header.location}</span>
            )}
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
        <div className={`${marginClass}`}>
          {/* Date */}
          <div className={`${textSize} mb-6`} style={{ color: secondaryColor }}>
            {today}
          </div>

          {/* Cover Letter Content */}
          <CoverLetterBody
            content={coverLetter}
            editable={editable}
            onChange={onChange}
            className={`${textSize} ${lineHeight}`}
          />

          <div
            className="mt-1 h-1 w-20"
            style={{
              background: `linear-gradient(90deg, ${primaryColor} 0%, ${accentColor} 100%)`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
