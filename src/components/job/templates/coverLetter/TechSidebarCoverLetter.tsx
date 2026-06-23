/**
 * Tech Sidebar Cover Letter Template
 * Adapted from TechSidebarTemplate resume
 * Features a colored sidebar with contact info and main content area
 */

import React from "react";

import { RichTextEditorContent } from "@/components/form/RichTextEditor";
import useResolveCustomization from "@/hooks/useResolveCustomization";
import BackgroundSvg from "@/lib/backgrounds/BackgroundSvg";
import { getPageDimensions } from "@/lib/pageDimensions";

import { CoverLetterRendererProps } from "./CoverLetterRenderer";

export const TechSidebarCoverLetter: React.FC<CoverLetterRendererProps> = ({
  coverLetter,
  resume,
  customization,
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
      className="relative flex h-full flex-col overflow-hidden"
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
      <div className="relative z-1 flex flex-1 flex-col">
        {/* Header with colored background */}
        <div className="p-8 pb-4" style={{ backgroundColor: primaryColor }}>
          <h1 className="mb-1 text-3xl font-bold text-white">
            {resume?.header?.name || "[Your Name]"}
          </h1>
          {resume?.header?.headline && (
            <h2 className="text-lg text-white">{resume.header.headline}</h2>
          )}
        </div>

        {/* Two-column layout */}
        <div className="flex flex-1">
          {/* Left Sidebar - 35% */}
          <div
            className="h-full w-[35%] space-y-6 p-6"
            style={{ backgroundColor: secondaryColor + "10" }}
          >
            {/* Contact Information */}
            <section>
              <h2
                className={`mb-3 text-lg font-bold`}
                style={{ color: primaryColor }}
              >
                CONTACT
              </h2>
              <div className="space-y-2">
                {resume?.header?.email && (
                  <div className={`${textSize} flex items-start`}>
                    <span
                      className="mt-0.5 mr-2"
                      style={{ color: accentColor }}
                    >
                      ✉️
                    </span>
                    <span className="break-all">{resume.header.email}</span>
                  </div>
                )}
                {resume?.header?.phone && (
                  <div className={`${textSize} flex items-start`}>
                    <span
                      className="mt-0.5 mr-2"
                      style={{ color: accentColor }}
                    >
                      📞
                    </span>
                    <span>{resume.header.phone}</span>
                  </div>
                )}
                {resume?.header?.location && (
                  <div className={`${textSize} flex items-start`}>
                    <span
                      className="mt-0.5 mr-2"
                      style={{ color: accentColor }}
                    >
                      📍
                    </span>
                    <span>{resume.header.location}</span>
                  </div>
                )}
                {resume?.header?.linkedin && (
                  <div className={`${textSize} flex items-start`}>
                    <span
                      className="mt-0.5 mr-2"
                      style={{ color: accentColor }}
                    >
                      🔗
                    </span>
                    <a
                      href={resume.header.linkedin}
                      className="break-all hover:underline"
                      style={{ color: accentColor }}
                    >
                      {resume.header.linkedin}
                    </a>
                  </div>
                )}
                {resume?.header?.github && (
                  <div className={`${textSize} flex items-start`}>
                    <span
                      className="mt-0.5 mr-2"
                      style={{ color: accentColor }}
                    >
                      💻
                    </span>
                    <a
                      href={resume.header.github}
                      className="break-all hover:underline"
                      style={{ color: accentColor }}
                    >
                      {resume.header.github}
                    </a>
                  </div>
                )}
                {resume?.header?.website && (
                  <div className={`${textSize} flex items-start`}>
                    <span
                      className="mt-0.5 mr-2"
                      style={{ color: accentColor }}
                    >
                      🌐
                    </span>
                    <a
                      href={resume.header.website}
                      className="break-all hover:underline"
                      style={{ color: accentColor }}
                    >
                      {resume.header.website}
                    </a>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Main Content - 65% */}
          <div className={`w-[65%] space-y-6 ${marginClass}`}>
            {/* Date */}
            <div className={`${textSize} text-gray-600`}>{today}</div>
            {/* Cover Letter Content */}
            <RichTextEditorContent
              content={coverLetter}
              className={`${textSize} ${lineHeight}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
