// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import React from "react";

import { ResumeJSON, ThemeColors } from "@/types/resume";

interface ModernMinimalTemplateProps {
  resume: ResumeJSON;
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
  small: "text-lg",
  medium: "text-xl",
  large: "text-2xl",
};

export const ModernMinimalTemplate: React.FC<ModernMinimalTemplateProps> = ({
  resume,
  colors,
  fontSize,
  fontFamily,
}) => {
  const textSize = fontSizeMap[fontSize];
  const headingSize = headingSizeMap[fontSize];

  return (
    <div
      className="resume-content mx-auto min-h-[11in] w-[8.5in] bg-white p-12 shadow-lg"
      style={{
        fontFamily: fontFamily,
        color: colors.text,
        backgroundColor: colors.background,
      }}
    >
      {/* Header */}
      <header
        className="mb-8 border-b-2 pb-4"
        style={{ borderColor: colors.primary }}
      >
        <h1
          className="mb-2 text-4xl font-bold"
          style={{ color: colors.primary }}
        >
          {resume.header.name}
        </h1>
        <div className={`${textSize} space-y-1 text-gray-600`}>
          <div className="flex flex-wrap gap-4">
            {resume.header.email && <span>✉ {resume.header.email}</span>}
            {resume.header.phone && <span>📞 {resume.header.phone}</span>}
            {resume.header.location && <span>📍 {resume.header.location}</span>}
          </div>
          <div className="flex flex-wrap gap-4">
            {resume.header.linkedin && (
              <a
                href={resume.header.linkedin}
                className="hover:underline"
                style={{ color: colors.accent }}
              >
                LinkedIn
              </a>
            )}
            {resume.header.github && (
              <a
                href={resume.header.github}
                className="hover:underline"
                style={{ color: colors.accent }}
              >
                GitHub
              </a>
            )}
            {resume.header.website && (
              <a
                href={resume.header.website}
                className="hover:underline"
                style={{ color: colors.accent }}
              >
                Website
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Summary */}
      {resume.summary && (
        <section className="mb-6">
          <h2
            className={`${headingSize} mb-3 border-b pb-1 font-semibold`}
            style={{ color: colors.primary, borderColor: colors.secondary }}
          >
            Professional Summary
          </h2>
          <p className={`${textSize} leading-relaxed text-gray-700`}>
            {resume.summary}
          </p>
        </section>
      )}

      {/* Experience */}
      {resume.experience.length > 0 && (
        <section className="mb-6">
          <h2
            className={`${headingSize} mb-3 border-b pb-1 font-semibold`}
            style={{ color: colors.primary, borderColor: colors.secondary }}
          >
            Work Experience
          </h2>
          <div className="space-y-4">
            {resume.experience.map((exp, index) => (
              <div key={index}>
                <div className="mb-1 flex items-start justify-between">
                  <div>
                    <h3
                      className="font-semibold"
                      style={{ color: colors.accent }}
                    >
                      {exp.role}
                    </h3>
                    <p className={`${textSize} text-gray-600`}>{exp.company}</p>
                  </div>
                  <span className={`${textSize} text-gray-500`}>
                    {exp.startDate} - {exp.endDate || "Present"}
                  </span>
                </div>
                <p className={`${textSize} mb-2 text-gray-700`}>
                  {exp.description}
                </p>
                {exp.achievements.length > 0 && (
                  <ul
                    className={`${textSize} list-inside list-disc space-y-1 text-gray-700`}
                  >
                    {exp.achievements.map((achievement, i) => (
                      <li key={i}>{achievement}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {resume.projects.length > 0 && (
        <section className="mb-6">
          <h2
            className={`${headingSize} mb-3 border-b pb-1 font-semibold`}
            style={{ color: colors.primary, borderColor: colors.secondary }}
          >
            Projects
          </h2>
          <div className="space-y-3">
            {resume.projects.map((project, index) => (
              <div key={index}>
                <h3 className="font-semibold" style={{ color: colors.accent }}>
                  {project.name}
                  {project.url && (
                    <a
                      href={project.url}
                      className={`${textSize} ml-2 hover:underline`}
                      style={{ color: colors.secondary }}
                    >
                      [Link]
                    </a>
                  )}
                </h3>
                <p className={`${textSize} mb-1 text-gray-700`}>
                  {project.description}
                </p>
                <div className={`${textSize} text-gray-600`}>
                  <span className="font-medium">Technologies:</span>{" "}
                  {project.technologies.join(", ")}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {resume.skills.length > 0 && (
        <section className="mb-6">
          <h2
            className={`${headingSize} mb-3 border-b pb-1 font-semibold`}
            style={{ color: colors.primary, borderColor: colors.secondary }}
          >
            Skills
          </h2>
          <div className={`${textSize} text-gray-700`}>
            {resume.skills.join(" • ")}
          </div>
        </section>
      )}

      {/* Education */}
      {resume.education.length > 0 && (
        <section className="mb-6">
          <h2
            className={`${headingSize} mb-3 border-b pb-1 font-semibold`}
            style={{ color: colors.primary, borderColor: colors.secondary }}
          >
            Education
          </h2>
          <div className="space-y-3">
            {resume.education.map((edu, index) => (
              <div key={index}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3
                      className="font-semibold"
                      style={{ color: colors.accent }}
                    >
                      {edu.degree} in {edu.field}
                    </h3>
                    <p className={`${textSize} text-gray-600`}>
                      {edu.institution}
                    </p>
                  </div>
                  <span className={`${textSize} text-gray-500`}>
                    {edu.startDate} - {edu.endDate || "Present"}
                  </span>
                </div>
                {edu.gpa && (
                  <p className={`${textSize} text-gray-600`}>GPA: {edu.gpa}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {resume.certifications.length > 0 && (
        <section>
          <h2
            className={`${headingSize} mb-3 border-b pb-1 font-semibold`}
            style={{ color: colors.primary, borderColor: colors.secondary }}
          >
            Certifications
          </h2>
          <div className="space-y-2">
            {resume.certifications.map((cert, index) => (
              <div key={index}>
                <h3 className="font-semibold" style={{ color: colors.accent }}>
                  {cert.name}
                </h3>
                <p className={`${textSize} text-gray-600`}>
                  {cert.issuer} • {cert.date}
                  {cert.url && (
                    <a
                      href={cert.url}
                      className="ml-2 hover:underline"
                      style={{ color: colors.secondary }}
                    >
                      [Verify]
                    </a>
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
