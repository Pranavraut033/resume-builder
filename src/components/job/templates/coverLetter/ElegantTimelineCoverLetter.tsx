/**
 * Elegant Timeline Cover Letter Template
 * Matches the style of ElegantTimelineTemplate resume
 */

import React from "react";

import useResolveCustomization from "@/hooks/useResolveCustomization";
import BackgroundSvg from "@/lib/backgrounds/BackgroundSvg";
import { getPageDimensions } from "@/lib/pageDimensions";

import { CoverLetterBody } from "./CoverLetterBody";

import type { CoverLetterRendererProps } from "./CoverLetterRenderer";

export const ElegantTimelineCoverLetter: React.FC<CoverLetterRendererProps> = ({
  coverLetter,
  resume,
  customization,
  editable,
  onChange,
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
    background,
    colorsTuple,
  } = useResolveCustomization(customization);
  const { widthPx, heightPx } = getPageDimensions(
    customization.pageFormat,
    customization.marginSize
  );

  return (
    <div
      className={`relative ${marginClass}`}
      style={{
        fontFamily: fontFamily,
        color: textColor,
        backgroundColor: backgroundColor,
      }}
    >
      <BackgroundSvg
        background={background}
        colors={colorsTuple}
        width={widthPx}
        height={heightPx}
      />
      <div className="relative z-1">
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
            {resume?.header?.location && (
              <span>📍 {resume.header.location}</span>
            )}
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
          <CoverLetterBody
            content={coverLetter}
            editable={editable}
            onChange={onChange}
            className={`${textSize} ${lineHeight}`}
          />
        </div>
      </div>
    </div>
  );
};
