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

export const ElegantTimelineTemplate: React.FC<TemplateRendererProps> = ({
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

  const sectionHeadingNode = (title: string) => (
    <h2
      className={`${headingSize} mb-4 text-center font-semibold uppercase`}
      style={{ color: primaryColor }}
    >
      {title}
    </h2>
  );

  const sectionLabels: Record<string, string> = {
    summary: "Professional Summary",
    experience: "Experience",
    education: "Education",
    skills: "Skills",
    certifications: "Certifications",
    projects: "Projects",
    publications: "Publications",
    languages: "Languages",
    volunteer: "Volunteer Experience",
    awards: "Awards",
  };

  const blocks: Block[] = [];

  if (resume.summary) {
    blocks.push({
      sectionKey: "summary",
      node: (
        <p
          className={`${textSize} ${lineHeight} mx-auto max-w-3xl text-center leading-relaxed`}
        >
          {resume.summary}
        </p>
      ),
    });
  }

  (resume.experience ?? []).forEach((exp, idx) => {
    blocks.push({
      sectionKey: "experience",
      node: (
        <div className="relative">
          <div
            className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2"
            style={{ backgroundColor: accentColor }}
          />
          <div
            className={`flex ${idx % 2 === 0 ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`w-5/12 ${idx % 2 === 0 ? "pr-8 text-right" : "pl-8 text-left"}`}
            >
              <div className="relative">
                <div
                  className={`absolute top-2 h-4 w-4 rounded-full border-2 ${
                    idx % 2 === 0 ? "-right-[3.75rem]" : "-left-[3.75rem]"
                  }`}
                  style={{ backgroundColor, borderColor: accentColor }}
                />
                <h3 className={`${textSize} font-bold`}>{exp.role}</h3>
                <div
                  className={`${textSize} ${lineHeight} font-medium`}
                  style={{ color: secondaryColor }}
                >
                  {exp.company}
                </div>
                <div className="mb-2 text-xs">
                  {exp.startDate} - {exp.endDate || "Present"}
                </div>
                {exp.description && (
                  <p className={`${textSize} ${lineHeight} mb-2`}>
                    {exp.description}
                  </p>
                )}
                {exp.achievements && exp.achievements.length > 0 && (
                  <ul className={`space-y-1 text-xs ${lineHeight}`}>
                    {exp.achievements.map((a, i) => (
                      <li key={i}>• {a}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      ),
    });
  });

  (resume.education ?? []).forEach((edu) => {
    blocks.push({
      sectionKey: "education",
      node: (
        <div className="text-center">
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

  if ((resume.skills ?? []).length > 0) {
    blocks.push({
      sectionKey: "skills",
      node: (
        <div className="flex flex-wrap justify-center gap-2">
          {(resume.skills ?? []).map((skill, idx) => (
            <span
              key={idx}
              className="rounded-full px-3 py-1 text-sm"
              style={{
                backgroundColor: accentColor + "20",
                color: accentColor,
              }}
            >
              {skill}
            </span>
          ))}
        </div>
      ),
    });
  }

  (resume.certifications ?? []).forEach((cert) => {
    blocks.push({
      sectionKey: "certifications",
      node: (
        <div className="text-center">
          <h3 className={`${textSize} font-semibold`}>{cert.name}</h3>
          <p className="text-xs" style={{ color: secondaryColor }}>
            {cert.issuer} • {cert.date}
          </p>
        </div>
      ),
    });
  });

  (resume.projects ?? []).forEach((project) => {
    blocks.push({
      sectionKey: "projects",
      node: (
        <div className="text-center">
          <h3 className={`${textSize} font-bold`}>{project.name}</h3>
          <p className={`${textSize} ${lineHeight} mt-1`}>
            {project.description}
          </p>
          {project.technologies && project.technologies.length > 0 && (
            <div className="mt-1 text-xs" style={{ color: secondaryColor }}>
              {project.technologies.join(", ")}
            </div>
          )}
        </div>
      ),
    });
  });

  (resume.publications ?? []).forEach((pub) => {
    blocks.push({
      sectionKey: "publications",
      node: (
        <div className="text-center">
          <h3 className={`${textSize} font-bold`}>{pub.title}</h3>
          <div className={`${textSize} ${lineHeight}`}>
            {pub.authors.join(", ")}
          </div>
          <div className="text-xs" style={{ color: secondaryColor }}>
            {pub.venue} • {pub.date}
          </div>
        </div>
      ),
    });
  });

  if ((resume.languages ?? []).length > 0) {
    blocks.push({
      sectionKey: "languages",
      node: (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          {(resume.languages ?? []).map((l, idx) => (
            <span key={idx} className={`${textSize} ${lineHeight}`}>
              {l.name} ({l.proficiency})
            </span>
          ))}
        </div>
      ),
    });
  }

  (resume.volunteer ?? []).forEach((v) => {
    blocks.push({
      sectionKey: "volunteer",
      node: (
        <div className="text-center">
          <h3 className={`${textSize} font-bold`}>{v.role}</h3>
          <div
            className={`${textSize} ${lineHeight}`}
            style={{ color: secondaryColor }}
          >
            {v.organization}
          </div>
          <div className="text-xs">
            {v.startDate} - {v.endDate || "Present"}
          </div>
          {v.description && (
            <p className={`${textSize} ${lineHeight} mt-1`}>{v.description}</p>
          )}
        </div>
      ),
    });
  });

  (resume.awards ?? []).forEach((award) => {
    blocks.push({
      sectionKey: "awards",
      node: (
        <div className="text-center">
          <h3 className={`${textSize} font-semibold`}>{award.title}</h3>
          <p className="text-xs" style={{ color: secondaryColor }}>
            {award.issuer} • {award.date}
          </p>
          {award.description && (
            <p className={`${textSize} ${lineHeight} mt-1`}>
              {award.description}
            </p>
          )}
        </div>
      ),
    });
  });

  // Header measurement
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

  const headerNode = (
    <header className="mb-8 text-center">
      <h1 className="mb-2 text-4xl font-light" style={{ color: primaryColor }}>
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
      <div
        className={`${textSize} ${lineHeight} mb-2 flex flex-wrap justify-center gap-3`}
        style={{ color: secondaryColor }}
      >
        {resume.header.email && <span>✉ {resume.header.email}</span>}
        {resume.header.phone && <span>📞 {resume.header.phone}</span>}
        {resume.header.location && <span>📍 {resume.header.location}</span>}
      </div>
      <div
        className={`${textSize} ${lineHeight} flex flex-wrap justify-center gap-3`}
      >
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
            Portfolio
          </a>
        )}
      </div>
    </header>
  );

  const renderPageBlocks = (indices: number[], prevLastSection: string) => {
    let currentSection = prevLastSection;
    return indices.map((idx) => {
      const block = blocks[idx];
      const isNewSection = block.sectionKey !== currentSection;
      currentSection = block.sectionKey;
      return (
        <div key={idx} className="mb-6">
          {isNewSection && (
            <div className="mb-3">
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
