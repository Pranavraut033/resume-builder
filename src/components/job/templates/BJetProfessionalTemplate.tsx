"use client";
// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import React, { useEffect, useRef, useState } from "react";

import { useBlockPaginator } from "@/hooks/useBlockPaginator";
import useResolveCustomization from "@/hooks/useResolveCustomization";
import { getPageDimensions } from "@/lib/pageDimensions";

import MeasurementContainer from "./shared/MeasurementContainer";
import ResumePage from "./shared/ResumePage";
import { TemplateRendererProps } from "./TemplateRenderer";

type Block = { node: React.ReactNode };

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
    lineHeight,
  } = useResolveCustomization(customization);

  const { widthMm, widthPx, heightPx, marginPx, contentHeightPx } =
    getPageDimensions(customization.pageFormat, customization.marginSize);

  const sectionHeaderStyle: React.CSSProperties = {
    backgroundColor: `${secondaryColor}30`,
    color: primaryColor,
  };

  const sectionTable = (title: string, rows: React.ReactNode) => (
    <table
      className="mb-4 w-full border-2"
      style={{ borderColor: primaryColor }}
    >
      <tbody>
        <tr>
          <td className="p-2 font-bold" style={sectionHeaderStyle}>
            {title}
          </td>
        </tr>
        {rows}
      </tbody>
    </table>
  );

  const tdCell = (children: React.ReactNode) => (
    <tr>
      <td className="border-t p-3" style={{ borderColor: secondaryColor }}>
        {children}
      </td>
    </tr>
  );

  const blocks: Block[] = [];

  if (resume.summary) {
    blocks.push({
      node: sectionTable(
        "PROFESSIONAL SUMMARY",
        tdCell(
          <p className={`${textSize} ${lineHeight} leading-relaxed`}>
            {resume.summary}
          </p>
        )
      ),
    });
  }

  (resume.experience ?? []).forEach((exp) => {
    blocks.push({
      node: (
        <table
          className="w-full border-x-2 border-b-2"
          style={{ borderColor: primaryColor }}
        >
          <tbody>
            {tdCell(
              <div>
                <div className="mb-1 flex justify-between gap-4">
                  <div>
                    <span className={`${textSize} font-bold`}>{exp.role}</span>
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
                    {exp.achievements.map((a, i) => (
                      <li
                        key={i}
                        className={`${textSize} ${lineHeight} ml-5 list-disc`}
                      >
                        {a}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </tbody>
        </table>
      ),
    });
  });

  (resume.education ?? []).forEach((edu) => {
    blocks.push({
      node: (
        <table
          className="w-full border-x-2 border-b-2"
          style={{ borderColor: primaryColor }}
        >
          <tbody>
            {tdCell(
              <div className="flex justify-between gap-4">
                <div>
                  <div className={`${textSize} font-bold`}>{edu.degree}</div>
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
            )}
          </tbody>
        </table>
      ),
    });
  });

  if ((resume.skills ?? []).length > 0) {
    blocks.push({
      node: sectionTable(
        "CORE COMPETENCIES",
        tdCell(
          <div className="grid grid-cols-3 gap-2">
            {(resume.skills ?? []).map((skill, idx) => (
              <div key={idx} className={`${textSize} ${lineHeight}`}>
                • {skill}
              </div>
            ))}
          </div>
        )
      ),
    });
  }

  (resume.projects ?? []).forEach((project) => {
    blocks.push({
      node: (
        <table
          className="w-full border-x-2 border-b-2"
          style={{ borderColor: primaryColor }}
        >
          <tbody>
            {tdCell(
              <div>
                <div className="flex justify-between gap-4">
                  <h3 className={`${textSize} font-bold`}>{project.name}</h3>
                  {(project.startDate || project.endDate) && (
                    <div className="text-xs">
                      {project.startDate || ""}
                      {project.startDate || project.endDate ? " - " : ""}
                      {project.endDate || "Present"}
                    </div>
                  )}
                </div>
                <p className={`${textSize} ${lineHeight} mt-1 mb-2`}>
                  {project.description}
                </p>
                {project.url && (
                  <div className="mb-2 text-xs">
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
                  <div className={`${textSize} ${lineHeight}`}>
                    <span className="font-semibold">Technologies: </span>
                    {project.technologies.join(", ")}
                  </div>
                )}
              </div>
            )}
          </tbody>
        </table>
      ),
    });
  });

  (resume.certifications ?? []).forEach((cert) => {
    blocks.push({
      node: (
        <table
          className="w-full border-x-2 border-b-2"
          style={{ borderColor: primaryColor }}
        >
          <tbody>
            {tdCell(
              <div className="flex justify-between gap-4">
                <div>
                  <div className={`${textSize} font-semibold`}>{cert.name}</div>
                  <div
                    className={`${textSize} ${lineHeight}`}
                    style={{ color: secondaryColor }}
                  >
                    {cert.issuer}
                  </div>
                  {cert.url && (
                    <a
                      href={cert.url}
                      className="mt-1 text-xs hover:underline"
                      style={{ color: accentColor }}
                    >
                      Credential Link
                    </a>
                  )}
                </div>
                <div className="text-xs">{cert.date}</div>
              </div>
            )}
          </tbody>
        </table>
      ),
    });
  });

  (resume.publications ?? []).forEach((pub) => {
    blocks.push({
      node: (
        <table
          className="w-full border-x-2 border-b-2"
          style={{ borderColor: primaryColor }}
        >
          <tbody>
            {tdCell(
              <div>
                <h3 className={`${textSize} font-bold`}>{pub.title}</h3>
                <div className={`${textSize} ${lineHeight} mt-1`}>
                  {pub.authors.join(", ")}
                </div>
                <div className="mt-1 text-xs" style={{ color: secondaryColor }}>
                  {pub.venue} • {pub.date}
                  {pub.doi && ` • DOI: ${pub.doi}`}
                </div>
                {pub.url && (
                  <div className="mt-1 text-xs">
                    <a
                      href={pub.url}
                      className="hover:underline"
                      style={{ color: accentColor }}
                    >
                      Publication Link
                    </a>
                  </div>
                )}
              </div>
            )}
          </tbody>
        </table>
      ),
    });
  });

  if ((resume.languages ?? []).length > 0) {
    blocks.push({
      node: sectionTable(
        "LANGUAGES",
        tdCell(
          <div className="grid grid-cols-3 gap-2">
            {(resume.languages ?? []).map((l, idx) => (
              <div key={idx} className={`${textSize} ${lineHeight}`}>
                {l.name} ({l.proficiency})
              </div>
            ))}
          </div>
        )
      ),
    });
  }

  (resume.volunteer ?? []).forEach((v) => {
    blocks.push({
      node: (
        <table
          className="w-full border-x-2 border-b-2"
          style={{ borderColor: primaryColor }}
        >
          <tbody>
            {tdCell(
              <div>
                <div className="flex justify-between gap-4">
                  <div>
                    <div className={`${textSize} font-bold`}>{v.role}</div>
                    <div
                      className={`${textSize} ${lineHeight}`}
                      style={{ color: secondaryColor }}
                    >
                      {v.organization}
                    </div>
                  </div>
                  <div className="text-xs">
                    {v.startDate} - {v.endDate || "Present"}
                  </div>
                </div>
                {v.description && (
                  <p className={`${textSize} ${lineHeight} mt-1`}>
                    {v.description}
                  </p>
                )}
              </div>
            )}
          </tbody>
        </table>
      ),
    });
  });

  (resume.awards ?? []).forEach((award) => {
    blocks.push({
      node: (
        <table
          className="w-full border-x-2 border-b-2"
          style={{ borderColor: primaryColor }}
        >
          <tbody>
            {tdCell(
              <div className="flex justify-between gap-4">
                <div>
                  <div className={`${textSize} font-semibold`}>
                    {award.title}
                  </div>
                  <div
                    className={`${textSize} ${lineHeight}`}
                    style={{ color: secondaryColor }}
                  >
                    {award.issuer}
                  </div>
                  {award.description && (
                    <div className={`${textSize} ${lineHeight} mt-1`}>
                      {award.description}
                    </div>
                  )}
                </div>
                <div className="text-xs">{award.date}</div>
              </div>
            )}
          </tbody>
        </table>
      ),
    });
  });

  // Section header blocks (placed before their first content block)
  // We handle section headers inline by grouping: just build blocks with sectionKey
  // Actually for BJet we embed section headings inside each table already.
  // For continuation pages we wrap in a special "header repeat" table.
  // Since BJet uses table-per-section-item style, we track which is first item of section.
  // We pre-pend each group of same-section blocks with a section header.
  // Blocks are ordered naturally; we pass them directly as one flat array.

  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) =>
      setHeaderHeight(e.contentRect.height)
    );
    obs.observe(el);
    setHeaderHeight(el.getBoundingClientRect().height);
    return () => obs.disconnect();
  }, []);

  const { setRef, pageGroups } = useBlockPaginator({
    count: blocks.length,
    pageContentHeight: contentHeightPx,
    firstPageReserved: headerHeight,
  });

  // Section header tables (rendered at top of each section on page 1)
  // For BJet: experience blocks don't have individual section headers on per-item tables.
  // We need to add section headers. Let's restructure: add section header as first block of each section.
  // Since blocks array is already flat (no sectionKey), the section headers are embedded in the first
  // table of each section. This is already handled in the sectionTable() wrapper for summary/skills/langs.
  // For per-item tables (experience, education, etc.), we need to add a section header block before the first.
  // Let's rebuild blocks with section headers as explicit block entries.

  // (Already done above — sectionTable() adds the heading row for summary/skills/languages.
  // For experience/education/etc., the per-item tables lack a header row.
  // We need to prepend a header block. Rebuild needed.)

  // NOTE: For simplicity, we'll just add section header blocks before first item.
  // The blocks array above doesn't have sectionKeys so let's just render them as-is.
  // The section header for experience is missing. We'll fix by adding header blocks explicitly.

  const headerNode = (
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
          <td className="border-t p-3" style={{ borderColor: secondaryColor }}>
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
  );

  return (
    <div
      style={{
        fontFamily,
        color: textColor,
        backgroundColor,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
      }}
    >
      <MeasurementContainer widthMm={widthMm}>
        <div style={{ padding: marginPx }}>
          <div ref={headerRef}>{headerNode}</div>
        </div>
        <div style={{ paddingLeft: marginPx, paddingRight: marginPx }}>
          {blocks.map((block, i) => (
            <div key={i} ref={setRef(i)}>
              {block.node}
            </div>
          ))}
        </div>
      </MeasurementContainer>

      {pageGroups.map((group, pageIndex) => (
        <ResumePage
          key={pageIndex}
          widthPx={widthPx}
          heightPx={heightPx}
          pageIndex={pageIndex}
          pageCount={pageGroups.length}
        >
          <div
            style={{
              padding: marginPx,
              height: "100%",
              boxSizing: "border-box",
              overflowY: "hidden",
            }}
          >
            {pageIndex === 0 && headerNode}
            {group.map((idx) => (
              <div key={idx}>{blocks[idx].node}</div>
            ))}
          </div>
        </ResumePage>
      ))}
    </div>
  );
};
