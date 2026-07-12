/**
 * Business Professional Cover Letter Template
 * Matches the style of BusinessProfessionalTemplate resume
 */

import React from "react";

import useResolveCustomization from "@/hooks/useResolveCustomization";
import BackgroundSvg from "@/lib/backgrounds/BackgroundSvg";
import { getPageDimensions } from "@/lib/pageDimensions";

import { CoverLetterBody } from "./CoverLetterBody";
import { CoverLetterRendererProps } from "./CoverLetterRenderer";

export const BusinessProfessionalCoverLetter: React.FC<
  CoverLetterRendererProps
> = ({ coverLetter, resume, customization, editable, onChange }) => {
  const {
    primaryColor,
    secondaryColor,
    accentColor: _,
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
        {/* Header - Centered */}
        <header
          className="mb-8 border-b pb-6 text-center"
          style={{ borderColor: secondaryColor }}
        >
          <h1
            className="mb-2 font-serif text-3xl font-bold"
            style={{ color: primaryColor }}
          >
            {resume?.header?.name || "[Your Name]"}
          </h1>
          <div
            className={`${textSize} space-y-1`}
            style={{ color: secondaryColor }}
          >
            <div className="flex justify-center gap-3">
              {resume?.header?.email && <span>{resume.header.email}</span>}
              {resume?.header?.phone && <span>•</span>}
              {resume?.header?.phone && <span>{resume.header.phone}</span>}
            </div>
            <div className="flex justify-center gap-3">
              {resume?.header?.location && (
                <span>{resume.header.location}</span>
              )}
              {resume?.header?.linkedin && <span>•</span>}
              {resume?.header?.linkedin && <span>LinkedIn</span>}
            </div>
          </div>
        </header>

        {/* Date */}
        <div className={`${textSize} mb-6`}>{today}</div>

        {/* Cover Letter Content */}
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
