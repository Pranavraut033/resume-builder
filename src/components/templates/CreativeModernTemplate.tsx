// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import React from "react";

import useResolveCustomization from "@/hooks/useResolveCustomization";

import { TemplateRendererProps } from "./TemplateRenderer";

export const CreativeModernTemplate: React.FC<TemplateRendererProps> = ({
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
      {/* Header with Bold Accent */}
      <header
        className="p-8"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`,
        }}
      >
        <h1 className="mb-2 text-4xl font-bold text-white">
          {resume.header.name}
        </h1>
        <div className="flex flex-wrap gap-4 text-sm text-white opacity-95">
          {resume.header.email && <span>✉ {resume.header.email}</span>}
          {resume.header.phone && <span>📞 {resume.header.phone}</span>}
          {resume.header.location && <span>📍 {resume.header.location}</span>}
          {resume.header.linkedin && <span>🔗 LinkedIn</span>}
          {resume.header.github && <span>💻 GitHub</span>}
        </div>
      </header>

      <div className="flex">
        {/* Left Column - 40% */}
        <div
          className="w-[40%] space-y-6 p-6"
          style={{ backgroundColor: secondaryColor + "08" }}
        >
          {/* Professional Summary */}
          {resume.summary && (
            <section>
              <h2
                className={`${headingSize} mb-3 border-b-2 pb-2 font-bold`}
                style={{ color: primaryColor, borderColor: accentColor }}
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
                className={`${headingSize} mb-3 border-b-2 pb-2 font-bold`}
                style={{ color: primaryColor, borderColor: accentColor }}
              >
                SKILLS
              </h2>
              <div className="space-y-2">
                {resume.skills.map((skill, idx) => (
                  <div key={idx} className="flex items-center">
                    <div
                      className="mr-2 h-2 w-2 rounded-full"
                      style={{ backgroundColor: accentColor }}
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
                className={`${headingSize} mb-3 border-b-2 pb-2 font-bold`}
                style={{ color: primaryColor, borderColor: accentColor }}
              >
                EDUCATION
              </h2>
              {resume.education.map((edu, idx) => (
                <div key={idx} className="mb-4">
                  <h3 className={`${textSize} font-bold`}>{edu.degree}</h3>
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
                className={`${headingSize} mb-3 border-b-2 pb-2 font-bold`}
                style={{ color: primaryColor, borderColor: accentColor }}
              >
                CERTIFICATIONS
              </h2>
              {resume.certifications.map((cert, idx) => (
                <div key={idx} className="mb-3">
                  <div className={`${textSize} font-semibold`}>{cert.name}</div>
                  <div className="text-xs" style={{ color: secondaryColor }}>
                    {cert.issuer}
                  </div>
                  <div className="text-xs">{cert.date}</div>
                </div>
              ))}
            </section>
          )}
        </div>

        {/* Right Column - 60% */}
        <div className="w-[60%] space-y-6 p-6">
          {/* Experience */}
          {resume.experience && resume.experience.length > 0 && (
            <section>
              <h2
                className={`${headingSize} mb-4 border-b-2 pb-2 font-bold`}
                style={{ color: primaryColor, borderColor: accentColor }}
              >
                EXPERIENCE
              </h2>
              {resume.experience.map((exp, idx) => (
                <div key={idx} className="relative mb-5 pl-6">
                  <div
                    className="absolute top-1 left-0 h-3 w-3 rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />
                  <div className="mb-1 flex items-start justify-between">
                    <h3 className={`${textSize} font-bold`}>{exp.role}</h3>
                    <span className="ml-2 text-xs whitespace-nowrap">
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
                className={`${headingSize} mb-4 border-b-2 pb-2 font-bold`}
                style={{ color: primaryColor, borderColor: accentColor }}
              >
                PROJECTS
              </h2>
              {resume.projects.map((project, idx) => (
                <div key={idx} className="relative mb-4 pl-6">
                  <div
                    className="absolute top-1 left-0 h-3 w-3 rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />
                  <h3 className={`${textSize} font-bold`}>{project.name}</h3>
                  <p className={`${textSize} mt-1 mb-2`}>
                    {project.description}
                  </p>
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.technologies.map((tech, techIdx) => (
                        <span
                          key={techIdx}
                          className="rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: accentColor,
                            color: backgroundColor,
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
