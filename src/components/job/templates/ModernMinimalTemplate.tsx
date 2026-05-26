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

type Block = {
  node: React.ReactNode;
  sectionKey: string;
};

export const ModernMinimalTemplate: React.FC<TemplateRendererProps> = ({
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

  // ── Section headings ───────────────────────────────────────────────────────
  const sectionHeadingNode = (title: string) => (
    <h2
      className={`${headingSize} mb-3 border-b pb-1 font-semibold`}
      style={{ color: primaryColor, borderColor: secondaryColor }}
    >
      {title}
    </h2>
  );

  const sectionLabels: Record<string, string> = {
    summary: "Professional Summary",
    experience: "Work Experience",
    projects: "Projects",
    skills: "Skills",
    education: "Education",
    certifications: "Certifications",
    publications: "Publications",
    languages: "Languages",
    volunteer: "Volunteer Experience",
    awards: "Awards",
  };

  // ── Build block list ───────────────────────────────────────────────────────
  const blocks: Block[] = [];

  if (resume.summary) {
    blocks.push({
      sectionKey: "summary",
      node: (
        <p
          className={`${textSize} ${lineHeight} leading-relaxed text-gray-700`}
        >
          {resume.summary}
        </p>
      ),
    });
  }

  resume.experience.forEach((exp) => {
    blocks.push({
      sectionKey: "experience",
      node: (
        <div>
          <div className="mb-1 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold" style={{ color: accentColor }}>
                {exp.role}
              </h3>
              <p className={`${textSize} ${lineHeight} text-gray-600`}>
                {exp.company}
              </p>
            </div>
            <span className={`${textSize} shrink-0 text-gray-500`}>
              {exp.startDate} - {exp.endDate || "Present"}
            </span>
          </div>
          {exp.description && (
            <p className={`${textSize} ${lineHeight} mb-2 text-gray-700`}>
              {exp.description}
            </p>
          )}
          {exp.achievements.length > 0 && (
            <ul
              className={`${textSize} ${lineHeight} list-inside list-disc space-y-1 text-gray-700`}
            >
              {exp.achievements.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          )}
        </div>
      ),
    });
  });

  resume.projects.forEach((project) => {
    blocks.push({
      sectionKey: "projects",
      node: (
        <div>
          <h3 className="font-semibold" style={{ color: accentColor }}>
            {project.name}
            {project.url && (
              <a
                href={project.url}
                className={`${textSize} ml-2 hover:underline`}
                style={{ color: secondaryColor }}
              >
                [Link]
              </a>
            )}
          </h3>
          {(project.startDate || project.endDate) && (
            <div className={`${textSize} text-gray-500`}>
              {project.startDate || ""}
              {project.startDate || project.endDate ? " - " : ""}
              {project.endDate || "Present"}
            </div>
          )}
          <p className={`${textSize} ${lineHeight} mb-1 text-gray-700`}>
            {project.description}
          </p>
          {project.technologies.length > 0 && (
            <div className={`${textSize} text-gray-600`}>
              <span className="font-medium">Technologies:</span>{" "}
              {project.technologies.join(", ")}
            </div>
          )}
        </div>
      ),
    });
  });

  if (resume.skills.length > 0) {
    blocks.push({
      sectionKey: "skills",
      node: (
        <div className={`${textSize} ${lineHeight} text-gray-700`}>
          {resume.skills.join(" • ")}
        </div>
      ),
    });
  }

  resume.education.forEach((edu) => {
    blocks.push({
      sectionKey: "education",
      node: (
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold" style={{ color: accentColor }}>
                {edu.degree}
                {edu.field && ` in ${edu.field}`}
              </h3>
              <p className={`${textSize} ${lineHeight} text-gray-600`}>
                {edu.institution}
              </p>
            </div>
            <span className={`${textSize} shrink-0 text-gray-500`}>
              {edu.startDate} - {edu.endDate || "Present"}
            </span>
          </div>
          {edu.gpa && (
            <p className={`${textSize} text-gray-600`}>GPA: {edu.gpa}</p>
          )}
        </div>
      ),
    });
  });

  resume.certifications.forEach((cert) => {
    blocks.push({
      sectionKey: "certifications",
      node: (
        <div>
          <h3 className="font-semibold" style={{ color: accentColor }}>
            {cert.name}
          </h3>
          <p className={`${textSize} text-gray-600`}>
            {cert.issuer} • {cert.date}
            {cert.url && (
              <a
                href={cert.url}
                className="ml-2 hover:underline"
                style={{ color: secondaryColor }}
              >
                [Verify]
              </a>
            )}
          </p>
        </div>
      ),
    });
  });

  (resume.publications ?? []).forEach((pub) => {
    blocks.push({
      sectionKey: "publications",
      node: (
        <div>
          <h3 className="font-semibold" style={{ color: accentColor }}>
            {pub.title}
          </h3>
          <p className={`${textSize} ${lineHeight} text-gray-700`}>
            {pub.authors.join(", ")}
          </p>
          <p className={`${textSize} text-gray-600`}>
            {pub.venue} • {pub.date}
            {pub.doi && ` • DOI: ${pub.doi}`}
            {pub.url && (
              <a
                href={pub.url}
                className="ml-2 hover:underline"
                style={{ color: secondaryColor }}
              >
                [View]
              </a>
            )}
          </p>
        </div>
      ),
    });
  });

  if ((resume.languages ?? []).length > 0) {
    blocks.push({
      sectionKey: "languages",
      node: (
        <div className={`${textSize} ${lineHeight} text-gray-700`}>
          {(resume.languages ?? [])
            .map((l) => `${l.name} (${l.proficiency})`)
            .join(" • ")}
        </div>
      ),
    });
  }

  (resume.volunteer ?? []).forEach((v) => {
    blocks.push({
      sectionKey: "volunteer",
      node: (
        <div>
          <div className="mb-1 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold" style={{ color: accentColor }}>
                {v.role}
              </h3>
              <p className={`${textSize} ${lineHeight} text-gray-600`}>
                {v.organization}
              </p>
            </div>
            <span className={`${textSize} shrink-0 text-gray-500`}>
              {v.startDate} - {v.endDate || "Present"}
            </span>
          </div>
          {v.description && (
            <p className={`${textSize} ${lineHeight} text-gray-700`}>
              {v.description}
            </p>
          )}
        </div>
      ),
    });
  });

  (resume.awards ?? []).forEach((award) => {
    blocks.push({
      sectionKey: "awards",
      node: (
        <div>
          <h3 className="font-semibold" style={{ color: accentColor }}>
            {award.title}
          </h3>
          <p className={`${textSize} text-gray-600`}>
            {award.issuer} • {award.date}
          </p>
          {award.description && (
            <p className={`${textSize} ${lineHeight} text-gray-700`}>
              {award.description}
            </p>
          )}
        </div>
      ),
    });
  });

  // ── Header measurement ─────────────────────────────────────────────────────
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

  // ── Pagination ─────────────────────────────────────────────────────────────
  const { setRef, pageGroups } = useBlockPaginator({
    count: blocks.length,
    pageContentHeight: contentHeightPx,
    firstPageReserved: headerHeight,
  });

  // ── Header node ────────────────────────────────────────────────────────────
  const headerNode = (
    <header
      className="mb-8 border-b-2 pb-4"
      style={{ borderColor: primaryColor }}
    >
      <h1 className="mb-2 text-4xl font-bold" style={{ color: primaryColor }}>
        {resume.header.name}
      </h1>
      {resume.header.headline && (
        <div
          className={`${textSize} ${lineHeight} mb-2 font-medium`}
          style={{ color: accentColor }}
        >
          {resume.header.headline}
        </div>
      )}
      <div className={`${textSize} ${lineHeight} space-y-1 text-gray-600`}>
        <div className="flex flex-wrap gap-4">
          {resume.header.email && <span>✉ {resume.header.email}</span>}
          {resume.header.phone && <span>📞 {resume.header.phone}</span>}
          {resume.header.location && <span>📍 {resume.header.location}</span>}
        </div>
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
    </header>
  );

  // ── Page content renderer ──────────────────────────────────────────────────
  const renderPageBlocks = (indices: number[], prevLastSection: string) => {
    let currentSection = prevLastSection;
    return indices.map((idx) => {
      const block = blocks[idx];
      const isNewSection = block.sectionKey !== currentSection;
      currentSection = block.sectionKey;
      return (
        <div key={idx} className="mb-4">
          {isNewSection && (
            <div className="mb-2">
              {sectionHeadingNode(
                sectionLabels[block.sectionKey] ?? block.sectionKey
              )}
            </div>
          )}
          {block.node}
        </div>
      );
    });
  };

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
      {/* ── Off-screen measurement ──────────────────────────────────────────── */}
      <MeasurementContainer widthMm={widthMm}>
        <div style={{ padding: marginPx, paddingBottom: 0 }}>
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

      {/* ── Rendered pages ─────────────────────────────────────────────────── */}
      {pageGroups.map((group, pageIndex) => {
        const prevGroup = pageGroups[pageIndex - 1];
        const prevLastSection =
          pageIndex === 0
            ? ""
            : (blocks[prevGroup[prevGroup.length - 1]]?.sectionKey ?? "");

        return (
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
              }}
            >
              {pageIndex === 0 && headerNode}
              {renderPageBlocks(group, pageIndex === 0 ? "" : prevLastSection)}
            </div>
          </ResumePage>
        );
      })}
    </div>
  );
};
