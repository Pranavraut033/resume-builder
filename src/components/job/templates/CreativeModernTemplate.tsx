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

  const edit = useInlineEdit();

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
  const leftLabels: Record<string, string> = {
    summary: "ABOUT ME",
    skills: "SKILLS",
    education: "EDUCATION",
    certifications: "CERTIFICATIONS",
    languages: "LANGUAGES",
    awards: "AWARDS",
  };

  const leftHeading = (sectionKey: string) => {
    const title = leftLabels[sectionKey] ?? sectionKey;
    const canAdd = edit.editable && isListSection(sectionKey);
    return (
      <h2
        className={`${headingSize} group/heading mb-3 flex items-center justify-between gap-2 border-b-2 pb-2 font-bold`}
        style={{ color: primaryColor, borderColor: accentColor }}
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

  const leftBlocks: Block[] = [];

  if (resume.summary || edit.editable) {
    leftBlocks.push({
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
              <span className={`${textSize} ${lineHeight}`}>
                <EditableText
                  value={skill}
                  onCommit={(v) => edit.updateSkill(idx, v)}
                  placeholder="Skill"
                />
              </span>
            </div>
          ))}
        </div>
      ),
    });
  }

  (resume.education ?? []).forEach((edu, eduIndex) => {
    leftBlocks.push({
      sectionKey: "education",
      itemIndex: eduIndex,
      node: (
        <div>
          <h3 className={`${textSize} font-bold`}>
            <EditableText
              value={edu.degree}
              onCommit={(v) => edit.updateEducation(eduIndex, { degree: v })}
              placeholder="Degree"
            />
          </h3>
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
            {(edu.field || edit.editable) && (
              <>
                {" • "}
                <EditableText
                  value={edu.field}
                  onCommit={(v) =>
                    edit.updateEducation(eduIndex, { field: v })
                  }
                  placeholder="Field"
                />
              </>
            )}
          </div>
          <div className="text-xs">
            <EditableText
              value={edu.startDate}
              onCommit={(v) =>
                edit.updateEducation(eduIndex, { startDate: v })
              }
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
    leftBlocks.push({
      sectionKey: "certifications",
      itemIndex: certIndex,
      node: (
        <div>
          <div className={`${textSize} font-semibold`}>
            <EditableText
              value={cert.name}
              onCommit={(v) =>
                edit.updateCertification(certIndex, { name: v })
              }
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
          </div>
          <div className="text-xs">
            <EditableText
              value={cert.date}
              onCommit={(v) =>
                edit.updateCertification(certIndex, { date: v })
              }
              placeholder="Date"
            />
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
  const rightLabels: Record<string, string> = {
    experience: "EXPERIENCE",
    projects: "PROJECTS",
    volunteer: "VOLUNTEER",
    publications: "PUBLICATIONS",
  };

  const rightHeading = (sectionKey: string) => {
    const title = rightLabels[sectionKey] ?? sectionKey;
    const canAdd = edit.editable && isListSection(sectionKey);
    return (
      <h2
        className={`${headingSize} group/heading mb-4 flex items-center justify-between gap-2 border-b-2 pb-2 font-bold`}
        style={{ color: primaryColor, borderColor: accentColor }}
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

  const rightBlocks: Block[] = [];

  (resume.experience ?? []).forEach((exp, expIndex) => {
    rightBlocks.push({
      sectionKey: "experience",
      itemIndex: expIndex,
      node: (
        <div className="relative pl-6">
          <div
            className="absolute top-1 left-0 h-3 w-3 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <div className="mb-1 flex items-start justify-between gap-4">
            <h3 className={`${textSize} font-bold`}>
              <EditableText
                value={exp.role}
                onCommit={(v) => edit.updateExperience(expIndex, { role: v })}
                placeholder="Role"
              />
            </h3>
            <span className="ml-2 text-xs whitespace-nowrap">
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
            </span>
          </div>
          <div
            className={`${textSize} ${lineHeight} mb-2 font-semibold`}
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
          {(exp.description || edit.editable) && (
            <p className={`${textSize} ${lineHeight} mb-2`}>
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
            <ul className="space-y-1">
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
    rightBlocks.push({
      sectionKey: "projects",
      itemIndex: projectIndex,
      node: (
        <div className="relative pl-6">
          <div
            className="absolute top-1 left-0 h-3 w-3 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <div className="flex items-start justify-between gap-4">
            <h3 className={`${textSize} font-bold`}>
              <EditableText
                value={project.name}
                onCommit={(v) =>
                  edit.updateProject(projectIndex, { name: v })
                }
                placeholder="Project name"
              />
            </h3>
            {(project.startDate || project.endDate || edit.editable) && (
              <span className="text-xs whitespace-nowrap">
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
              </span>
            )}
          </div>
          <p className={`${textSize} ${lineHeight} mt-1 mb-2`}>
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
      const reorderable =
        edit.editable &&
        isListSection(block.sectionKey) &&
        block.itemIndex !== undefined;
      return (
        <div key={idx} className="mb-4">
          {isNewSection && (
            <div className="mb-2">{leftHeading(block.sectionKey)}</div>
          )}
          {reorderable ? (
            <EditableItem
              id={`${block.sectionKey}-${block.itemIndex}`}
              label={
                (leftLabels[block.sectionKey] ??
                  rightLabels[block.sectionKey]) ??
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

  const renderRightBlocks = (indices: number[], prevLastSection: string) => {
    let currentSection = prevLastSection;
    return indices.map((idx) => {
      const block = rightBlocks[idx];
      const isNewSection = block.sectionKey !== currentSection;
      currentSection = block.sectionKey;
      const reorderable =
        edit.editable &&
        isListSection(block.sectionKey) &&
        block.itemIndex !== undefined;
      return (
        <div key={idx} className="mb-5">
          {isNewSection && (
            <div className="mb-2">{rightHeading(block.sectionKey)}</div>
          )}
          {reorderable ? (
            <EditableItem
              id={`${block.sectionKey}-${block.itemIndex}`}
              label={
                (leftLabels[block.sectionKey] ??
                  rightLabels[block.sectionKey]) ??
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
        <EditableText
          value={resume.header.name}
          onCommit={(v) => edit.updateHeader({ name: v })}
          placeholder="Your Name"
        />
      </h1>
      {(resume.header.headline || edit.editable) && (
        <div className={`${textSize} ${lineHeight} mb-3 text-white opacity-95`}>
          <EditableText
            value={resume.header.headline || ""}
            onCommit={(v) => edit.updateHeader({ headline: v })}
            placeholder="Professional headline"
          />
        </div>
      )}
      <div
        className={`flex flex-wrap gap-4 text-sm text-white opacity-95 ${lineHeight}`}
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
    </header>
  );

  // ── Item-level drag-and-drop (editor only) ─────────────────────────────────
  const sortableIds = [...leftBlocks, ...rightBlocks]
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
