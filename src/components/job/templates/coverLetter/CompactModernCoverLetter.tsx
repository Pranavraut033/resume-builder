/**
 * Compact Modern Cover Letter Template
 * Matches the style of CompactModernTemplate resume — dense, ATS-friendly.
 */

import React from "react";

import useResolveCustomization from "@/hooks/useResolveCustomization";
import BackgroundSvg from "@/lib/backgrounds/BackgroundSvg";
import { formatCoverLetterDate } from "@/lib/coverLetterDate";
import { getPageDimensions } from "@/lib/pageDimensions";

import { CoverLetterBody } from "./CoverLetterBody";

import type { CoverLetterRendererProps } from "./CoverLetterRenderer";

export const CompactModernCoverLetter: React.FC<CoverLetterRendererProps> = ({
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
    accentColor: _,
    textColor,
    backgroundColor,
    textSize,
    fontFamily,
    dateFormat,
    marginClass,
    lineHeight,
    background,
    colorsTuple,
  } = useResolveCustomization(customization);
  const today = formatCoverLetterDate(jobDetails, dateFormat);
  const { widthPx, heightPx } = getPageDimensions(
    customization.pageFormat,
    customization.marginSize
  );

  const contactParts = [
    resume?.header?.email,
    resume?.header?.phone,
    resume?.header?.location,
  ].filter(Boolean);
  const linkParts = [
    resume?.header?.linkedin,
    resume?.header?.github,
    resume?.header?.website,
  ].filter(Boolean);

  return (
    <div
      className={`cover-letter-content relative p-10 ${marginClass}`}
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
        {/* Header */}
        <header
          className="mb-4 border-b pb-2"
          style={{ borderColor: secondaryColor }}
        >
          <h1
            className="mb-1 text-2xl font-bold"
            style={{ color: primaryColor }}
          >
            {resume?.header?.name || "[Your Name]"}
          </h1>
          <div className={`${textSize} text-gray-600`}>
            {contactParts.join(" | ")}
          </div>
          {linkParts.length > 0 && (
            <div className={`${textSize} text-gray-600`}>
              {linkParts.join(" | ")}
            </div>
          )}
        </header>

        {/* Date */}
        <div className={`${textSize} mb-3`}>{today}</div>

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
