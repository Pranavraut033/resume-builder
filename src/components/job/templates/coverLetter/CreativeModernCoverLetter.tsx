/**
 * Creative Modern Cover Letter Template
 * Matches the style of CreativeModernTemplate resume
 */

import React from "react";

import useResolveCustomization from "@/hooks/useResolveCustomization";
import BackgroundSvg from "@/lib/backgrounds/BackgroundSvg";
import { formatCoverLetterDate } from "@/lib/coverLetterDate";
import { getPageDimensions } from "@/lib/pageDimensions";

import { CoverLetterBody } from "./CoverLetterBody";

import type { CoverLetterRendererProps } from "./CoverLetterRenderer";

export const CreativeModernCoverLetter: React.FC<CoverLetterRendererProps> = ({
  coverLetter,
  resume,
  customization,
  jobDetails,
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
    metaSize,
    nameSize,
    fontFamily,
    dateFormat,
    lineHeight,
    marginClass,
    spaceClass,
    background,
    colorsTuple,
  } = useResolveCustomization(customization);
  const today = formatCoverLetterDate(jobDetails, dateFormat);
  const { widthPx, heightPx } = getPageDimensions(
    customization.pageFormat,
    customization.marginSize
  );

  return (
    <div
      className={`cover-letter-content ${marginClass} relative overflow-hidden ${spaceClass}`}
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

      {/* Creative accent stripe */}
      <div
        className="absolute top-0 left-0 z-1 h-full w-[6pt]"
        style={{ backgroundColor: accentColor }}
      />

      {/* Content (the page margin from the root clears the stripe) */}
      <div className="relative z-1">
        {/* Header with creative styling */}
        <header className="mb-8">
          <h1
            className={`mb-1 ${nameSize} font-bold`}
            style={{ color: primaryColor }}
          >
            {resume?.header?.name || "[Your Name]"}
          </h1>
          <div
            className="mb-4 h-1 w-[54pt]"
            style={{ backgroundColor: accentColor }}
          />
          <div
            className={`${metaSize} space-y-1`}
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
          className="mt-2 h-0.5 w-[96pt]"
          style={{ backgroundColor: accentColor }}
        />
      </div>
    </div>
  );
};
