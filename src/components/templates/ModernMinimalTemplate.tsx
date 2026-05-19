// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import React from "react";

import useResolveCustomization from "@/hooks/useResolveCustomization";

import { TemplateRendererProps } from "./TemplateRenderer";

export const ModernMinimalTemplate: React.FC<TemplateRendererProps> = ({
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
    headingSize,
  } = useResolveCustomization(customization);

  return (
    <div
      className="resume-content mx-auto bg-white p-12 shadow-lg"
      style={{
        fontFamily: fontFamily,
        color: textColor,
        backgroundColor: backgroundColor,
      }}
    >
      {/* Header */}
      <header
        className="mb-8 border-b-2 pb-4"
        style={{ borderColor: primaryColor }}
      >
        <h1 className="mb-2 text-4xl font-bold" style={{ color: primaryColor }}>
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
                style={{ color: accentColor }}
              >
                LinkedIn
              </a>
            )}
            {resume.header.github && (
              <a
                href={resume.header.github}
                className="hover:underline"
                style={{ color: accentColor }}
              >
                GitHub
              </a>
            )}
            {resume.header.website && (
              <a
                href={resume.header.website}
                className="hover:underline"
                style={{ color: accentColor }}
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
            style={{ color: primaryColor, borderColor: secondaryColor }}
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
            style={{ color: primaryColor, borderColor: secondaryColor }}
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
                      style={{ color: accentColor }}
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
            style={{ color: primaryColor, borderColor: secondaryColor }}
          >
            Projects
          </h2>
          <div className="space-y-3">
            {resume.projects.map((project, index) => (
              <div key={index}>
                <h3 className="font-semibold" style={{ color: accentColor }}>
                  {project.name}
                  {project.url && (
                    <a
                      href={project.url}
                      className={`${textSize} ml-2 hover:underline`}
                      style={{ color: secondaryColor }}
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
            style={{ color: primaryColor, borderColor: secondaryColor }}
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
            style={{ color: primaryColor, borderColor: secondaryColor }}
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
                      style={{ color: accentColor }}
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
            style={{ color: primaryColor, borderColor: secondaryColor }}
          >
            Certifications
          </h2>
          <div className="space-y-2">
            {resume.certifications.map((cert, index) => (
              <div key={index}>
                <h3 className="font-semibold" style={{ color: accentColor }}>
                  {cert.name}
                </h3>
                <p className={`${textSize} text-gray-600`}>
                  {cert.issuer} • {cert.date}
                  {cert.url && (
                    <a
                      href={cert.url}
                      className="ml-2 hover:underline"
                      style={{ color: secondaryColor }}
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
