// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import React from "react";
import { ResumeJSON, ResumeColors } from "@/types/resume";

interface BusinessProfessionalTemplateProps {
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

export const BusinessProfessionalTemplate: React.FC<
  BusinessProfessionalTemplateProps
> = ({ resume, colors, fontSize, fontFamily }) => {
  const textSize = fontSizeMap[fontSize];
  const headingSize = headingSizeMap[fontSize];

  return (
    <div
      className="resume-content bg-white min-h-[11in] w-[8.5in] mx-auto p-16 shadow-lg"
      style={{
        fontFamily: fontFamily,
        color: colors.text,
        backgroundColor: colors.background,
      }}
    >
      {/* Header - Centered */}
      <header className="text-center mb-8 pb-6 border-b" style={{ borderColor: colors.secondary }}>
        <h1
          className="text-3xl font-serif font-bold mb-2"
          style={{ color: colors.primary }}
        >
          {resume.header.name}
        </h1>
        <div className={`${textSize} space-y-1`} style={{ color: colors.secondary }}>
          <div className="flex justify-center gap-3">
            {resume.header.email && <span>{resume.header.email}</span>}
            {resume.header.phone && <span>•</span>}
            {resume.header.phone && <span>{resume.header.phone}</span>}
          </div>
          <div className="flex justify-center gap-3">
            {resume.header.location && <span>{resume.header.location}</span>}
            {resume.header.linkedin && <span>•</span>}
            {resume.header.linkedin && <span>LinkedIn</span>}
          </div>
        </div>
      </header>

      {/* Professional Summary */}
      {resume.summary && (
        <section className="mb-6">
          <h2
            className={`${headingSize} font-serif font-bold mb-2 uppercase`}
            style={{ color: colors.primary }}
          >
            Professional Summary
          </h2>
          <p className={`${textSize} leading-relaxed text-justify`}>
            {resume.summary}
          </p>
        </section>
      )}

      {/* Professional Experience */}
      {resume.experience && resume.experience.length > 0 && (
        <section className="mb-6">
          <h2
            className={`${headingSize} font-serif font-bold mb-3 uppercase`}
            style={{ color: colors.primary }}
          >
            Professional Experience
          </h2>
          {resume.experience.map((exp, idx) => (
            <div key={idx} className="mb-4">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className={`${textSize} font-bold`}>{exp.role}</h3>
                <span className="text-xs" style={{ color: colors.secondary }}>
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
                    <li key={achIdx} className={`${textSize} ml-5 list-disc`}>
                      {achievement}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Education */}
      {resume.education && resume.education.length > 0 && (
        <section className="mb-6">
          <h2
            className={`${headingSize} font-serif font-bold mb-3 uppercase`}
            style={{ color: colors.primary }}
          >
            Education
          </h2>
          {resume.education.map((edu, idx) => (
            <div key={idx} className="mb-3">
              <div className="flex justify-between items-baseline">
                <h3 className={`${textSize} font-bold`}>{edu.degree}</h3>
                <span className="text-xs" style={{ color: colors.secondary }}>
                  {edu.startDate} - {edu.endDate || "Present"}
                </span>
              </div>
              <div className={`${textSize}`} style={{ color: colors.secondary }}>
                {edu.institution}
                {edu.field && ` • ${edu.field}`}
              </div>
              {edu.gpa && (
                <div className="text-xs">GPA: {edu.gpa}</div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Skills */}
      {resume.skills && resume.skills.length > 0 && (
        <section className="mb-6">
          <h2
            className={`${headingSize} font-serif font-bold mb-3 uppercase`}
            style={{ color: colors.primary }}
          >
            Core Competencies
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {resume.skills.map((skill, idx) => (
              <span key={idx} className={`${textSize}`}>
                • {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {resume.projects && resume.projects.length > 0 && (
        <section className="mb-6">
          <h2
            className={`${headingSize} font-serif font-bold mb-3 uppercase`}
            style={{ color: colors.primary }}
          >
            Key Projects
          </h2>
          {resume.projects.map((project, idx) => (
            <div key={idx} className="mb-3">
              <h3 className={`${textSize} font-bold`}>{project.name}</h3>
              <p className={`${textSize} mt-1`}>{project.description}</p>
              {project.technologies && project.technologies.length > 0 && (
                <div className="text-xs mt-1" style={{ color: colors.secondary }}>
                  Technologies: {project.technologies.join(", ")}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Certifications */}
      {resume.certifications && resume.certifications.length > 0 && (
        <section>
          <h2
            className={`${headingSize} font-serif font-bold mb-3 uppercase`}
            style={{ color: colors.primary }}
          >
            Certifications
          </h2>
          {resume.certifications.map((cert, idx) => (
            <div key={idx} className="mb-2">
              <span className={`${textSize} font-semibold`}>{cert.name}</span>
              <span className="text-xs mx-2">•</span>
              <span className="text-xs" style={{ color: colors.secondary }}>
                {cert.issuer} • {cert.date}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};
