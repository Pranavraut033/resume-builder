/**
 * Two-Tone Cover Letter Template
 * Matches the style of TwoToneTemplate resume — bold colour-block header,
 * reversed-out name plate, accent stripe.
 */

import React from "react";

import useResolveCustomization from "@/hooks/useResolveCustomization";
import BackgroundSvg from "@/lib/backgrounds/BackgroundSvg";
import { getPageDimensions } from "@/lib/pageDimensions";

import { CoverLetterBody } from "./CoverLetterBody";

import type { CoverLetterRendererProps } from "./CoverLetterRenderer";

export const TwoToneCoverLetter: React.FC<CoverLetterRendererProps> = ({
  coverLetter,
  resume,
  customization,
  editable,
  onChange,
}) => {
  const {
    primaryColor,
    secondaryColor: _,
    accentColor,
    textColor,
    backgroundColor,
    textSize,
    fontFamily,
    today,
    lineHeight,
    marginClass,
    background,
    colorsTuple,
  } = useResolveCustomization(customization);
  const { widthPx, heightPx } = getPageDimensions(
    customization.pageFormat,
    customization.marginSize
  );

  return (
    <div
      className={`${marginClass} relative overflow-hidden`}
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
        <div className="flex-1 p-8" style={{ backgroundColor: primaryColor }}>
          <h1
            className="mb-2 inline-block px-3 py-1 text-3xl font-bold"
            style={{ backgroundColor: backgroundColor, color: primaryColor }}
          >
            {resume?.header?.name || "[Your Name]"}
          </h1>
          <div
            className={`${textSize} flex flex-wrap gap-4 text-white opacity-95`}
          >
            {resume?.header?.email && <span>✉ {resume.header.email}</span>}
            {resume?.header?.phone && <span>📞 {resume.header.phone}</span>}
            {resume?.header?.location && (
              <span>📍 {resume.header.location}</span>
            )}
          </div>
          <div
            className={`${textSize} mt-1 flex flex-wrap gap-4 text-white opacity-95`}
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
          className="w-3 flex-shrink-0"
          style={{ backgroundColor: accentColor }}
        />
      </div>

      {/* Content */}
      <div className="relative z-1 p-12">
        {/* Date */}
        <div className={`${textSize} mb-6`}>{today}</div>

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
