// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import React from "react";
import { ResumeJSON, ResumeColors } from "@/types/resume";

interface CreativeModernTemplateProps {
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
  small: "text-base",
  medium: "text-lg",
  large: "text-xl",
};

export const CreativeModernTemplate: React.FC<CreativeModernTemplateProps> = ({
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
      {/* Header with Bold Accent */}
      <header className="p-8" style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}>
        <h1 className="text-4xl font-bold text-white mb-2">
          {resume.header.name}
        </h1>
        <div className="flex flex-wrap gap-4 text-white text-sm opacity-95">
          {resume.header.email && <span>✉ {resume.header.email}</span>}
          {resume.header.phone && <span>📞 {resume.header.phone}</span>}
          {resume.header.location && <span>📍 {resume.header.location}</span>}
          {resume.header.linkedin && <span>🔗 LinkedIn</span>}
          {resume.header.github && <span>💻 GitHub</span>}
        </div>
      </header>

      <div className="flex">
        {/* Left Column - 40% */}
        <div className="w-[40%] p-6 space-y-6" style={{ backgroundColor: colors.secondary + "08" }}>
          {/* Professional Summary */}
          {resume.summary && (
            <section>
              <h2
                className={`${headingSize} font-bold mb-3 pb-2 border-b-2`}
                style={{ color: colors.primary, borderColor: colors.accent }}
              >
                ABOUT ME
              </h2>
              <p className={`${textSize} leading-relaxed`}>{resume.summary}</p>
            </section>
          )}

          {/* Skills */}
          {resume.skills && resume.skills.length > 0 && (
            <section>
              <h2
                className={`${headingSize} font-bold mb-3 pb-2 border-b-2`}
                style={{ color: colors.primary, borderColor: colors.accent }}
              >
                SKILLS
              </h2>
              <div className="space-y-2">
                {resume.skills.map((skill, idx) => (
                  <div key={idx} className="flex items-center">
                    <div
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: colors.accent }}
                    />
                    <span className={`${textSize}`}>{skill}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Education */}
          {resume.education && resume.education.length > 0 && (
            <section>
              <h2
                className={`${headingSize} font-bold mb-3 pb-2 border-b-2`}
                style={{ color: colors.primary, borderColor: colors.accent }}
              >
                EDUCATION
              </h2>
              {resume.education.map((edu, idx) => (
                <div key={idx} className="mb-4">
                  <h3 className={`${textSize} font-bold`}>{edu.degree}</h3>
                  <div className={`${textSize}`} style={{ color: colors.secondary }}>
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
                className={`${headingSize} font-bold mb-3 pb-2 border-b-2`}
                style={{ color: colors.primary, borderColor: colors.accent }}
              >
                CERTIFICATIONS
              </h2>
              {resume.certifications.map((cert, idx) => (
                <div key={idx} className="mb-3">
                  <div className={`${textSize} font-semibold`}>{cert.name}</div>
                  <div className="text-xs" style={{ color: colors.secondary }}>
                    {cert.issuer}
                  </div>
                  <div className="text-xs">{cert.date}</div>
                </div>
              ))}
            </section>
          )}
        </div>

        {/* Right Column - 60% */}
        <div className="w-[60%] p-6 space-y-6">
          {/* Experience */}
          {resume.experience && resume.experience.length > 0 && (
            <section>
              <h2
                className={`${headingSize} font-bold mb-4 pb-2 border-b-2`}
                style={{ color: colors.primary, borderColor: colors.accent }}
              >
                EXPERIENCE
              </h2>
              {resume.experience.map((exp, idx) => (
                <div key={idx} className="mb-5 relative pl-6">
                  <div
                    className="absolute left-0 top-1 w-3 h-3 rounded-full"
                    style={{ backgroundColor: colors.accent }}
                  />
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`${textSize} font-bold`}>{exp.role}</h3>
                    <span className="text-xs whitespace-nowrap ml-2">
                      {exp.startDate} - {exp.endDate || "Present"}
                    </span>
                  </div>
                  <div
                    className={`${textSize} font-semibold mb-2`}
                    style={{ color: colors.secondary }}
                  >
                    {exp.company}
                  </div>
                  {exp.description && (
                    <p className={`${textSize} mb-2`}>{exp.description}</p>
                  )}
                  {exp.achievements && exp.achievements.length > 0 && (
                    <ul className="space-y-1">
                      {exp.achievements.map((achievement, achIdx) => (
                        <li key={achIdx} className={`${textSize} ml-4`}>
                          <span style={{ color: colors.accent }}>▸</span> {achievement}
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
                className={`${headingSize} font-bold mb-4 pb-2 border-b-2`}
                style={{ color: colors.primary, borderColor: colors.accent }}
              >
                PROJECTS
              </h2>
              {resume.projects.map((project, idx) => (
                <div key={idx} className="mb-4 relative pl-6">
                  <div
                    className="absolute left-0 top-1 w-3 h-3 rounded-full"
                    style={{ backgroundColor: colors.accent }}
                  />
                  <h3 className={`${textSize} font-bold`}>{project.name}</h3>
                  <p className={`${textSize} mt-1 mb-2`}>{project.description}</p>
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.technologies.map((tech, techIdx) => (
                        <span
                          key={techIdx}
                          className="px-2 py-0.5 text-xs rounded-full font-medium"
                          style={{
                            backgroundColor: colors.accent,
                            color: colors.background,
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
