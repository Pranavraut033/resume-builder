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
    today: _today,
    marginClass: _,
    lineHeight,
    headingSize,
  } = useResolveCustomization(customization);

  const pageFormatClass =
    customization.pageFormat === "letter"
      ? "min-h-[11in] w-[8.5in]"
      : "min-h-264 w-204";

  return (
    <div
      className={`${pageFormatClass}`}
      style={{
        fontFamily,
        color: textColor,
        backgroundColor,
      }}
    >
      {/* Header */}
      <div className="p-8 pb-4" style={{ backgroundColor: primaryColor }}>
        <h1 className="mb-1 text-3xl font-bold text-white">
          {resume.header.name}
        </h1>
        {resume.header.headline && (
          <div
            className={`${textSize} ${lineHeight} mb-2 text-white opacity-90`}
          >
            {resume.header.headline}
          </div>
        )}
        <div
          className={`flex flex-wrap gap-3 text-xs text-white opacity-90 ${lineHeight}`}
        >
          {resume.header.email && <span>✉ {resume.header.email}</span>}
          {resume.header.phone && <span>📞 {resume.header.phone}</span>}
          {resume.header.location && <span>📍 {resume.header.location}</span>}
          {resume.header.linkedin && (
            <a href={resume.header.linkedin} className="hover:underline">
              🔗 LinkedIn
            </a>
          )}
          {resume.header.github && (
            <a href={resume.header.github} className="hover:underline">
              💻 GitHub
            </a>
          )}
          {resume.header.website && (
            <a href={resume.header.website} className="hover:underline">
              🌐 Website
            </a>
          )}
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
                  <div
                    key={idx}
                    className={`${textSize} ${lineHeight} flex items-center`}
                  >
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
                    className={`${textSize} ${lineHeight}`}
                    style={{ color: secondaryColor }}
                  >
                    {edu.institution}
                    {edu.field && ` • ${edu.field}`}
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

          {/* Languages */}
          {resume.languages && resume.languages.length > 0 && (
            <section>
              <h2
                className={`${headingSize} mb-3 font-bold`}
                style={{ color: primaryColor }}
              >
                LANGUAGES
              </h2>
              {resume.languages.map((language, idx) => (
                <div
                  key={idx}
                  className={`${textSize} ${lineHeight} mb-2 flex items-center justify-between gap-2`}
                >
                  <span>{language.name}</span>
                  <span className="text-xs" style={{ color: secondaryColor }}>
                    {language.proficiency}
                  </span>
                </div>
              ))}
            </section>
          )}

          {/* Awards */}
          {resume.awards && resume.awards.length > 0 && (
            <section>
              <h2
                className={`${headingSize} mb-3 font-bold`}
                style={{ color: primaryColor }}
              >
                AWARDS
              </h2>
              {resume.awards.map((award, idx) => (
                <div key={idx} className="mb-3">
                  <div className={`${textSize} font-semibold`}>
                    {award.title}
                  </div>
                  <div className="text-xs" style={{ color: secondaryColor }}>
                    {award.issuer} • {award.date}
                  </div>
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
              <p className={`${textSize} ${lineHeight} leading-relaxed`}>
                {resume.summary}
              </p>
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
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className={`${textSize} font-bold`}>{exp.role}</h3>
                      <div
                        className={`${textSize} ${lineHeight}`}
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
                    <p className={`${textSize} ${lineHeight} mt-1`}>
                      {exp.description}
                    </p>
                  )}
                  {exp.achievements && exp.achievements.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {exp.achievements.map((achievement, achIdx) => (
                        <li
                          key={achIdx}
                          className={`${textSize} ${lineHeight} ml-4`}
                        >
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
                  <div className="flex items-start justify-between gap-4">
                    <h3 className={`${textSize} font-bold`}>{project.name}</h3>
                    {(project.startDate || project.endDate) && (
                      <div className="text-xs">
                        {project.startDate || ""}
                        {project.startDate || project.endDate ? " - " : ""}
                        {project.endDate || "Present"}
                      </div>
                    )}
                  </div>
                  <p className={`${textSize} ${lineHeight} mt-1`}>
                    {project.description}
                  </p>
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

          {/* Publications */}
          {resume.publications && resume.publications.length > 0 && (
            <section>
              <h2
                className={`${headingSize} mb-3 border-b-2 pb-1 font-bold`}
                style={{ color: primaryColor, borderColor: primaryColor }}
              >
                PUBLICATIONS
              </h2>
              {resume.publications.map((publication, idx) => (
                <div key={idx} className="mb-3">
                  <h3 className={`${textSize} font-bold`}>
                    {publication.title}
                  </h3>
                  <div className={`${textSize} ${lineHeight} mt-1`}>
                    {publication.authors.join(", ")}
                  </div>
                  <div className="text-xs" style={{ color: secondaryColor }}>
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

          {/* Volunteer */}
          {resume.volunteer && resume.volunteer.length > 0 && (
            <section>
              <h2
                className={`${headingSize} mb-3 border-b-2 pb-1 font-bold`}
                style={{ color: primaryColor, borderColor: primaryColor }}
              >
                VOLUNTEER EXPERIENCE
              </h2>
              {resume.volunteer.map((item, idx) => (
                <div key={idx} className="mb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className={`${textSize} font-bold`}>{item.role}</h3>
                      <div
                        className={`${textSize} ${lineHeight}`}
                        style={{ color: secondaryColor }}
                      >
                        {item.organization}
                      </div>
                    </div>
                    <div className="text-xs">
                      {item.startDate} - {item.endDate || "Present"}
                    </div>
                  </div>
                  {item.description && (
                    <p className={`${textSize} ${lineHeight} mt-1`}>
                      {item.description}
                    </p>
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
