// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import React from "react";

import useResolveCustomization from "@/hooks/useResolveCustomization";

import { TemplateRendererProps } from "./TemplateRenderer";

export const BusinessProfessionalTemplate: React.FC<TemplateRendererProps> = ({
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
      className="resume-content mx-auto bg-white p-16 shadow-lg"
      style={{
        fontFamily: fontFamily,
        color: textColor,
        backgroundColor: backgroundColor,
      }}
    >
      {/* Header - Centered */}
      <header
        className="mb-8 border-b pb-6 text-center"
        style={{ borderColor: secondaryColor }}
      >
        <h1
          className="mb-2 font-serif text-3xl font-bold"
          style={{ color: primaryColor }}
        >
          {resume.header.name}
        </h1>
        <div
          className={`${textSize} space-y-1`}
          style={{ color: secondaryColor }}
        >
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
            className={`${headingSize} mb-2 font-serif font-bold uppercase`}
            style={{ color: primaryColor }}
          >
            Professional Summary
          </h2>
          <p className={`${textSize} text-justify leading-relaxed`}>
            {resume.summary}
          </p>
        </section>
      )}

      {/* Professional Experience */}
      {resume.experience && resume.experience.length > 0 && (
        <section className="mb-6">
          <h2
            className={`${headingSize} mb-3 font-serif font-bold uppercase`}
            style={{ color: primaryColor }}
          >
            Professional Experience
          </h2>
          {resume.experience.map((exp, idx) => (
            <div key={idx} className="mb-4">
              <div className="mb-1 flex items-baseline justify-between">
                <h3 className={`${textSize} font-bold`}>{exp.role}</h3>
                <span className="text-xs" style={{ color: secondaryColor }}>
                  {exp.startDate} - {exp.endDate || "Present"}
                </span>
              </div>
              <div
                className={`${textSize} mb-2 font-semibold`}
                style={{ color: secondaryColor }}
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
            className={`${headingSize} mb-3 font-serif font-bold uppercase`}
            style={{ color: primaryColor }}
          >
            Education
          </h2>
          {resume.education.map((edu, idx) => (
            <div key={idx} className="mb-3">
              <div className="flex items-baseline justify-between">
                <h3 className={`${textSize} font-bold`}>{edu.degree}</h3>
                <span className="text-xs" style={{ color: secondaryColor }}>
                  {edu.startDate} - {edu.endDate || "Present"}
                </span>
              </div>
              <div className={`${textSize}`} style={{ color: secondaryColor }}>
                {edu.institution}
                {edu.field && ` • ${edu.field}`}
              </div>
              {edu.gpa && <div className="text-xs">GPA: {edu.gpa}</div>}
            </div>
          ))}
        </section>
      )}

      {/* Skills */}
      {resume.skills && resume.skills.length > 0 && (
        <section className="mb-6">
          <h2
            className={`${headingSize} mb-3 font-serif font-bold uppercase`}
            style={{ color: primaryColor }}
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
            className={`${headingSize} mb-3 font-serif font-bold uppercase`}
            style={{ color: primaryColor }}
          >
            Key Projects
          </h2>
          {resume.projects.map((project, idx) => (
            <div key={idx} className="mb-3">
              <h3 className={`${textSize} font-bold`}>{project.name}</h3>
              <p className={`${textSize} mt-1`}>{project.description}</p>
              {project.technologies && project.technologies.length > 0 && (
                <div className="mt-1 text-xs" style={{ color: secondaryColor }}>
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
            className={`${headingSize} mb-3 font-serif font-bold uppercase`}
            style={{ color: primaryColor }}
          >
            Certifications
          </h2>
          {resume.certifications.map((cert, idx) => (
            <div key={idx} className="mb-2">
              <span className={`${textSize} font-semibold`}>{cert.name}</span>
              <span className="mx-2 text-xs">•</span>
              <span className="text-xs" style={{ color: secondaryColor }}>
                {cert.issuer} • {cert.date}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};
