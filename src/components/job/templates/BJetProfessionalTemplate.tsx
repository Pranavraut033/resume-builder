// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import React from "react";

import useResolveCustomization from "@/hooks/useResolveCustomization";

import { TemplateRendererProps } from "./TemplateRenderer";

export const BJetProfessionalTemplate: React.FC<TemplateRendererProps> = ({
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
    today: _,
    marginClass,
    lineHeight,
  } = useResolveCustomization(customization);

  const sectionHeaderStyle: React.CSSProperties = {
    backgroundColor: `${secondaryColor}30`,
    color: primaryColor,
  };

  const pageStyle: React.CSSProperties = {
    fontFamily,
    color: textColor,
    backgroundColor,
  };

  const pageFormatClass =
    customization.pageFormat === "letter"
      ? "min-h-[11in] w-[8.5in]"
      : "min-h-264 w-204";

  const headingText = {
    summary: "PROFESSIONAL SUMMARY",
    experience: "PROFESSIONAL EXPERIENCE",
    education: "EDUCATION",
    skills: "CORE COMPETENCIES",
    projects: "KEY PROJECTS",
    certifications: "CERTIFICATIONS",
    publications: "PUBLICATIONS",
    languages: "LANGUAGES",
    volunteer: "VOLUNTEER EXPERIENCE",
    awards: "AWARDS",
  };

  return (
    <div
      className={`resume-content mx-auto bg-white p-10 shadow-lg ${pageFormatClass} ${marginClass}`}
      style={pageStyle}
    >
      {/* Header Table */}
      <table
        className="mb-6 w-full border-2"
        style={{ borderColor: primaryColor }}
      >
        <tbody>
          <tr>
            <td className="p-4" style={{ backgroundColor: primaryColor }}>
              <h1 className="text-2xl font-bold text-white">
                {resume.header.name}
              </h1>
              {resume.header.headline && (
                <div className={`${textSize} mt-1 text-white`}>
                  {resume.header.headline}
                </div>
              )}
            </td>
          </tr>
          <tr>
            <td
              className="border-t p-3"
              style={{ borderColor: secondaryColor }}
            >
              <div className={`${textSize} ${lineHeight} space-y-1`}>
                {resume.header.email && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Email:</span>
                    <span>{resume.header.email}</span>
                  </div>
                )}
                {resume.header.phone && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Phone:</span>
                    <span>{resume.header.phone}</span>
                  </div>
                )}
                {resume.header.location && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Location:</span>
                    <span>{resume.header.location}</span>
                  </div>
                )}
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
            </td>
          </tr>
        </tbody>
      </table>

      {/* Professional Summary Table */}
      {resume.summary && (
        <table
          className="mb-4 w-full border-2"
          style={{ borderColor: primaryColor }}
        >
          <tbody>
            <tr>
              <td className="p-2 font-bold" style={sectionHeaderStyle}>
                {headingText.summary}
              </td>
            </tr>
            <tr>
              <td
                className="border-t p-3"
                style={{ borderColor: secondaryColor }}
              >
                <p className={`${textSize} ${lineHeight} leading-relaxed`}>
                  {resume.summary}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Experience Table */}
      {resume.experience && resume.experience.length > 0 && (
        <table
          className="mb-4 w-full border-2"
          style={{ borderColor: primaryColor }}
        >
          <tbody>
            <tr>
              <td className="p-2 font-bold" style={sectionHeaderStyle}>
                {headingText.experience}
              </td>
            </tr>
            {resume.experience.map((exp, idx) => (
              <tr key={idx}>
                <td
                  className="border-t p-3"
                  style={{ borderColor: secondaryColor }}
                >
                  <div className="mb-1 flex justify-between gap-4">
                    <div>
                      <span className={`${textSize} font-bold`}>
                        {exp.role}
                      </span>
                      <span className="mx-2">•</span>
                      <span
                        className={`${textSize} font-semibold`}
                        style={{ color: secondaryColor }}
                      >
                        {exp.company}
                      </span>
                    </div>
                    <div className="text-xs">
                      {exp.startDate} - {exp.endDate || "Present"}
                    </div>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Education Table */}
      {resume.education && resume.education.length > 0 && (
        <table
          className="mb-4 w-full border-2"
          style={{ borderColor: primaryColor }}
        >
          <tbody>
            <tr>
              <td className="p-2 font-bold" style={sectionHeaderStyle}>
                {headingText.education}
              </td>
            </tr>
            {resume.education.map((edu, idx) => (
              <tr key={idx}>
                <td
                  className="border-t p-3"
                  style={{ borderColor: secondaryColor }}
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <div className={`${textSize} font-bold`}>
                        {edu.degree}
                      </div>
                      <div
                        className={`${textSize} ${lineHeight}`}
                        style={{ color: secondaryColor }}
                      >
                        {edu.institution}
                        {edu.field && ` • ${edu.field}`}
                      </div>
                    </div>
                    <div className="text-xs">
                      {edu.startDate} - {edu.endDate || "Present"}
                      {edu.gpa && ` • GPA: ${edu.gpa}`}
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Skills Table */}
      {resume.skills && resume.skills.length > 0 && (
        <table
          className="mb-4 w-full border-2"
          style={{ borderColor: primaryColor }}
        >
          <tbody>
            <tr>
              <td className="p-2 font-bold" style={sectionHeaderStyle}>
                {headingText.skills}
              </td>
            </tr>
            <tr>
              <td
                className="border-t p-3"
                style={{ borderColor: secondaryColor }}
              >
                <div className="grid grid-cols-3 gap-2">
                  {resume.skills.map((skill, idx) => (
                    <div key={idx} className={`${textSize} ${lineHeight}`}>
                      • {skill}
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Projects Table */}
      {resume.projects && resume.projects.length > 0 && (
        <table
          className="mb-4 w-full border-2"
          style={{ borderColor: primaryColor }}
        >
          <tbody>
            <tr>
              <td className="p-2 font-bold" style={sectionHeaderStyle}>
                {headingText.projects}
              </td>
            </tr>
            {resume.projects.map((project, idx) => (
              <tr key={idx}>
                <td
                  className="border-t p-3"
                  style={{ borderColor: secondaryColor }}
                >
                  <div className="mb-1 flex justify-between gap-4">
                    <div className={`${textSize} font-bold`}>
                      {project.name}
                    </div>
                    {(project.startDate || project.endDate) && (
                      <div className="text-xs">
                        {project.startDate || ""}
                        {project.startDate || project.endDate ? " - " : ""}
                        {project.endDate || "Present"}
                      </div>
                    )}
                  </div>
                  <p className={`${textSize} ${lineHeight} mb-1`}>
                    {project.description}
                  </p>
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="text-xs" style={{ color: secondaryColor }}>
                      <span className="font-semibold">Technologies:</span>{" "}
                      {project.technologies.join(", ")}
                    </div>
                  )}
                  {project.url && (
                    <div className="text-xs">
                      <a
                        href={project.url}
                        className="hover:underline"
                        style={{ color: accentColor }}
                      >
                        Project Link
                      </a>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Certifications Table */}
      {resume.certifications && resume.certifications.length > 0 && (
        <table
          className="mb-4 w-full border-2"
          style={{ borderColor: primaryColor }}
        >
          <tbody>
            <tr>
              <td className="p-2 font-bold" style={sectionHeaderStyle}>
                {headingText.certifications}
              </td>
            </tr>
            {resume.certifications.map((cert, idx) => (
              <tr key={idx}>
                <td
                  className="border-t p-3"
                  style={{ borderColor: secondaryColor }}
                >
                  <div className="flex justify-between gap-4">
                    <span className={`${textSize} font-semibold`}>
                      {cert.name}
                    </span>
                    <span className="text-xs" style={{ color: secondaryColor }}>
                      {cert.issuer} • {cert.date}
                    </span>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Publications Table */}
      {resume.publications && resume.publications.length > 0 && (
        <table
          className="mb-4 w-full border-2"
          style={{ borderColor: primaryColor }}
        >
          <tbody>
            <tr>
              <td className="p-2 font-bold" style={sectionHeaderStyle}>
                {headingText.publications}
              </td>
            </tr>
            {resume.publications.map((publication, idx) => (
              <tr key={idx}>
                <td
                  className="border-t p-3"
                  style={{ borderColor: secondaryColor }}
                >
                  <div className={`${textSize} font-bold`}>
                    {publication.title}
                  </div>
                  <div className={`${textSize} ${lineHeight} mb-1`}>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Languages Table */}
      {resume.languages && resume.languages.length > 0 && (
        <table
          className="mb-4 w-full border-2"
          style={{ borderColor: primaryColor }}
        >
          <tbody>
            <tr>
              <td className="p-2 font-bold" style={sectionHeaderStyle}>
                {headingText.languages}
              </td>
            </tr>
            {resume.languages.map((language, idx) => (
              <tr key={idx}>
                <td
                  className="border-t p-3"
                  style={{ borderColor: secondaryColor }}
                >
                  <div className="flex justify-between gap-4">
                    <span className={`${textSize} font-semibold`}>
                      {language.name}
                    </span>
                    <span className="text-xs" style={{ color: secondaryColor }}>
                      {language.proficiency}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Volunteer Table */}
      {resume.volunteer && resume.volunteer.length > 0 && (
        <table
          className="mb-4 w-full border-2"
          style={{ borderColor: primaryColor }}
        >
          <tbody>
            <tr>
              <td className="p-2 font-bold" style={sectionHeaderStyle}>
                {headingText.volunteer}
              </td>
            </tr>
            {resume.volunteer.map((item, idx) => (
              <tr key={idx}>
                <td
                  className="border-t p-3"
                  style={{ borderColor: secondaryColor }}
                >
                  <div className="mb-1 flex justify-between gap-4">
                    <div>
                      <span className={`${textSize} font-bold`}>
                        {item.role}
                      </span>
                      <span className="mx-2">•</span>
                      <span
                        className={`${textSize} font-semibold`}
                        style={{ color: secondaryColor }}
                      >
                        {item.organization}
                      </span>
                    </div>
                    <div className="text-xs">
                      {item.startDate} - {item.endDate || "Present"}
                    </div>
                  </div>
                  {item.description && (
                    <p className={`${textSize} ${lineHeight}`}>
                      {item.description}
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Awards Table */}
      {resume.awards && resume.awards.length > 0 && (
        <table
          className="w-full border-2"
          style={{ borderColor: primaryColor }}
        >
          <tbody>
            <tr>
              <td className="p-2 font-bold" style={sectionHeaderStyle}>
                {headingText.awards}
              </td>
            </tr>
            {resume.awards.map((award, idx) => (
              <tr key={idx}>
                <td
                  className="border-t p-3"
                  style={{ borderColor: secondaryColor }}
                >
                  <div className="flex justify-between gap-4">
                    <span className={`${textSize} font-semibold`}>
                      {award.title}
                    </span>
                    <span className="text-xs" style={{ color: secondaryColor }}>
                      {award.issuer} • {award.date}
                    </span>
                  </div>
                  {award.description && (
                    <p className={`${textSize} ${lineHeight} mt-1`}>
                      {award.description}
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
