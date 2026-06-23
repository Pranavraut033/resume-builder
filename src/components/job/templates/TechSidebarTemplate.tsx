// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

"use client";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import React, { useEffect, useRef, useState } from "react";

import { EditableItem } from "@/components/job-v2/resume/EditableItem";
import { EditableText } from "@/components/job-v2/resume/EditableText";
import {
  ListSectionId,
  useInlineEdit,
} from "@/components/job-v2/resume/InlineEditContext";
import { Icon } from "@/components/ui/Icon";
import { useBlockPaginator } from "@/hooks/useBlockPaginator";
import useResolveCustomization from "@/hooks/useResolveCustomization";
import { getPageDimensions } from "@/lib/pageDimensions";

import MeasurementContainer from "./shared/MeasurementContainer";
import ResumePage from "./shared/ResumePage";
import { TemplateRendererProps } from "./TemplateRenderer";

const LIST_SECTIONS: readonly ListSectionId[] = [
  "experience",
  "education",
  "projects",
  "certifications",
];
const isListSection = (key: string): key is ListSectionId =>
  (LIST_SECTIONS as readonly string[]).includes(key);

type Block = {
  node: React.ReactNode;
  sectionKey: string;
  /** For list-section entries: the index within that section's array. */
  itemIndex?: number;
};

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
    background,
    colorsTuple,
  } = useResolveCustomization(customization);

  const { widthMm, widthPx, heightPx, contentHeightPx } = getPageDimensions(
    customization.pageFormat,
    customization.marginSize
  );

  // Column widths: sidebar 35%, main 65%
  const SIDEBAR_RATIO = 0.35;
  const MAIN_RATIO = 0.65;

  const edit = useInlineEdit();

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
  const sidebarLabels: Record<string, string> = {
    skills: "TECHNICAL SKILLS",
    education: "EDUCATION",
    certifications: "CERTIFICATIONS",
    languages: "LANGUAGES",
    awards: "AWARDS",
  };

  const sidebarSectionHeading = (sectionKey: string) => {
    const title = sidebarLabels[sectionKey] ?? sectionKey;
    const canAdd = edit.editable && isListSection(sectionKey);
    return (
      <h2
        className={`${headingSize} group/heading mb-3 flex items-center justify-between gap-2 font-bold`}
        style={{ color: primaryColor }}
      >
        <span>{title}</span>
        {canAdd && (
          <button
            onClick={() => edit.addItem(sectionKey)}
            aria-label={`Add ${title} entry`}
            title={`Add ${title} entry`}
            className="text-agent-on-surface-variant hover:bg-agent-primary-container hover:text-agent-on-primary-container -my-1 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium opacity-0 transition-all duration-150 group-hover/heading:opacity-100"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            Add
          </button>
        )}
      </h2>
    );
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
            <EditableText
              value={skill}
              onCommit={(v) => edit.updateSkill(idx, v)}
              placeholder="Skill"
            />
          </div>
        ),
      });
    });
  }

  (resume.education ?? []).forEach((edu, eduIndex) => {
    sidebarBlocks.push({
      sectionKey: "education",
      itemIndex: eduIndex,
      node: (
        <div className="mb-1">
          <div className={`${textSize} font-semibold`}>
            <EditableText
              value={edu.degree}
              onCommit={(v) => edit.updateEducation(eduIndex, { degree: v })}
              placeholder="Degree"
            />
            {(edu.field || edit.editable) && (
              <>
                {" • "}
                <EditableText
                  value={edu.field}
                  onCommit={(v) => edit.updateEducation(eduIndex, { field: v })}
                  placeholder="Field"
                />
              </>
            )}
          </div>
          <div
            className={`${textSize} ${lineHeight}`}
            style={{ color: secondaryColor }}
          >
            <EditableText
              value={edu.institution}
              onCommit={(v) =>
                edit.updateEducation(eduIndex, { institution: v })
              }
              placeholder="Institution"
            />
          </div>
          <div className="text-xs">
            <EditableText
              value={edu.startDate}
              onCommit={(v) => edit.updateEducation(eduIndex, { startDate: v })}
              placeholder="Start"
            />
            {" - "}
            <EditableText
              value={edu.endDate || ""}
              onCommit={(v) => edit.updateEducation(eduIndex, { endDate: v })}
              placeholder="Present"
            />
          </div>
          {(edu.gpa || edit.editable) && (
            <div className="text-xs">
              GPA:{" "}
              <EditableText
                value={edu.gpa || ""}
                onCommit={(v) => edit.updateEducation(eduIndex, { gpa: v })}
                placeholder="—"
              />
            </div>
          )}
        </div>
      ),
    });
  });

  (resume.certifications ?? []).forEach((cert, certIndex) => {
    sidebarBlocks.push({
      sectionKey: "certifications",
      itemIndex: certIndex,
      node: (
        <div className="mb-1">
          <div className={`${textSize} font-semibold`}>
            <EditableText
              value={cert.name}
              onCommit={(v) => edit.updateCertification(certIndex, { name: v })}
              placeholder="Certification"
            />
          </div>
          <div className="text-xs" style={{ color: secondaryColor }}>
            <EditableText
              value={cert.issuer}
              onCommit={(v) =>
                edit.updateCertification(certIndex, { issuer: v })
              }
              placeholder="Issuer"
            />
            {" • "}
            <EditableText
              value={cert.date}
              onCommit={(v) => edit.updateCertification(certIndex, { date: v })}
              placeholder="Date"
            />
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
  const mainLabels: Record<string, string> = {
    summary: "PROFESSIONAL SUMMARY",
    experience: "PROFESSIONAL EXPERIENCE",
    projects: "KEY PROJECTS",
    publications: "PUBLICATIONS",
    volunteer: "VOLUNTEER EXPERIENCE",
  };

  const mainSectionHeading = (sectionKey: string) => {
    const title = mainLabels[sectionKey] ?? sectionKey;
    const canAdd = edit.editable && isListSection(sectionKey);
    return (
      <h2
        className={`${headingSize} group/heading mb-3 flex items-center justify-between gap-2 border-b-2 pb-1 font-bold`}
        style={{ color: primaryColor, borderColor: primaryColor }}
      >
        <span>{title}</span>
        {canAdd && (
          <button
            onClick={() => edit.addItem(sectionKey)}
            aria-label={`Add ${title} entry`}
            title={`Add ${title} entry`}
            className="text-agent-on-surface-variant hover:bg-agent-primary-container hover:text-agent-on-primary-container -my-1 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium opacity-0 transition-all duration-150 group-hover/heading:opacity-100"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            Add
          </button>
        )}
      </h2>
    );
  };

  const mainBlocks: Block[] = [];

  if (resume.summary || edit.editable) {
    mainBlocks.push({
      sectionKey: "summary",
      node: (
        <p className={`${textSize} ${lineHeight} leading-relaxed`}>
          <EditableText
            value={resume.summary}
            onCommit={(v) => edit.updateSummary(v)}
            fieldType="textarea"
            placeholder="Write a short professional summary…"
          />
        </p>
      ),
    });
  }

  (resume.experience ?? []).forEach((exp, expIndex) => {
    mainBlocks.push({
      sectionKey: "experience",
      itemIndex: expIndex,
      node: (
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className={`${textSize} font-bold`}>
                <EditableText
                  value={exp.role}
                  onCommit={(v) => edit.updateExperience(expIndex, { role: v })}
                  placeholder="Role"
                />
              </h3>
              <div
                className={`${textSize} ${lineHeight}`}
                style={{ color: secondaryColor }}
              >
                <EditableText
                  value={exp.company}
                  onCommit={(v) =>
                    edit.updateExperience(expIndex, { company: v })
                  }
                  placeholder="Company"
                />
              </div>
            </div>
            <div className="shrink-0 text-xs">
              <EditableText
                value={exp.startDate}
                onCommit={(v) =>
                  edit.updateExperience(expIndex, { startDate: v })
                }
                placeholder="Start"
              />
              {" - "}
              <EditableText
                value={exp.endDate || ""}
                onCommit={(v) =>
                  edit.updateExperience(expIndex, { endDate: v })
                }
                placeholder="Present"
              />
            </div>
          </div>
          {(exp.description || edit.editable) && (
            <p className={`${textSize} ${lineHeight} mt-1`}>
              <EditableText
                value={exp.description}
                onCommit={(v) =>
                  edit.updateExperience(expIndex, { description: v })
                }
                fieldType="textarea"
                placeholder="Describe your role…"
              />
            </p>
          )}
          {exp.achievements && exp.achievements.length > 0 && (
            <ul className="mt-2 space-y-1">
              {exp.achievements.map((a, i) => (
                <li key={i} className={`${textSize} ${lineHeight} ml-4`}>
                  <span style={{ color: accentColor }}>▸</span>{" "}
                  <EditableText
                    value={a}
                    onCommit={(v) =>
                      edit.updateExperienceAchievement(expIndex, i, v)
                    }
                    fieldType="bullet"
                    placeholder="Achievement"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      ),
    });
  });

  (resume.projects ?? []).forEach((project, projectIndex) => {
    mainBlocks.push({
      sectionKey: "projects",
      itemIndex: projectIndex,
      node: (
        <div>
          <div className="flex items-start justify-between gap-4">
            <h3 className={`${textSize} font-bold`}>
              <EditableText
                value={project.name}
                onCommit={(v) => edit.updateProject(projectIndex, { name: v })}
                placeholder="Project name"
              />
            </h3>
            {(project.startDate || project.endDate || edit.editable) && (
              <div className="shrink-0 text-xs">
                <EditableText
                  value={project.startDate || ""}
                  onCommit={(v) =>
                    edit.updateProject(projectIndex, { startDate: v })
                  }
                  placeholder="Start"
                />
                {" - "}
                <EditableText
                  value={project.endDate || ""}
                  onCommit={(v) =>
                    edit.updateProject(projectIndex, { endDate: v })
                  }
                  placeholder="Present"
                />
              </div>
            )}
          </div>
          <p className={`${textSize} ${lineHeight} mt-1`}>
            <EditableText
              value={project.description}
              onCommit={(v) =>
                edit.updateProject(projectIndex, { description: v })
              }
              fieldType="textarea"
              placeholder="Describe the project…"
            />
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
                  <EditableText
                    value={tech}
                    onCommit={(v) => {
                      const next = project.technologies.map((t, ti) =>
                        ti === i ? v : t
                      );
                      edit.updateProjectTechnologies(projectIndex, next);
                    }}
                    placeholder="Tech"
                  />
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

  const isFirstInSidebarSection = (i: number) =>
    i === 0 || sidebarBlocks[i].sectionKey !== sidebarBlocks[i - 1].sectionKey;
  const isFirstInMainSection = (i: number) =>
    i === 0 || mainBlocks[i].sectionKey !== mainBlocks[i - 1].sectionKey;

  const { setRef: setSidebarRef, pageGroups: sidebarPageGroups } =
    useBlockPaginator({
      count: sidebarBlocks.length,
      pageContentHeight: columnContentHeight,
      firstPageReserved: headerHeight,
      gapPx: 8, // matches the `mb-2` gap between rendered sidebar blocks
    });

  const { setRef: setMainRef, pageGroups: mainPageGroups } = useBlockPaginator({
    count: mainBlocks.length,
    pageContentHeight: columnContentHeight,
    firstPageReserved: headerHeight,
    gapPx: 16, // matches the `mb-4` gap between rendered main-column blocks
  });

  const pageCount = Math.max(
    sidebarPageGroups.length,
    mainPageGroups.length,
    1
  );

  // ── Item-level drag-and-drop (editor only) ─────────────────────────────────
  const sortableIds = [...sidebarBlocks, ...mainBlocks]
    .filter((b) => isListSection(b.sectionKey) && b.itemIndex !== undefined)
    .map((b) => `${b.sectionKey}-${b.itemIndex}`);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleItemDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const parse = (raw: string | number) => {
      const s = String(raw);
      const dash = s.lastIndexOf("-");
      return { section: s.slice(0, dash), index: Number(s.slice(dash + 1)) };
    };
    const from = parse(active.id);
    const to = parse(over.id);
    if (from.section !== to.section || !isListSection(from.section)) return;
    edit.moveItem(from.section, from.index, to.index);
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderSidebarBlocks = (indices: number[], prevLastSection: string) => {
    let currentSection = prevLastSection;
    return indices.map((idx) => {
      const block = sidebarBlocks[idx];
      const isNewSection = block.sectionKey !== currentSection;
      currentSection = block.sectionKey;

      const reorderable =
        edit.editable &&
        isListSection(block.sectionKey) &&
        block.itemIndex !== undefined;

      return (
        <div key={idx} className="mb-2">
          {isNewSection && (
            <div className="mb-2">
              {sidebarSectionHeading(block.sectionKey)}
            </div>
          )}
          {reorderable ? (
            <EditableItem
              id={`${block.sectionKey}-${block.itemIndex}`}
              label={
                sidebarLabels[block.sectionKey] ??
                mainLabels[block.sectionKey] ??
                block.sectionKey
              }
              onDelete={() =>
                edit.removeItem(
                  block.sectionKey as ListSectionId,
                  block.itemIndex as number
                )
              }
            >
              {block.node}
            </EditableItem>
          ) : (
            block.node
          )}
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

      const reorderable =
        edit.editable &&
        isListSection(block.sectionKey) &&
        block.itemIndex !== undefined;

      return (
        <div key={idx} className="mb-4">
          {isNewSection && (
            <div className="mb-2">{mainSectionHeading(block.sectionKey)}</div>
          )}
          {reorderable ? (
            <EditableItem
              id={`${block.sectionKey}-${block.itemIndex}`}
              label={
                sidebarLabels[block.sectionKey] ??
                mainLabels[block.sectionKey] ??
                block.sectionKey
              }
              onDelete={() =>
                edit.removeItem(
                  block.sectionKey as ListSectionId,
                  block.itemIndex as number
                )
              }
            >
              {block.node}
            </EditableItem>
          ) : (
            block.node
          )}
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
        <EditableText
          value={resume.header.name}
          onCommit={(v) => edit.updateHeader({ name: v })}
          placeholder="Your Name"
        />
      </h1>
      {(resume.header.headline || edit.editable) && (
        <div className={`${textSize} ${lineHeight} mb-2 text-white opacity-90`}>
          <EditableText
            value={resume.header.headline || ""}
            onCommit={(v) => edit.updateHeader({ headline: v })}
            placeholder="Professional headline"
          />
        </div>
      )}
      <div
        className={`flex flex-wrap gap-3 text-xs text-white opacity-90 ${lineHeight}`}
      >
        {(resume.header.email || edit.editable) && (
          <span>
            ✉{" "}
            <EditableText
              value={resume.header.email}
              onCommit={(v) => edit.updateHeader({ email: v })}
              placeholder="email@example.com"
            />
          </span>
        )}
        {(resume.header.phone || edit.editable) && (
          <span>
            📞{" "}
            <EditableText
              value={resume.header.phone || ""}
              onCommit={(v) => edit.updateHeader({ phone: v })}
              placeholder="Phone"
            />
          </span>
        )}
        {(resume.header.location || edit.editable) && (
          <span>
            📍{" "}
            <EditableText
              value={resume.header.location || ""}
              onCommit={(v) => edit.updateHeader({ location: v })}
              placeholder="Location"
            />
          </span>
        )}
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
    </div>
  );

  const body = (
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
              {isFirstInSidebarSection(i) && (
                <div className="mb-2">
                  {sidebarSectionHeading(block.sectionKey)}
                </div>
              )}
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
              {isFirstInMainSection(i) && (
                <div className="mb-2">
                  {mainSectionHeading(block.sectionKey)}
                </div>
              )}
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
            background={background}
            colors={colorsTuple}
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

  if (!edit.editable) return body;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleItemDragEnd}
    >
      <SortableContext
        items={sortableIds}
        strategy={verticalListSortingStrategy}
      >
        {body}
      </SortableContext>
    </DndContext>
  );
};
