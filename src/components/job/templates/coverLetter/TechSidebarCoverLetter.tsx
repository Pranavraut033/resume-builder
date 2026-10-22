/**
 * Tech Sidebar Cover Letter Template
 * Adapted from TechSidebarTemplate resume
 * Features a colored sidebar with contact info and main content area
 */

import React from "react";

import useResolveCustomization from "@/hooks/useResolveCustomization";
import BackgroundSvg from "@/lib/backgrounds/BackgroundSvg";
import { formatCoverLetterDate } from "@/lib/coverLetterDate";
import { getPageDimensions } from "@/lib/pageDimensions";

import { CoverLetterBody } from "./CoverLetterBody";
import { CoverLetterRendererProps } from "./CoverLetterRenderer";

export const TechSidebarCoverLetter: React.FC<CoverLetterRendererProps> = ({
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
    marginClass,
    spaceClass,
    lineHeight,
    background,
    colorsTuple,
  } = useResolveCustomization(customization);
  const today = formatCoverLetterDate(jobDetails, dateFormat);
  const { widthPx, heightPx } = getPageDimensions(
    customization.pageFormat,
    customization.marginSize
  );

  const h = resume?.header;
  const contactItems = [
    { label: "Email", value: h?.email },
    { label: "Phone", value: h?.phone },
    { label: "Location", value: h?.location },
    { label: "LinkedIn", value: h?.linkedin, link: true },
    { label: "GitHub", value: h?.github, link: true },
    { label: "Website", value: h?.website, link: true },
  ].filter((item) => item.value);

  return (
    <div
      className={`cover-letter-content relative flex h-full flex-col overflow-hidden ${spaceClass}`}
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
        <div className={marginClass} style={{ backgroundColor: primaryColor }}>
          <h1 className={`mb-1 ${nameSize} font-bold text-white`}>
            {h?.name || "[Your Name]"}
          </h1>
          {h?.headline && (
            <h2 className={`${textSize} text-white`}>{h.headline}</h2>
          )}
        </div>

        {/* Two-column layout */}
        <div className="flex flex-1">
          {/* Left Sidebar - 35% */}
          <div
            className="h-full w-[35%] space-y-6 p-6"
            style={{ backgroundColor: secondaryColor + "1a" }}
          >
            {/* Contact Information */}
            <section>
              <h2
                className={`mb-3 ${textSize} font-bold uppercase`}
                style={{ color: primaryColor }}
              >
                Contact
              </h2>
              <div className="space-y-2">
                {contactItems.map((item) => (
                  <div key={item.label}>
                    <div
                      className={`${metaSize} font-bold`}
                      style={{ color: accentColor }}
                    >
                      {item.label}
                    </div>
                    {item.link ? (
                      <a
                        href={item.value ?? undefined}
                        className={`${metaSize} break-all hover:underline`}
                      >
                        {item.value}
                      </a>
                    ) : (
                      <div className={`${metaSize} break-all`}>
                        {item.value}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Date */}
            <section>
              <div
                className={`${metaSize} font-bold`}
                style={{ color: accentColor }}
              >
                Date
              </div>
              <div className={metaSize}>{today}</div>
            </section>
          </div>

          {/* Right Main Content - 65% */}
          <div className={`w-[65%] ${marginClass}`}>
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
    </div>
  );
};
