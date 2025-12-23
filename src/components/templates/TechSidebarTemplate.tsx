// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import React from "react";
import { ResumeJSON, ResumeColors } from "@/types/resume";

interface TechSidebarTemplateProps {
  resume: ResumeJSON;
  colors: ResumeColors;
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

export const TechSidebarTemplate: React.FC<TechSidebarTemplateProps> = ({
  resume,
  colors,
  fontSize,
  fontFamily,
}) => {
  const textSize = fontSizeMap[fontSize];
  const headingSize = headingSizeMap[fontSize];

  return (
    <div
      className="resume-content bg-white min-h-[11in] w-[8.5in] mx-auto shadow-lg"
      style={{
        fontFamily: fontFamily,
        color: colors.text,
        backgroundColor: colors.background,
      }}
    >
      {/* Header */}
      <div className="p-8 pb-4" style={{ backgroundColor: colors.primary }}>
        <h1 className="text-3xl font-bold text-white mb-1">
          {resume.header.name}
        </h1>
        <div className="flex flex-wrap gap-3 text-white text-xs opacity-90">
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
          className="w-[35%] p-6 space-y-6"
          style={{ backgroundColor: colors.secondary + "10" }}
        >
          {/* Skills */}
          {resume.skills && resume.skills.length > 0 && (
            <section>
              <h2
                className={`${headingSize} font-bold mb-3`}
                style={{ color: colors.primary }}
              >
                TECHNICAL SKILLS
              </h2>
              <div className="space-y-1">
                {resume.skills.map((skill, idx) => (
                  <div key={idx} className={`${textSize} flex items-center`}>
                    <span
                      className="mr-2"
                      style={{ color: colors.accent }}
                    >
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
                className={`${headingSize} font-bold mb-3`}
                style={{ color: colors.primary }}
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
                    style={{ color: colors.secondary }}
                  >
                    {edu.institution}
                  </div>
                  <div className="text-xs">
                    {edu.startDate} - {edu.endDate || "Present"}
                  </div>
                  {edu.gpa && (
                    <div className="text-xs">GPA: {edu.gpa}</div>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Certifications */}
          {resume.certifications && resume.certifications.length > 0 && (
            <section>
              <h2
                className={`${headingSize} font-bold mb-3`}
                style={{ color: colors.primary }}
              >
                CERTIFICATIONS
              </h2>
              {resume.certifications.map((cert, idx) => (
                <div key={idx} className="mb-2">
                  <div className={`${textSize} font-semibold`}>{cert.name}</div>
                  <div className="text-xs" style={{ color: colors.secondary }}>
                    {cert.issuer} • {cert.date}
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>

        {/* Right Main Content - 65% */}
        <div className="w-[65%] p-6 space-y-6">
          {/* Professional Summary */}
          {resume.summary && (
            <section>
              <h2
                className={`${headingSize} font-bold mb-2 pb-1 border-b-2`}
                style={{ color: colors.primary, borderColor: colors.primary }}
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
                className={`${headingSize} font-bold mb-3 pb-1 border-b-2`}
                style={{ color: colors.primary, borderColor: colors.primary }}
              >
                PROFESSIONAL EXPERIENCE
              </h2>
              {resume.experience.map((exp, idx) => (
                <div key={idx} className="mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className={`${textSize} font-bold`}>{exp.role}</h3>
                      <div
                        className={`${textSize}`}
                        style={{ color: colors.secondary }}
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
                          <span style={{ color: colors.accent }}>▸</span>{" "}
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
                className={`${headingSize} font-bold mb-3 pb-1 border-b-2`}
                style={{ color: colors.primary, borderColor: colors.primary }}
              >
                KEY PROJECTS
              </h2>
              {resume.projects.map((project, idx) => (
                <div key={idx} className="mb-3">
                  <h3 className={`${textSize} font-bold`}>{project.name}</h3>
                  <p className={`${textSize} mt-1`}>{project.description}</p>
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {project.technologies.map((tech, techIdx) => (
                        <span
                          key={techIdx}
                          className="px-2 py-0.5 text-xs rounded"
                          style={{
                            backgroundColor: colors.accent + "20",
                            color: colors.accent,
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
