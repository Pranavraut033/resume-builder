// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import React from "react";

import useResolveCustomization from "@/hooks/useResolveCustomization";

import { TemplateRendererProps } from "./TemplateRenderer";

export const ElegantTimelineTemplate: React.FC<TemplateRendererProps> = ({
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
      {/* Header - Centered */}
      <header className="mb-8 text-center">
        <h1
          className="mb-2 text-4xl font-light"
          style={{ color: primaryColor }}
        >
          {resume.header.name}
        </h1>
        <div
          className={`${textSize} mb-2 flex flex-wrap justify-center gap-3`}
          style={{ color: secondaryColor }}
        >
          {resume.header.email && <span>✉ {resume.header.email}</span>}
          {resume.header.phone && <span>📞 {resume.header.phone}</span>}
          {resume.header.location && <span>📍 {resume.header.location}</span>}
        </div>
        <div className={`${textSize} flex flex-wrap justify-center gap-3`}>
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
              Portfolio
            </a>
          )}
        </div>
      </header>

      {/* Professional Summary */}
      {resume.summary && (
        <section className="mb-8 text-center">
          <h2
            className={`${headingSize} mb-3 font-semibold uppercase`}
            style={{ color: primaryColor }}
          >
            Professional Summary
          </h2>
          <p className={`${textSize} mx-auto max-w-3xl leading-relaxed`}>
            {resume.summary}
          </p>
        </section>
      )}

      {/* Experience with Timeline */}
      {resume.experience && resume.experience.length > 0 && (
        <section className="mb-8">
          <h2
            className={`${headingSize} mb-4 text-center font-semibold uppercase`}
            style={{ color: primaryColor }}
          >
            Experience
          </h2>
          <div className="relative">
            <div
              className="absolute left-1/2 h-full w-0.5 -translate-x-1/2 transform"
              style={{ backgroundColor: accentColor }}
            />
            <div className="space-y-8">
              {resume.experience.map((exp, idx) => (
                <div
                  key={idx}
                  className={`flex ${idx % 2 === 0 ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`w-5/12 ${idx % 2 === 0 ? "pr-8 text-right" : "pl-8 text-left"}`}
                  >
                    <div className="relative">
                      <div
                        className={`absolute top-2 h-4 w-4 rounded-full border-2 ${
                          idx % 2 === 0 ? "-right-[3.75rem]" : "-left-[3.75rem]"
                        }`}
                        style={{
                          backgroundColor: backgroundColor,
                          borderColor: accentColor,
                        }}
                      />
                      <h3 className={`${textSize} font-bold`}>{exp.role}</h3>
                      <div
                        className={`${textSize} font-medium`}
                        style={{ color: secondaryColor }}
                      >
                        {exp.company}
                      </div>
                      <div className="mb-2 text-xs">
                        {exp.startDate} - {exp.endDate || "Present"}
                      </div>
                      {exp.description && (
                        <p className={`${textSize} mb-2`}>{exp.description}</p>
                      )}
                      {exp.achievements && exp.achievements.length > 0 && (
                        <ul className="space-y-1 text-xs">
                          {exp.achievements.map((achievement, achIdx) => (
                            <li key={achIdx}>• {achievement}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Education */}
      {resume.education && resume.education.length > 0 && (
        <section className="mb-8 text-center">
          <h2
            className={`${headingSize} mb-3 font-semibold uppercase`}
            style={{ color: primaryColor }}
          >
            Education
          </h2>
          <div className="space-y-3">
            {resume.education.map((edu, idx) => (
              <div key={idx}>
                <h3 className={`${textSize} font-bold`}>{edu.degree}</h3>
                <div
                  className={`${textSize}`}
                  style={{ color: secondaryColor }}
                >
                  {edu.institution}
                  {edu.field && ` • ${edu.field}`}
                </div>
                <div className="text-xs">
                  {edu.startDate} - {edu.endDate || "Present"}
                  {edu.gpa && ` • GPA: ${edu.gpa}`}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {resume.skills && resume.skills.length > 0 && (
        <section className="mb-8">
          <h2
            className={`${headingSize} mb-3 text-center font-semibold uppercase`}
            style={{ color: primaryColor }}
          >
            Core Skills
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {resume.skills.map((skill, idx) => (
              <span
                key={idx}
                className="rounded-full px-3 py-1 text-xs"
                style={{
                  backgroundColor: accentColor + "20",
                  color: accentColor,
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {resume.projects && resume.projects.length > 0 && (
        <section className="mb-8">
          <h2
            className={`${headingSize} mb-4 text-center font-semibold uppercase`}
            style={{ color: primaryColor }}
          >
            Key Projects
          </h2>
          <div className="space-y-4">
            {resume.projects.map((project, idx) => (
              <div key={idx} className="text-center">
                <h3 className={`${textSize} font-bold`}>{project.name}</h3>
                <p className={`${textSize} mt-1`}>{project.description}</p>
                {project.technologies && project.technologies.length > 0 && (
                  <div className="mt-2 flex flex-wrap justify-center gap-1">
                    {project.technologies.map((tech, techIdx) => (
                      <span
                        key={techIdx}
                        className="rounded px-2 py-0.5 text-xs"
                        style={{
                          backgroundColor: accentColor + "20",
                          color: accentColor,
                        }}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {resume.certifications && resume.certifications.length > 0 && (
        <section className="text-center">
          <h2
            className={`${headingSize} mb-3 font-semibold uppercase`}
            style={{ color: primaryColor }}
          >
            Certifications
          </h2>
          {resume.certifications.map((cert, idx) => (
            <div key={idx} className="mb-2">
              <span className={`${textSize} font-semibold`}>{cert.name}</span>
              <div className="text-xs" style={{ color: secondaryColor }}>
                {cert.issuer} • {cert.date}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};
