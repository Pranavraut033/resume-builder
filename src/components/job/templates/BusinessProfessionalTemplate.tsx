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
    lineHeight,
    headingSize,
  } = useResolveCustomization(customization);

  const { widthMm, widthPx, heightPx, marginPx, contentHeightPx } =
    getPageDimensions(customization.pageFormat, customization.marginSize);

  const sectionHeadingNode = (title: string) => (
    <h2
      className={`${headingSize} mb-3 font-serif font-bold uppercase`}
      style={{ color: primaryColor }}
    >
      {title}
    </h2>
  );

  const sectionLabels: Record<string, string> = {
    summary: "Professional Summary",
    experience: "Professional Experience",
    education: "Education",
    skills: "Core Competencies",
    projects: "Key Projects",
    certifications: "Certifications",
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
        <p className={`${textSize} ${lineHeight} text-justify leading-relaxed`}>
          {resume.summary}
        </p>
      ),
    });
  }

  (resume.experience ?? []).forEach((exp) => {
    blocks.push({
      sectionKey: "experience",
      node: (
        <div>
          <div className="mb-1 flex items-baseline justify-between gap-4">
            <h3 className={`${textSize} font-bold`}>{exp.role}</h3>
            <span
              className="shrink-0 text-xs"
              style={{ color: secondaryColor }}
            >
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
      ),
    });
  });

  (resume.education ?? []).forEach((edu) => {
    blocks.push({
      sectionKey: "education",
      node: (
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <h3 className={`${textSize} font-bold`}>{edu.degree}</h3>
            <span
              className="shrink-0 text-xs"
              style={{ color: secondaryColor }}
            >
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
      ),
    });
  });

  if ((resume.skills ?? []).length > 0) {
    blocks.push({
      sectionKey: "skills",
      node: (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {(resume.skills ?? []).map((skill, idx) => (
            <span key={idx} className={`${textSize} ${lineHeight}`}>
              • {skill}
            </span>
          ))}
        </div>
      ),
    });
  }

  (resume.projects ?? []).forEach((project) => {
    blocks.push({
      sectionKey: "projects",
      node: (
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <h3 className={`${textSize} font-bold`}>{project.name}</h3>
            {(project.startDate || project.endDate) && (
              <span
                className="shrink-0 text-xs"
                style={{ color: secondaryColor }}
              >
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
      ),
    });
  });

  (resume.certifications ?? []).forEach((cert) => {
    blocks.push({
      sectionKey: "certifications",
      node: (
        <div>
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
      ),
    });
  });

  (resume.publications ?? []).forEach((pub) => {
    blocks.push({
      sectionKey: "publications",
      node: (
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
      ),
    });
  });

  if ((resume.languages ?? []).length > 0) {
    blocks.push({
      sectionKey: "languages",
      node: (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {(resume.languages ?? []).map((l, idx) => (
            <span key={idx} className={`${textSize} ${lineHeight}`}>
              • {l.name} ({l.proficiency})
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
        <div>
          <div className="mb-1 flex items-baseline justify-between gap-4">
            <h3 className={`${textSize} font-bold`}>{v.role}</h3>
            <span
              className="shrink-0 text-xs"
              style={{ color: secondaryColor }}
            >
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

  (resume.awards ?? []).forEach((award) => {
    blocks.push({
      sectionKey: "awards",
      node: (
        <div>
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
