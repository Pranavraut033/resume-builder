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
    today,
    marginClass,
    lineHeight,
  } = useResolveCustomization(customization);

  return (
    <div
      className="resume-content mx-auto min-h-264 w-204 bg-white p-10 shadow-lg"
      style={{
        fontFamily: fontFamily,
        color: textColor,
        backgroundColor: backgroundColor,
      }}
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
            </td>
          </tr>
          <tr>
            <td
              className="border-t p-3"
              style={{ borderColor: secondaryColor }}
            >
              <div className={`${textSize} space-y-1`}>
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
                <div className="flex gap-4">
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
              <td
                className="p-2 font-bold"
                style={{
                  backgroundColor: secondaryColor + "30",
                  color: primaryColor,
                }}
              >
                PROFESSIONAL SUMMARY
              </td>
            </tr>
            <tr>
              <td
                className="border-t p-3"
                style={{ borderColor: secondaryColor }}
              >
                <p className={`${textSize} leading-relaxed`}>
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
              <td
                className="p-2 font-bold"
                style={{
                  backgroundColor: secondaryColor + "30",
                  color: primaryColor,
                }}
              >
                PROFESSIONAL EXPERIENCE
              </td>
            </tr>
            {resume.experience.map((exp, idx) => (
              <tr key={idx}>
                <td
                  className="border-t p-3"
                  style={{ borderColor: secondaryColor }}
                >
                  <div className="mb-1 flex justify-between">
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
                    <p className={`${textSize} mb-2`}>{exp.description}</p>
                  )}
                  {exp.achievements && exp.achievements.length > 0 && (
                    <ul className="space-y-1">
                      {exp.achievements.map((achievement, achIdx) => (
                        <li
                          key={achIdx}
                          className={`${textSize} ml-5 list-disc`}
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
              <td
                className="p-2 font-bold"
                style={{
                  backgroundColor: secondaryColor + "30",
                  color: primaryColor,
                }}
              >
                EDUCATION
              </td>
            </tr>
            {resume.education.map((edu, idx) => (
              <tr key={idx}>
                <td
                  className="border-t p-3"
                  style={{ borderColor: secondaryColor }}
                >
                  <div className="flex justify-between">
                    <div>
                      <div className={`${textSize} font-bold`}>
                        {edu.degree}
                      </div>
                      <div
                        className={`${textSize}`}
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
              <td
                className="p-2 font-bold"
                style={{
                  backgroundColor: secondaryColor + "30",
                  color: primaryColor,
                }}
              >
                CORE COMPETENCIES
              </td>
            </tr>
            <tr>
              <td
                className="border-t p-3"
                style={{ borderColor: secondaryColor }}
              >
                <div className="grid grid-cols-3 gap-2">
                  {resume.skills.map((skill, idx) => (
                    <div key={idx} className={`${textSize}`}>
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
              <td
                className="p-2 font-bold"
                style={{
                  backgroundColor: secondaryColor + "30",
                  color: primaryColor,
                }}
              >
                KEY PROJECTS
              </td>
            </tr>
            {resume.projects.map((project, idx) => (
              <tr key={idx}>
                <td
                  className="border-t p-3"
                  style={{ borderColor: secondaryColor }}
                >
                  <div className={`${textSize} mb-1 font-bold`}>
                    {project.name}
                  </div>
                  <p className={`${textSize} mb-1`}>{project.description}</p>
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="text-xs" style={{ color: secondaryColor }}>
                      <span className="font-semibold">Technologies:</span>{" "}
                      {project.technologies.join(", ")}
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
          className="w-full border-2"
          style={{ borderColor: primaryColor }}
        >
          <tbody>
            <tr>
              <td
                className="p-2 font-bold"
                style={{
                  backgroundColor: secondaryColor + "30",
                  color: primaryColor,
                }}
              >
                CERTIFICATIONS
              </td>
            </tr>
            {resume.certifications.map((cert, idx) => (
              <tr key={idx}>
                <td
                  className="border-t p-3"
                  style={{ borderColor: secondaryColor }}
                >
                  <div className="flex justify-between">
                    <span className={`${textSize} font-semibold`}>
                      {cert.name}
                    </span>
                    <span className="text-xs" style={{ color: secondaryColor }}>
                      {cert.issuer} • {cert.date}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
