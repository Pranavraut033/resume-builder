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
    lineHeight,
    headingSize,
  } = useResolveCustomization(customization);

  const { widthMm, widthPx, heightPx, marginPx, contentHeightPx } =
    getPageDimensions(customization.pageFormat, customization.marginSize);

  void marginPx; // column templates manage their own internal padding

  const LEFT_RATIO = 0.4;
  const RIGHT_RATIO = 0.6;
  const COLUMN_PADDING = 24;

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

  // ── Left column blocks ─────────────────────────────────────────────────────
  const leftHeading = (title: string) => (
    <h2
      className={`${headingSize} mb-3 border-b-2 pb-2 font-bold`}
      style={{ color: primaryColor, borderColor: accentColor }}
    >
      {title}
    </h2>
  );

  const leftLabels: Record<string, string> = {
    summary: "ABOUT ME",
    skills: "SKILLS",
    education: "EDUCATION",
    certifications: "CERTIFICATIONS",
    languages: "LANGUAGES",
    awards: "AWARDS",
  };

  const leftBlocks: Block[] = [];

  if (resume.summary) {
    leftBlocks.push({
      sectionKey: "summary",
      node: (
        <p className={`${textSize} ${lineHeight} leading-relaxed`}>
          {resume.summary}
        </p>
      ),
    });
  }

  if ((resume.skills ?? []).length > 0) {
    leftBlocks.push({
      sectionKey: "skills",
      node: (
        <div className="space-y-2">
          {(resume.skills ?? []).map((skill, idx) => (
            <div key={idx} className="flex items-center">
              <div
                className="mr-2 h-2 w-2 rounded-full"
                style={{ backgroundColor: accentColor }}
              />
              <span className={`${textSize} ${lineHeight}`}>{skill}</span>
            </div>
          ))}
        </div>
      ),
    });
  }

  (resume.education ?? []).forEach((edu) => {
    leftBlocks.push({
      sectionKey: "education",
      node: (
        <div>
          <h3 className={`${textSize} font-bold`}>{edu.degree}</h3>
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
    leftBlocks.push({
      sectionKey: "certifications",
      node: (
        <div>
          <div className={`${textSize} font-semibold`}>{cert.name}</div>
          <div className="text-xs" style={{ color: secondaryColor }}>
            {cert.issuer}
          </div>
          <div className="text-xs">{cert.date}</div>
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
      ),
    });
  });

  (resume.languages ?? []).forEach((language) => {
    leftBlocks.push({
      sectionKey: "languages",
      node: (
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className={`${textSize} ${lineHeight} font-medium`}>
            {language.name}
          </span>
          <span className="text-xs" style={{ color: secondaryColor }}>
            {language.proficiency}
          </span>
        </div>
      ),
    });
  });

  (resume.awards ?? []).forEach((award) => {
    leftBlocks.push({
      sectionKey: "awards",
      node: (
        <div>
          <div className={`${textSize} font-semibold`}>{award.title}</div>
          <div className="text-xs" style={{ color: secondaryColor }}>
            {award.issuer}
          </div>
          <div className="text-xs">{award.date}</div>
          {award.description && (
            <div className={`${textSize} ${lineHeight} mt-1`}>
              {award.description}
            </div>
          )}
        </div>
      ),
    });
  });

  // ── Right column blocks ────────────────────────────────────────────────────
  const rightHeading = (title: string) => (
    <h2
      className={`${headingSize} mb-4 border-b-2 pb-2 font-bold`}
      style={{ color: primaryColor, borderColor: accentColor }}
    >
      {title}
    </h2>
  );

  const rightLabels: Record<string, string> = {
    experience: "EXPERIENCE",
    projects: "PROJECTS",
    volunteer: "VOLUNTEER",
    publications: "PUBLICATIONS",
  };

  const rightBlocks: Block[] = [];

  (resume.experience ?? []).forEach((exp) => {
    rightBlocks.push({
      sectionKey: "experience",
      node: (
        <div className="relative pl-6">
          <div
            className="absolute top-1 left-0 h-3 w-3 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <div className="mb-1 flex items-start justify-between gap-4">
            <h3 className={`${textSize} font-bold`}>{exp.role}</h3>
            <span className="ml-2 text-xs whitespace-nowrap">
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
    rightBlocks.push({
      sectionKey: "projects",
      node: (
        <div className="relative pl-6">
          <div
            className="absolute top-1 left-0 h-3 w-3 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <div className="flex items-start justify-between gap-4">
            <h3 className={`${textSize} font-bold`}>{project.name}</h3>
            {(project.startDate || project.endDate) && (
              <span className="text-xs whitespace-nowrap">
                {project.startDate || ""}
                {project.startDate || project.endDate ? " - " : ""}
                {project.endDate || "Present"}
              </span>
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
            <div className="flex flex-wrap gap-1">
              {project.technologies.map((tech, i) => (
                <span
                  key={i}
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
      ),
    });
  });

  (resume.volunteer ?? []).forEach((v) => {
    rightBlocks.push({
      sectionKey: "volunteer",
      node: (
        <div className="relative pl-6">
          <div
            className="absolute top-1 left-0 h-3 w-3 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <div className="mb-1 flex items-start justify-between gap-4">
            <h3 className={`${textSize} font-bold`}>{v.role}</h3>
            <span className="ml-2 text-xs whitespace-nowrap">
              {v.startDate} - {v.endDate || "Present"}
            </span>
          </div>
          <div
            className={`${textSize} ${lineHeight} mb-2 font-semibold`}
            style={{ color: secondaryColor }}
          >
            {v.organization}
          </div>
          {v.description && (
            <p className={`${textSize} ${lineHeight}`}>{v.description}</p>
          )}
        </div>
      ),
    });
  });

  (resume.publications ?? []).forEach((pub) => {
    rightBlocks.push({
      sectionKey: "publications",
      node: (
        <div className="relative pl-6">
          <div
            className="absolute top-1 left-0 h-3 w-3 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
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
      ),
    });
  });

  // ── Independent paginators ─────────────────────────────────────────────────
  const { setRef: setLeftRef, pageGroups: leftPageGroups } = useBlockPaginator({
    count: leftBlocks.length,
    pageContentHeight: contentHeightPx,
    firstPageReserved: headerHeight,
  });

  const { setRef: setRightRef, pageGroups: rightPageGroups } =
    useBlockPaginator({
      count: rightBlocks.length,
      pageContentHeight: contentHeightPx,
      firstPageReserved: headerHeight,
    });

  const pageCount = Math.max(leftPageGroups.length, rightPageGroups.length, 1);

  const renderLeftBlocks = (indices: number[], prevLastSection: string) => {
    let currentSection = prevLastSection;
    return indices.map((idx) => {
      const block = leftBlocks[idx];
      const isNewSection = block.sectionKey !== currentSection;
      currentSection = block.sectionKey;
      return (
        <div key={idx} className="mb-4">
          {isNewSection && (
            <div className="mb-2">
              {leftHeading(leftLabels[block.sectionKey] ?? block.sectionKey)}
            </div>
          )}
          {block.node}
        </div>
      );
    });
  };

  const renderRightBlocks = (indices: number[], prevLastSection: string) => {
    let currentSection = prevLastSection;
    return indices.map((idx) => {
      const block = rightBlocks[idx];
      const isNewSection = block.sectionKey !== currentSection;
      currentSection = block.sectionKey;
      return (
        <div key={idx} className="mb-5">
          {isNewSection && (
            <div className="mb-2">
              {rightHeading(rightLabels[block.sectionKey] ?? block.sectionKey)}
            </div>
          )}
          {block.node}
        </div>
      );
    });
  };

  const leftWidthMm = widthMm * LEFT_RATIO;
  const rightWidthMm = widthMm * RIGHT_RATIO;

  const headerNode = (
    <header
      className="p-8"
      style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`,
      }}
    >
      <h1 className="mb-2 text-4xl font-bold text-white">
        {resume.header.name}
      </h1>
      {resume.header.headline && (
        <div className={`${textSize} ${lineHeight} mb-3 text-white opacity-95`}>
          {resume.header.headline}
        </div>
      )}
      <div
        className={`flex flex-wrap gap-4 text-sm text-white opacity-95 ${lineHeight}`}
      >
        {resume.header.email && <span>✉ {resume.header.email}</span>}
        {resume.header.phone && <span>📞 {resume.header.phone}</span>}
        {resume.header.location && <span>📍 {resume.header.location}</span>}
        {resume.header.linkedin && (
          <a href={resume.header.linkedin} className="hover:underline">
            🔗 {resume.header.linkedin}
          </a>
        )}
        {resume.header.github && (
          <a href={resume.header.github} className="hover:underline">
            💻 {resume.header.github}
          </a>
        )}
        {resume.header.website && (
          <a href={resume.header.website} className="hover:underline">
            🌐 {resume.header.website}
          </a>
        )}
      </div>
    </header>
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
      {/* Measurement containers */}
      <MeasurementContainer widthMm={widthMm}>
        <div ref={headerRef}>{headerNode}</div>
      </MeasurementContainer>
      <MeasurementContainer widthMm={leftWidthMm}>
        <div style={{ padding: COLUMN_PADDING }}>
          {leftBlocks.map((block, i) => (
            <div key={i} ref={setLeftRef(i)}>
              {block.node}
            </div>
          ))}
        </div>
      </MeasurementContainer>
      <MeasurementContainer widthMm={rightWidthMm}>
        <div style={{ padding: COLUMN_PADDING }}>
          {rightBlocks.map((block, i) => (
            <div key={i} ref={setRightRef(i)}>
              {block.node}
            </div>
          ))}
        </div>
      </MeasurementContainer>

      {/* Pages */}
      {Array.from({ length: pageCount }, (_, pageIndex) => {
        const leftGroup = leftPageGroups[pageIndex] ?? [];
        const rightGroup = rightPageGroups[pageIndex] ?? [];

        const prevLeftGroup = leftPageGroups[pageIndex - 1] ?? [];
        const prevRightGroup = rightPageGroups[pageIndex - 1] ?? [];

        const prevLeftSection =
          pageIndex === 0
            ? ""
            : (leftBlocks[prevLeftGroup[prevLeftGroup.length - 1]]
                ?.sectionKey ?? "");
        const prevRightSection =
          pageIndex === 0
            ? ""
            : (rightBlocks[prevRightGroup[prevRightGroup.length - 1]]
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
              {/* Left column */}
              <div
                style={{
                  width: `${LEFT_RATIO * 100}%`,
                  padding: COLUMN_PADDING,
                  backgroundColor: secondaryColor + "08",
                  overflowY: "hidden",
                }}
              >
                {renderLeftBlocks(
                  leftGroup,
                  pageIndex === 0 ? "" : prevLeftSection
                )}
              </div>
              {/* Right column */}
              <div
                style={{
                  width: `${RIGHT_RATIO * 100}%`,
                  padding: COLUMN_PADDING,
                  overflowY: "hidden",
                }}
              >
                {renderRightBlocks(
                  rightGroup,
                  pageIndex === 0 ? "" : prevRightSection
                )}
              </div>
            </div>
          </ResumePage>
        );
      })}
    </div>
  );
};
