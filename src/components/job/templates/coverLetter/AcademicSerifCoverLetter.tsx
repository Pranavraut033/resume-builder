/**
 * Academic Serif Cover Letter Template
 * Matches the style of AcademicSerifTemplate resume — traditional serif
 * layout with a centered header and a double-rule divider.
 */

import React from "react";

import useResolveCustomization from "@/hooks/useResolveCustomization";
import BackgroundSvg from "@/lib/backgrounds/BackgroundSvg";
import { getPageDimensions } from "@/lib/pageDimensions";

import { CoverLetterBody } from "./CoverLetterBody";
import { CoverLetterRendererProps } from "./CoverLetterRenderer";

export const AcademicSerifCoverLetter: React.FC<CoverLetterRendererProps> = ({
  coverLetter,
  resume,
  customization,
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
        {/* Header - Centered, traditional double rule */}
        <header className="mb-8 pb-6 text-center">
          <h1
            className="mb-2 font-serif text-3xl font-bold tracking-wide"
            style={{ color: primaryColor, fontVariant: "small-caps" }}
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
          <div className="mt-4 space-y-0.5">
            <div className="h-px" style={{ backgroundColor: primaryColor }} />
            <div className="h-px" style={{ backgroundColor: secondaryColor }} />
          </div>
        </header>

        {/* Date */}
        <div className={`${textSize} mb-6`}>{today}</div>

        {/* Cover Letter Content */}
        <CoverLetterBody
          content={coverLetter}
          editable={editable}
          onChange={onChange}
          className={`${textSize} ${lineHeight} text-justify`}
        />
      </div>
    </div>
  );
};
