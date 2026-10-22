/**
 * Two-Tone Cover Letter Template
 * Matches the style of TwoToneTemplate resume — bold colour-block header,
 * reversed-out name plate, accent stripe.
 */

import React from "react";

import useResolveCustomization from "@/hooks/useResolveCustomization";
import BackgroundSvg from "@/lib/backgrounds/BackgroundSvg";
import { formatCoverLetterDate } from "@/lib/coverLetterDate";
import { getPageDimensions } from "@/lib/pageDimensions";

import { CoverLetterBody } from "./CoverLetterBody";

import type { CoverLetterRendererProps } from "./CoverLetterRenderer";

export const TwoToneCoverLetter: React.FC<CoverLetterRendererProps> = ({
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
      className={`cover-letter-content relative overflow-hidden ${spaceClass}`}
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

      {/* Bold two-tone header band */}
      <div className="relative z-1 flex items-stretch">
        <div
          className={`flex-1 ${marginClass}`}
          style={{ backgroundColor: primaryColor }}
        >
          {/* Inverted text on the band, matching the PDF export — a
              reversed-out "plate" (backgroundColor on the text itself)
              doesn't render reliably in the PDF, so both sides use the
              same inverted-color approach here. */}
          <h1
            className={`mb-2 ${nameSize} font-bold`}
            style={{ color: backgroundColor }}
          >
            {resume?.header?.name || "[Your Name]"}
          </h1>
          <div
            className={`${metaSize} flex flex-wrap gap-4 opacity-75`}
            style={{ color: backgroundColor }}
          >
            {resume?.header?.email && <span>✉ {resume.header.email}</span>}
            {resume?.header?.phone && <span>📞 {resume.header.phone}</span>}
            {resume?.header?.location && (
              <span>📍 {resume.header.location}</span>
            )}
          </div>
          <div
            className={`${metaSize} mt-1 flex flex-wrap gap-4 opacity-75`}
            style={{ color: backgroundColor }}
          >
            {resume?.header?.linkedin && (
              <a href={resume.header.linkedin} className="hover:underline">
                🔗 {resume.header.linkedin}
              </a>
            )}
            {resume?.header?.github && (
              <a href={resume.header.github} className="hover:underline">
                💻 {resume.header.github}
              </a>
            )}
            {resume?.header?.website && (
              <a href={resume.header.website} className="hover:underline">
                🌐 {resume.header.website}
              </a>
            )}
          </div>
        </div>
        {/* Second tone: accent stripe */}
        <div
          className="w-[9pt] flex-shrink-0"
          style={{ backgroundColor: accentColor }}
        />
      </div>

      {/* Content */}
      <div className={`relative z-1 ${marginClass}`}>
        {/* Date */}
        <div className={`${textSize} mb-6`} style={{ color: secondaryColor }}>
          {today}
        </div>

        <CoverLetterBody
          content={coverLetter}
          editable={editable}
          onChange={onChange}
          className={`${textSize} ${lineHeight}`}
        />
      </div>
    </div>
  );
};
