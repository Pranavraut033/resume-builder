/**
 * Tech Sidebar Cover Letter Template
 * Adapted from TechSidebarTemplate resume
 * Features a colored sidebar with contact info and main content area
 */

import React from "react";
import { htmlToPlainText, isHtml } from "@/lib/htmlUtils";

import { ResumeJSON, ThemeColors } from "@/types/resume";

interface TechSidebarCoverLetterProps {
  coverLetter: string;
  resume: ResumeJSON | null;
  colors: ThemeColors;
  fontSize: "small" | "medium" | "large";
  fontFamily: string;
}

const fontSizeMap = {
  small: "text-xs",
  medium: "text-sm",
  large: "text-base",
};

const headingSizeMap = {
  small: "text-sm",
  medium: "text-base",
  large: "text-lg",
};

export const TechSidebarCoverLetter: React.FC<TechSidebarCoverLetterProps> = ({
  coverLetter,
  resume,
  colors,
  fontSize,
  fontFamily,
}) => {
  const textSize = fontSizeMap[fontSize];
  const headingSize = headingSizeMap[fontSize];
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Parse cover letter sections
  const textContent = isHtml(coverLetter)
    ? htmlToPlainText(coverLetter)
    : coverLetter;
  const lines = textContent.split("\n");
  const recipientLines: string[] = [];
  const bodyLines: string[] = [];
  const closingLines: string[] = [];

  let section: "recipient" | "body" | "closing" = "recipient";
  let emptyLineCount = 0;

  for (const line of lines) {
    if (line.trim() === "") {
      emptyLineCount++;
      if (section === "recipient" && emptyLineCount >= 2) {
        section = "body";
        emptyLineCount = 0;
      } else if (
        section === "body" &&
        bodyLines.length > 5 &&
        emptyLineCount >= 2
      ) {
        section = "closing";
        emptyLineCount = 0;
      }
      continue;
    }
    emptyLineCount = 0;

    if (section === "recipient") {
      recipientLines.push(line);
    } else if (section === "body") {
      bodyLines.push(line);
    } else {
      closingLines.push(line);
    }
  }

  return (
    <div
      className="cover-letter-content mx-auto min-h-[11in] w-[8.5in] bg-white shadow-lg"
      style={{
        fontFamily: fontFamily,
        color: colors.text,
        backgroundColor: colors.background,
      }}
    >
      {/* Header with colored background */}
      <div className="p-8 pb-4" style={{ backgroundColor: colors.primary }}>
        <h1 className="mb-1 text-3xl font-bold text-white">
          {resume?.header?.name || "[Your Name]"}
        </h1>
      </div>

      {/* Two-column layout */}
      <div className="flex">
        {/* Left Sidebar - 35% */}
        <div
          className="w-[35%] space-y-6 p-6"
          style={{ backgroundColor: colors.secondary + "10" }}
        >
          {/* Contact Information */}
          <section>
            <h2
              className={`${headingSize} mb-3 font-bold`}
              style={{ color: colors.primary }}
            >
              CONTACT
            </h2>
            <div className="space-y-2">
              {resume?.header?.email && (
                <div className={`${textSize} flex items-start`}>
                  <span
                    className="mt-0.5 mr-2"
                    style={{ color: colors.accent }}
                  >
                    ✉
                  </span>
                  <span className="break-all">{resume.header.email}</span>
                </div>
              )}
              {resume?.header?.phone && (
                <div className={`${textSize} flex items-start`}>
                  <span
                    className="mt-0.5 mr-2"
                    style={{ color: colors.accent }}
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
                    style={{ color: colors.accent }}
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
                    style={{ color: colors.accent }}
                  >
                    🔗
                  </span>
                  <a
                    href={resume.header.linkedin}
                    className="break-all hover:underline"
                    style={{ color: colors.accent }}
                  >
                    LinkedIn
                  </a>
                </div>
              )}
              {resume?.header?.github && (
                <div className={`${textSize} flex items-start`}>
                  <span
                    className="mt-0.5 mr-2"
                    style={{ color: colors.accent }}
                  >
                    💻
                  </span>
                  <a
                    href={resume.header.github}
                    className="break-all hover:underline"
                    style={{ color: colors.accent }}
                  >
                    GitHub
                  </a>
                </div>
              )}
              {resume?.header?.website && (
                <div className={`${textSize} flex items-start`}>
                  <span
                    className="mt-0.5 mr-2"
                    style={{ color: colors.accent }}
                  >
                    🌐
                  </span>
                  <a
                    href={resume.header.website}
                    className="break-all hover:underline"
                    style={{ color: colors.accent }}
                  >
                    Website
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* Key Skills - Show top skills from resume */}
          {resume?.skills && resume.skills.length > 0 && (
            <section>
              <h2
                className={`${headingSize} mb-3 font-bold`}
                style={{ color: colors.primary }}
              >
                KEY SKILLS
              </h2>
              <div className="space-y-1">
                {resume.skills.slice(0, 8).map((skill, idx) => (
                  <div key={idx} className={`${textSize} flex items-center`}>
                    <span className="mr-2" style={{ color: colors.accent }}>
                      ▸
                    </span>
                    {skill}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Education Summary */}
          {resume?.education && resume.education.length > 0 && (
            <section>
              <h2
                className={`${headingSize} mb-3 font-bold`}
                style={{ color: colors.primary }}
              >
                EDUCATION
              </h2>
              {resume.education.slice(0, 2).map((edu, idx) => (
                <div key={idx} className="mb-3">
                  <div className={`${textSize} font-semibold`}>
                    {edu.degree}
                  </div>
                  <div
                    className={`${textSize}`}
                    style={{ color: colors.secondary }}
                  >
                    {edu.institution}
                  </div>
                  <div className="text-xs">
                    {edu.startDate} - {edu.endDate || "Present"}
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>

        {/* Right Main Content - 65% */}
        <div className="w-[65%] space-y-6 p-8">
          {/* Date */}
          <div className={`${textSize} text-gray-600`}>{today}</div>

          {/* Recipient */}
          {recipientLines.length > 0 && (
            <div className={`${textSize} space-y-1`}>
              {recipientLines.map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
            </div>
          )}

          {/* Letter Body */}
          <div className={`${textSize} space-y-4 leading-relaxed`}>
            {bodyLines.map((line, idx) => {
              // Check if line is a greeting or salutation
              const isGreeting = line.match(/^(Dear|Hello|Hi|To whom)/i);

              return (
                <p
                  key={idx}
                  className={isGreeting ? "font-semibold" : ""}
                  style={isGreeting ? { color: colors.primary } : {}}
                >
                  {line}
                </p>
              );
            })}
          </div>

          {/* Closing */}
          {closingLines.length > 0 && (
            <div className={`${textSize} mt-8 space-y-2`}>
              {closingLines.map((line, idx) => (
                <div key={idx} className={idx === 0 ? "font-semibold" : ""}>
                  {line}
                </div>
              ))}
              {closingLines.length > 0 && (
                <div className="mt-4 font-semibold">
                  {resume?.header?.name || "[Your Name]"}
                </div>
              )}
            </div>
          )}

          {/* Default closing if none detected */}
          {closingLines.length === 0 && bodyLines.length > 0 && (
            <div className={`${textSize} mt-8 space-y-2`}>
              <div className="font-semibold">Sincerely,</div>
              <div className="mt-4 font-semibold">
                {resume?.header?.name || "[Your Name]"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
