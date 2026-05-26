// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

"use client";

import React, { useEffect, useRef, useState } from "react";

import { useBlockPaginator } from "@/hooks/useBlockPaginator";
import useResolveCustomization from "@/hooks/useResolveCustomization";
import { getPageDimensions } from "@/lib/pageDimensions";

import MeasurementContainer from "./shared/MeasurementContainer";
import ResumePage from "./shared/ResumePage";
import { TemplateRendererProps } from "./TemplateRenderer";

type Block = { node: React.ReactNode; sectionKey: string };

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
    lineHeight,
    headingSize,
  } = useResolveCustomization(customization);

  const { widthMm, widthPx, heightPx, marginPx, contentHeightPx } =
    getPageDimensions(customization.pageFormat, customization.marginSize);

  // Column widths: sidebar 35%, main 65%
  const SIDEBAR_RATIO = 0.35;
  const MAIN_RATIO = 0.65;

  // Header occupies the full width at the top
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

  // ── Sidebar blocks ─────────────────────────────────────────────────────────
  const sidebarSectionHeading = (title: string) => (
    <h2
      className={`${headingSize} mb-3 font-bold`}
      style={{ color: primaryColor }}
    >
      {title}
    </h2>
  );

  const sidebarLabels: Record<string, string> = {
    skills: "TECHNICAL SKILLS",
    education: "EDUCATION",
    certifications: "CERTIFICATIONS",
    languages: "LANGUAGES",
    awards: "AWARDS",
  };

  const sidebarBlocks: Block[] = [];

  if ((resume.skills ?? []).length > 0) {
    (resume.skills ?? []).forEach((skill, idx) => {
      sidebarBlocks.push({
        sectionKey: "skills",
        node: (
          <div className={`${textSize} ${lineHeight} flex items-center`}>
            <span className="mr-2" style={{ color: accentColor }}>
              ▸
            </span>
            {skill}
          </div>
        ),
      });
      void idx; // suppress unused warning
    });
  }

  (resume.education ?? []).forEach((edu) => {
    sidebarBlocks.push({
      sectionKey: "education",
      node: (
        <div className="mb-1">
          <div className={`${textSize} font-semibold`}>{edu.degree}</div>
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
      ),
    });
  });

  (resume.certifications ?? []).forEach((cert) => {
    sidebarBlocks.push({
      sectionKey: "certifications",
      node: (
        <div className="mb-1">
          <div className={`${textSize} font-semibold`}>{cert.name}</div>
          <div className="text-xs" style={{ color: secondaryColor }}>
            {cert.issuer} • {cert.date}
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
      ),
    });
  });

  (resume.languages ?? []).forEach((language) => {
    sidebarBlocks.push({
      sectionKey: "languages",
      node: (
        <div
          className={`${textSize} ${lineHeight} mb-1 flex items-center justify-between gap-2`}
        >
          <span>{language.name}</span>
          <span className="text-xs" style={{ color: secondaryColor }}>
            {language.proficiency}
          </span>
        </div>
      ),
    });
  });

  (resume.awards ?? []).forEach((award) => {
    sidebarBlocks.push({
      sectionKey: "awards",
      node: (
        <div className="mb-1">
          <div className={`${textSize} font-semibold`}>{award.title}</div>
          <div className="text-xs" style={{ color: secondaryColor }}>
            {award.issuer} • {award.date}
          </div>
          {award.description && (
            <div className={`${textSize} ${lineHeight} mt-1`}>
              {award.description}
            </div>
          )}
        </div>
      ),
    });
  });

  // ── Main blocks ────────────────────────────────────────────────────────────
  const mainSectionHeading = (title: string) => (
    <h2
      className={`${headingSize} mb-3 border-b-2 pb-1 font-bold`}
      style={{ color: primaryColor, borderColor: primaryColor }}
    >
      {title}
    </h2>
  );

  const mainLabels: Record<string, string> = {
    summary: "PROFESSIONAL SUMMARY",
    experience: "PROFESSIONAL EXPERIENCE",
    projects: "KEY PROJECTS",
    publications: "PUBLICATIONS",
    volunteer: "VOLUNTEER EXPERIENCE",
  };

  const mainBlocks: Block[] = [];

  if (resume.summary) {
    mainBlocks.push({
      sectionKey: "summary",
      node: (
        <p className={`${textSize} ${lineHeight} leading-relaxed`}>
          {resume.summary}
        </p>
      ),
    });
  }

  (resume.experience ?? []).forEach((exp) => {
    mainBlocks.push({
      sectionKey: "experience",
      node: (
        <div>
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
            <div className="shrink-0 text-xs">
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
              {exp.achievements.map((a, i) => (
                <li key={i} className={`${textSize} ${lineHeight} ml-4`}>
                  <span style={{ color: accentColor }}>▸</span> {a}
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    });
  });

  (resume.projects ?? []).forEach((project) => {
    mainBlocks.push({
      sectionKey: "projects",
      node: (
        <div>
          <div className="flex items-start justify-between gap-4">
            <h3 className={`${textSize} font-bold`}>{project.name}</h3>
            {(project.startDate || project.endDate) && (
              <div className="shrink-0 text-xs">
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
              {project.technologies.map((tech, i) => (
                <span
                  key={i}
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
      ),
    });
  });

  (resume.publications ?? []).forEach((pub) => {
    mainBlocks.push({
      sectionKey: "publications",
      node: (
        <div>
          <h3 className={`${textSize} font-bold`}>{pub.title}</h3>
          <div className={`${textSize} ${lineHeight} mt-1`}>
            {pub.authors.join(", ")}
          </div>
          <div className="text-xs" style={{ color: secondaryColor }}>
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
      ),
    });
  });

  (resume.volunteer ?? []).forEach((v) => {
    mainBlocks.push({
      sectionKey: "volunteer",
      node: (
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className={`${textSize} font-bold`}>{v.role}</h3>
              <div
                className={`${textSize} ${lineHeight}`}
                style={{ color: secondaryColor }}
              >
                {v.organization}
              </div>
            </div>
            <div className="shrink-0 text-xs">
              {v.startDate} - {v.endDate || "Present"}
            </div>
          </div>
          {v.description && (
            <p className={`${textSize} ${lineHeight} mt-1`}>{v.description}</p>
          )}
        </div>
      ),
    });
  });

  // ── Independent paginators ─────────────────────────────────────────────────
  // Column content height: page height minus header (page 1 only) minus top+bottom padding
  const columnContentHeight = contentHeightPx;

  const { setRef: setSidebarRef, pageGroups: sidebarPageGroups } =
    useBlockPaginator({
      count: sidebarBlocks.length,
      pageContentHeight: columnContentHeight,
      firstPageReserved: headerHeight,
    });

  const { setRef: setMainRef, pageGroups: mainPageGroups } = useBlockPaginator({
    count: mainBlocks.length,
    pageContentHeight: columnContentHeight,
    firstPageReserved: headerHeight,
  });

  const pageCount = Math.max(
    sidebarPageGroups.length,
    mainPageGroups.length,
    1
  );

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderSidebarBlocks = (indices: number[], prevLastSection: string) => {
    let currentSection = prevLastSection;
    return indices.map((idx) => {
      const block = sidebarBlocks[idx];
      const isNewSection = block.sectionKey !== currentSection;
      currentSection = block.sectionKey;
      return (
        <div key={idx} className="mb-2">
          {isNewSection && (
            <div className="mb-2">
              {sidebarSectionHeading(
                sidebarLabels[block.sectionKey] ?? block.sectionKey
              )}
            </div>
          )}
          {block.node}
        </div>
      );
    });
  };

  const renderMainBlocks = (indices: number[], prevLastSection: string) => {
    let currentSection = prevLastSection;
    return indices.map((idx) => {
      const block = mainBlocks[idx];
      const isNewSection = block.sectionKey !== currentSection;
      currentSection = block.sectionKey;
      return (
        <div key={idx} className="mb-4">
          {isNewSection && (
            <div className="mb-2">
              {mainSectionHeading(
                mainLabels[block.sectionKey] ?? block.sectionKey
              )}
            </div>
          )}
          {block.node}
        </div>
      );
    });
  };

  // Sidebar widthMm for measurement
  const sidebarWidthMm = widthMm * SIDEBAR_RATIO;
  const mainWidthMm = widthMm * MAIN_RATIO;

  const headerNode = (
    <div className="p-8 pb-4" style={{ backgroundColor: primaryColor }}>
      <h1 className="mb-1 text-3xl font-bold text-white">
        {resume.header.name}
      </h1>
      {resume.header.headline && (
        <div className={`${textSize} ${lineHeight} mb-2 text-white opacity-90`}>
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
      {/* Off-screen measurement */}
      {/* Header */}
      <MeasurementContainer widthMm={widthMm}>
        <div ref={headerRef}>{headerNode}</div>
      </MeasurementContainer>
      {/* Sidebar blocks */}
      <MeasurementContainer widthMm={sidebarWidthMm}>
        <div style={{ padding: "24px" }}>
          {sidebarBlocks.map((block, i) => (
            <div key={i} ref={setSidebarRef(i)}>
              {block.node}
            </div>
          ))}
        </div>
      </MeasurementContainer>
      {/* Main blocks */}
      <MeasurementContainer widthMm={mainWidthMm}>
        <div style={{ padding: "24px" }}>
          {mainBlocks.map((block, i) => (
            <div key={i} ref={setMainRef(i)}>
              {block.node}
            </div>
          ))}
        </div>
      </MeasurementContainer>

      {/* Pages */}
      {Array.from({ length: pageCount }, (_, pageIndex) => {
        const sidebarGroup = sidebarPageGroups[pageIndex] ?? [];
        const mainGroup = mainPageGroups[pageIndex] ?? [];

        const prevSidebarGroup = sidebarPageGroups[pageIndex - 1] ?? [];
        const prevMainGroup = mainPageGroups[pageIndex - 1] ?? [];

        const prevSidebarSection =
          pageIndex === 0
            ? ""
            : (sidebarBlocks[prevSidebarGroup[prevSidebarGroup.length - 1]]
                ?.sectionKey ?? "");
        const prevMainSection =
          pageIndex === 0
            ? ""
            : (mainBlocks[prevMainGroup[prevMainGroup.length - 1]]
                ?.sectionKey ?? "");

        return (
          <ResumePage
            key={pageIndex}
            widthPx={widthPx}
            heightPx={heightPx}
            pageIndex={pageIndex}
            pageCount={pageCount}
          >
            {pageIndex === 0 && headerNode}
            <div
              className="flex"
              style={{
                height:
                  pageIndex === 0 ? `calc(100% - ${headerHeight}px)` : "100%",
              }}
            >
              {/* Sidebar column */}
              <div
                style={{
                  width: `${SIDEBAR_RATIO * 100}%`,
                  padding: "24px",
                  backgroundColor: secondaryColor + "10",
                  overflowY: "hidden",
                }}
              >
                {renderSidebarBlocks(
                  sidebarGroup,
                  pageIndex === 0 ? "" : prevSidebarSection
                )}
              </div>
              {/* Main column */}
              <div
                style={{
                  width: `${MAIN_RATIO * 100}%`,
                  padding: "24px",
                  overflowY: "hidden",
                }}
              >
                {renderMainBlocks(
                  mainGroup,
                  pageIndex === 0 ? "" : prevMainSection
                )}
              </div>
            </div>
          </ResumePage>
        );
      })}
    </div>
  );
};
