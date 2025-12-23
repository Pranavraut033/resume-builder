// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import React from "react";
import { ResumeJSON, ResumeColors } from "@/types/resume";

interface ElegantTimelineTemplateProps {
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

export const ElegantTimelineTemplate: React.FC<
  ElegantTimelineTemplateProps
> = ({ resume, colors, fontSize, fontFamily }) => {
  const textSize = fontSizeMap[fontSize];
  const headingSize = headingSizeMap[fontSize];

  return (
    <div
      className="resume-content bg-white min-h-[11in] w-[8.5in] mx-auto p-12 shadow-lg"
      style={{
        fontFamily: fontFamily,
        color: colors.text,
        backgroundColor: colors.background,
      }}
    >
      {/* Header - Centered */}
      <header className="text-center mb-8">
        <h1 className="text-4xl font-light mb-2" style={{ color: colors.primary }}>
          {resume.header.name}
        </h1>
        <div className={`${textSize} flex justify-center flex-wrap gap-3 mb-2`} style={{ color: colors.secondary }}>
          {resume.header.email && <span>✉ {resume.header.email}</span>}
          {resume.header.phone && <span>📞 {resume.header.phone}</span>}
          {resume.header.location && <span>📍 {resume.header.location}</span>}
        </div>
        <div className={`${textSize} flex justify-center flex-wrap gap-3`}>
          {resume.header.linkedin && (
            <a href={resume.header.linkedin} className="hover:underline" style={{ color: colors.accent }}>
              LinkedIn
            </a>
          )}
          {resume.header.github && (
            <a href={resume.header.github} className="hover:underline" style={{ color: colors.accent }}>
              GitHub
            </a>
          )}
          {resume.header.website && (
            <a href={resume.header.website} className="hover:underline" style={{ color: colors.accent }}>
              Portfolio
            </a>
          )}
        </div>
      </header>

      {/* Professional Summary */}
      {resume.summary && (
        <section className="mb-8 text-center">
          <h2
            className={`${headingSize} font-semibold mb-3 uppercase`}
            style={{ color: colors.primary }}
          >
            Professional Summary
          </h2>
          <p className={`${textSize} leading-relaxed max-w-3xl mx-auto`}>
            {resume.summary}
          </p>
        </section>
      )}

      {/* Experience with Timeline */}
      {resume.experience && resume.experience.length > 0 && (
        <section className="mb-8">
          <h2
            className={`${headingSize} font-semibold mb-4 text-center uppercase`}
            style={{ color: colors.primary }}
          >
            Experience
          </h2>
          <div className="relative">
            <div
              className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full"
              style={{ backgroundColor: colors.accent }}
            />
            <div className="space-y-8">
              {resume.experience.map((exp, idx) => (
                <div
                  key={idx}
                  className={`flex ${idx % 2 === 0 ? "justify-start" : "justify-end"}`}
                >
                  <div className={`w-5/12 ${idx % 2 === 0 ? "pr-8 text-right" : "pl-8 text-left"}`}>
                    <div className="relative">
                      <div
                        className={`absolute top-2 w-4 h-4 rounded-full border-2 ${
                          idx % 2 === 0 ? "-right-[3.75rem]" : "-left-[3.75rem]"
                        }`}
                        style={{
                          backgroundColor: colors.background,
                          borderColor: colors.accent,
                        }}
                      />
                      <h3 className={`${textSize} font-bold`}>{exp.role}</h3>
                      <div
                        className={`${textSize} font-medium`}
                        style={{ color: colors.secondary }}
                      >
                        {exp.company}
                      </div>
                      <div className="text-xs mb-2">
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
            className={`${headingSize} font-semibold mb-3 uppercase`}
            style={{ color: colors.primary }}
          >
            Education
          </h2>
          <div className="space-y-3">
            {resume.education.map((edu, idx) => (
              <div key={idx}>
                <h3 className={`${textSize} font-bold`}>{edu.degree}</h3>
                <div className={`${textSize}`} style={{ color: colors.secondary }}>
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
            className={`${headingSize} font-semibold mb-3 text-center uppercase`}
            style={{ color: colors.primary }}
          >
            Core Skills
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {resume.skills.map((skill, idx) => (
              <span
                key={idx}
                className="px-3 py-1 text-xs rounded-full"
                style={{
                  backgroundColor: colors.accent + "20",
                  color: colors.accent,
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
            className={`${headingSize} font-semibold mb-4 text-center uppercase`}
            style={{ color: colors.primary }}
          >
            Key Projects
          </h2>
          <div className="space-y-4">
            {resume.projects.map((project, idx) => (
              <div key={idx} className="text-center">
                <h3 className={`${textSize} font-bold`}>{project.name}</h3>
                <p className={`${textSize} mt-1`}>{project.description}</p>
                {project.technologies && project.technologies.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1 mt-2">
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
          </div>
        </section>
      )}

      {/* Certifications */}
      {resume.certifications && resume.certifications.length > 0 && (
        <section className="text-center">
          <h2
            className={`${headingSize} font-semibold mb-3 uppercase`}
            style={{ color: colors.primary }}
          >
            Certifications
          </h2>
          {resume.certifications.map((cert, idx) => (
            <div key={idx} className="mb-2">
              <span className={`${textSize} font-semibold`}>{cert.name}</span>
              <div className="text-xs" style={{ color: colors.secondary }}>
                {cert.issuer} • {cert.date}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};
