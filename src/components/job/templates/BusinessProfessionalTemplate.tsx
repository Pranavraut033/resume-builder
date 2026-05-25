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
    today: _today,
    marginClass,
    lineHeight,
    headingSize,
  } = useResolveCustomization(customization);

  const pageFormatClass =
    customization.pageFormat === "letter"
      ? "min-h-[11in] w-[8.5in]"
      : "min-h-264 w-204";

  return (
    <div
      className={`resume-content mx-auto bg-white shadow-lg ${marginClass} ${pageFormatClass}`}
      style={{
        fontFamily,
        color: textColor,
        backgroundColor,
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
        {resume.header.headline && (
          <div
            className={`${textSize} mb-2 font-medium`}
            style={{ color: accentColor }}
          >
            {resume.header.headline}
          </div>
        )}
        <div
          className={`${textSize} ${lineHeight} space-y-1`}
          style={{ color: secondaryColor }}
        >
          <div className="flex flex-wrap justify-center gap-3">
            {resume.header.email && <span>{resume.header.email}</span>}
            {resume.header.phone && resume.header.email && <span>•</span>}
            {resume.header.phone && <span>{resume.header.phone}</span>}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {resume.header.location && <span>{resume.header.location}</span>}
            {resume.header.linkedin &&
              (resume.header.location ||
                resume.header.github ||
                resume.header.website) && <span>•</span>}
            {resume.header.linkedin && (
              <a
                href={resume.header.linkedin}
                className="hover:underline"
                style={{ color: accentColor }}
              >
                LinkedIn
              </a>
            )}
            {resume.header.github &&
              (resume.header.location || resume.header.linkedin) && (
                <span>•</span>
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
            {resume.header.website &&
              (resume.header.location ||
                resume.header.linkedin ||
                resume.header.github) && <span>•</span>}
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

      {/* Professional Summary */}
      {resume.summary && (
        <section className="mb-6">
          <h2
            className={`${headingSize} mb-2 font-serif font-bold uppercase`}
            style={{ color: primaryColor }}
          >
            Professional Summary
          </h2>
          <p
            className={`${textSize} ${lineHeight} text-justify leading-relaxed`}
          >
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
              <div className="mb-1 flex items-baseline justify-between gap-4">
                <h3 className={`${textSize} font-bold`}>{exp.role}</h3>
                <span className="text-xs" style={{ color: secondaryColor }}>
                  {exp.startDate} - {exp.endDate || "Present"}
                </span>
              </div>
              <div
                className={`${textSize} ${lineHeight} mb-2 font-semibold`}
                style={{ color: secondaryColor }}
              >
                {exp.company}
              </div>
              {exp.description && (
                <p className={`${textSize} ${lineHeight} mb-2`}>
                  {exp.description}
                </p>
              )}
              {exp.achievements && exp.achievements.length > 0 && (
                <ul className="space-y-1">
                  {exp.achievements.map((achievement, achIdx) => (
                    <li
                      key={achIdx}
                      className={`${textSize} ${lineHeight} ml-5 list-disc`}
                    >
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
              <div className="flex items-baseline justify-between gap-4">
                <h3 className={`${textSize} font-bold`}>{edu.degree}</h3>
                <span className="text-xs" style={{ color: secondaryColor }}>
                  {edu.startDate} - {edu.endDate || "Present"}
                </span>
              </div>
              <div
                className={`${textSize} ${lineHeight}`}
                style={{ color: secondaryColor }}
              >
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
              <span key={idx} className={`${textSize} ${lineHeight}`}>
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
              <div className="flex items-baseline justify-between gap-4">
                <h3 className={`${textSize} font-bold`}>{project.name}</h3>
                {(project.startDate || project.endDate) && (
                  <span className="text-xs" style={{ color: secondaryColor }}>
                    {project.startDate || ""}
                    {project.startDate || project.endDate ? " - " : ""}
                    {project.endDate || "Present"}
                  </span>
                )}
              </div>
              <p className={`${textSize} ${lineHeight} mt-1`}>
                {project.description}
              </p>
              {project.technologies && project.technologies.length > 0 && (
                <div className="mt-1 text-xs" style={{ color: secondaryColor }}>
                  Technologies: {project.technologies.join(", ")}
                </div>
              )}
              {project.url && (
                <div className="mt-1 text-xs">
                  <a
                    href={project.url}
                    className="hover:underline"
                    style={{ color: accentColor }}
                  >
                    Project Link
                  </a>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Certifications */}
      {resume.certifications && resume.certifications.length > 0 && (
        <section className="mb-6">
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
              {cert.url && (
                <div className="mt-1 text-xs">
                  <a
                    href={cert.url}
                    className="hover:underline"
                    style={{ color: accentColor }}
                  >
                    Credential Link
                  </a>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Publications */}
      {resume.publications && resume.publications.length > 0 && (
        <section className="mb-6">
          <h2
            className={`${headingSize} mb-3 font-serif font-bold uppercase`}
            style={{ color: primaryColor }}
          >
            Publications
          </h2>
          {resume.publications.map((publication, idx) => (
            <div key={idx} className="mb-3">
              <h3 className={`${textSize} font-bold`}>{publication.title}</h3>
              <div className={`${textSize} ${lineHeight} mt-1`}>
                {publication.authors.join(", ")}
              </div>
              <div className="mt-1 text-xs" style={{ color: secondaryColor }}>
                {publication.venue} • {publication.date}
                {publication.doi && ` • DOI: ${publication.doi}`}
              </div>
              {publication.url && (
                <div className="mt-1 text-xs">
                  <a
                    href={publication.url}
                    className="hover:underline"
                    style={{ color: accentColor }}
                  >
                    Publication Link
                  </a>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Languages */}
      {resume.languages && resume.languages.length > 0 && (
        <section className="mb-6">
          <h2
            className={`${headingSize} mb-3 font-serif font-bold uppercase`}
            style={{ color: primaryColor }}
          >
            Languages
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {resume.languages.map((language, idx) => (
              <span key={idx} className={`${textSize} ${lineHeight}`}>
                • {language.name} ({language.proficiency})
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Volunteer */}
      {resume.volunteer && resume.volunteer.length > 0 && (
        <section className="mb-6">
          <h2
            className={`${headingSize} mb-3 font-serif font-bold uppercase`}
            style={{ color: primaryColor }}
          >
            Volunteer Experience
          </h2>
          {resume.volunteer.map((item, idx) => (
            <div key={idx} className="mb-4">
              <div className="mb-1 flex items-baseline justify-between gap-4">
                <h3 className={`${textSize} font-bold`}>{item.role}</h3>
                <span className="text-xs" style={{ color: secondaryColor }}>
                  {item.startDate} - {item.endDate || "Present"}
                </span>
              </div>
              <div
                className={`${textSize} ${lineHeight} mb-2 font-semibold`}
                style={{ color: secondaryColor }}
              >
                {item.organization}
              </div>
              {item.description && (
                <p className={`${textSize} ${lineHeight}`}>
                  {item.description}
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Awards */}
      {resume.awards && resume.awards.length > 0 && (
        <section>
          <h2
            className={`${headingSize} mb-3 font-serif font-bold uppercase`}
            style={{ color: primaryColor }}
          >
            Awards
          </h2>
          {resume.awards.map((award, idx) => (
            <div key={idx} className="mb-2">
              <span className={`${textSize} font-semibold`}>{award.title}</span>
              <span className="mx-2 text-xs">•</span>
              <span className="text-xs" style={{ color: secondaryColor }}>
                {award.issuer} • {award.date}
              </span>
              {award.description && (
                <div className={`${textSize} ${lineHeight} mt-1`}>
                  {award.description}
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
};
