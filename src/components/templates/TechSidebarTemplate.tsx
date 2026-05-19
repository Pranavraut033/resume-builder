// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import React from "react";

import useResolveCustomization from "@/hooks/useResolveCustomization";

import { TemplateRendererProps } from "./TemplateRenderer";

export const TechSidebarTemplate: React.FC<TemplateRendererProps> = ({
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
      className="resume-content mx-auto bg-white shadow-lg"
      style={{
        fontFamily: fontFamily,
        color: textColor,
        backgroundColor: backgroundColor,
      }}
    >
      {/* Header */}
      <div className="p-8 pb-4" style={{ backgroundColor: primaryColor }}>
        <h1 className="mb-1 text-3xl font-bold text-white">
          {resume.header.name}
        </h1>
        <div className="flex flex-wrap gap-3 text-xs text-white opacity-90">
          {resume.header.email && <span>✉ {resume.header.email}</span>}
          {resume.header.phone && <span>📞 {resume.header.phone}</span>}
          {resume.header.location && <span>📍 {resume.header.location}</span>}
          {resume.header.linkedin && <span>🔗 LinkedIn</span>}
          {resume.header.github && <span>💻 GitHub</span>}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex">
        {/* Left Sidebar - 35% */}
        <div
          className="w-[35%] space-y-6 p-6"
          style={{ backgroundColor: secondaryColor + "10" }}
        >
          {/* Skills */}
          {resume.skills && resume.skills.length > 0 && (
            <section>
              <h2
                className={`${headingSize} mb-3 font-bold`}
                style={{ color: primaryColor }}
              >
                TECHNICAL SKILLS
              </h2>
              <div className="space-y-1">
                {resume.skills.map((skill, idx) => (
                  <div key={idx} className={`${textSize} flex items-center`}>
                    <span className="mr-2" style={{ color: accentColor }}>
                      ▸
                    </span>
                    {skill}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Education */}
          {resume.education && resume.education.length > 0 && (
            <section>
              <h2
                className={`${headingSize} mb-3 font-bold`}
                style={{ color: primaryColor }}
              >
                EDUCATION
              </h2>
              {resume.education.map((edu, idx) => (
                <div key={idx} className="mb-3">
                  <div className={`${textSize} font-semibold`}>
                    {edu.degree}
                  </div>
                  <div
                    className={`${textSize}`}
                    style={{ color: secondaryColor }}
                  >
                    {edu.institution}
                  </div>
                  <div className="text-xs">
                    {edu.startDate} - {edu.endDate || "Present"}
                  </div>
                  {edu.gpa && <div className="text-xs">GPA: {edu.gpa}</div>}
                </div>
              ))}
            </section>
          )}

          {/* Certifications */}
          {resume.certifications && resume.certifications.length > 0 && (
            <section>
              <h2
                className={`${headingSize} mb-3 font-bold`}
                style={{ color: primaryColor }}
              >
                CERTIFICATIONS
              </h2>
              {resume.certifications.map((cert, idx) => (
                <div key={idx} className="mb-2">
                  <div className={`${textSize} font-semibold`}>{cert.name}</div>
                  <div className="text-xs" style={{ color: secondaryColor }}>
                    {cert.issuer} • {cert.date}
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>

        {/* Right Main Content - 65% */}
        <div className="w-[65%] space-y-6 p-6">
          {/* Professional Summary */}
          {resume.summary && (
            <section>
              <h2
                className={`${headingSize} mb-2 border-b-2 pb-1 font-bold`}
                style={{ color: primaryColor, borderColor: primaryColor }}
              >
                PROFESSIONAL SUMMARY
              </h2>
              <p className={`${textSize} leading-relaxed`}>{resume.summary}</p>
            </section>
          )}

          {/* Experience */}
          {resume.experience && resume.experience.length > 0 && (
            <section>
              <h2
                className={`${headingSize} mb-3 border-b-2 pb-1 font-bold`}
                style={{ color: primaryColor, borderColor: primaryColor }}
              >
                PROFESSIONAL EXPERIENCE
              </h2>
              {resume.experience.map((exp, idx) => (
                <div key={idx} className="mb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`${textSize} font-bold`}>{exp.role}</h3>
                      <div
                        className={`${textSize}`}
                        style={{ color: secondaryColor }}
                      >
                        {exp.company}
                      </div>
                    </div>
                    <div className="text-xs">
                      {exp.startDate} - {exp.endDate || "Present"}
                    </div>
                  </div>
                  {exp.description && (
                    <p className={`${textSize} mt-1`}>{exp.description}</p>
                  )}
                  {exp.achievements && exp.achievements.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {exp.achievements.map((achievement, achIdx) => (
                        <li key={achIdx} className={`${textSize} ml-4`}>
                          <span style={{ color: accentColor }}>▸</span>{" "}
                          {achievement}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Projects */}
          {resume.projects && resume.projects.length > 0 && (
            <section>
              <h2
                className={`${headingSize} mb-3 border-b-2 pb-1 font-bold`}
                style={{ color: primaryColor, borderColor: primaryColor }}
              >
                KEY PROJECTS
              </h2>
              {resume.projects.map((project, idx) => (
                <div key={idx} className="mb-3">
                  <h3 className={`${textSize} font-bold`}>{project.name}</h3>
                  <p className={`${textSize} mt-1`}>{project.description}</p>
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
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
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
