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
    nameSize,
    background,
    colorsTuple,
  } = useResolveCustomization(customization);

  const { widthMm, widthPx, heightPx, marginPx, contentHeightPx } =
    getPageDimensions(customization.pageFormat, customization.marginSize);

  const edit = useInlineEdit();

  const sectionHeadingNode = (sectionKey: string) => {
    const title = sectionLabels[sectionKey] ?? sectionKey;
    const canAdd = edit.editable && isListSection(sectionKey);
    return (
      <h2
        className={`${headingSize} group/heading relative mb-4 text-center font-semibold uppercase`}
        style={{ color: primaryColor }}
      >
        <span>{title}</span>
        {canAdd && (
          <button
            onClick={() => edit.addItem(sectionKey)}
            aria-label={`Add ${title} entry`}
            title={`Add ${title} entry`}
            className="text-agent-on-surface-variant hover:bg-agent-primary-container hover:text-agent-on-primary-container absolute top-1/2 right-0 -my-1 flex -translate-y-1/2 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium opacity-0 transition-all duration-150 group-hover/heading:opacity-100"
          >
            <Icon name="plus" className="h-3.5 w-3.5" />
            Add
          </button>
        )}
      </h2>
    );
  };

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

  if (resume.summary || edit.editable) {
    blocks.push({
      sectionKey: "summary",
      node: (
        <p
          className={`${textSize} ${lineHeight} mx-auto max-w-3xl text-center`}
        >
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
    blocks.push({
      sectionKey: "experience",
      itemIndex: expIndex,
      node: (
        <div className="relative">
          <div
            className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2"
            style={{ backgroundColor: accentColor }}
          />
          <div
            className={`flex ${expIndex % 2 === 0 ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`w-5/12 ${expIndex % 2 === 0 ? "pr-8 text-right" : "pl-8 text-left"}`}
            >
              <div className="relative">
                <div
                  className={`absolute top-2 h-4 w-4 rounded-full border-2 ${
                    expIndex % 2 === 0 ? "-right-[3.75rem]" : "-left-[3.75rem]"
                  }`}
                  style={{ backgroundColor, borderColor: accentColor }}
                />
                <h3 className={`${textSize} font-bold`}>
                  <EditableText
                    value={exp.role}
                    onCommit={(v) =>
                      edit.updateExperience(expIndex, { role: v })
                    }
                    placeholder="Role"
                  />
                </h3>
                <div
                  className={`${textSize} ${lineHeight} font-medium`}
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
                <div className="mb-2 text-xs">
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
                  <ul className={`space-y-1 text-xs ${lineHeight}`}>
                    {exp.achievements.map((a, i) => (
                      <li key={i}>
                        •{" "}
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
            </div>
          </div>
        </div>
      ),
    });
  });

  (resume.education ?? []).forEach((edu, eduIndex) => {
    blocks.push({
      sectionKey: "education",
      itemIndex: eduIndex,
      node: (
        <div className="text-center">
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
                  onCommit={(v) => edit.updateEducation(eduIndex, { field: v })}
                  placeholder="Field"
                />
              </>
            )}
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
              <EditableText
                value={skill}
                onCommit={(v) => edit.updateSkill(idx, v)}
                placeholder="Skill"
              />
            </span>
          ))}
        </div>
      ),
    });
  }

  (resume.certifications ?? []).forEach((cert, certIndex) => {
    blocks.push({
      sectionKey: "certifications",
      itemIndex: certIndex,
      node: (
        <div className="text-center">
          <h3 className={`${textSize} font-semibold`}>
            <EditableText
              value={cert.name}
              onCommit={(v) => edit.updateCertification(certIndex, { name: v })}
              placeholder="Certification"
            />
          </h3>
          <p className="text-xs" style={{ color: secondaryColor }}>
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
          </p>
        </div>
      ),
    });
  });

  (resume.projects ?? []).forEach((project, projectIndex) => {
    blocks.push({
      sectionKey: "projects",
      itemIndex: projectIndex,
      node: (
        <div className="text-center">
          <h3 className={`${textSize} font-bold`}>
            <EditableText
              value={project.name}
              onCommit={(v) => edit.updateProject(projectIndex, { name: v })}
              placeholder="Project name"
            />
          </h3>
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
          {project.technologies && project.technologies.length > 0 && (
            <div className="mt-1 text-xs" style={{ color: secondaryColor }}>
              {project.technologies.map((tech, i) => (
                <span key={i}>
                  {i > 0 && ", "}
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

  const isFirstInSection = (i: number) =>
    i === 0 || blocks[i].sectionKey !== blocks[i - 1].sectionKey;

  const { setRef, pageGroups } = useBlockPaginator({
    count: blocks.length,
    pageContentHeight: contentHeightPx,
    firstPageReserved: headerHeight,
    gapPx: 24, // matches the `mb-6` gap between rendered blocks
  });

  // ── Item-level drag-and-drop (editor only) ─────────────────────────────────
  const sortableIds = blocks
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

  const headerNode = (
    <header className="mb-8 text-center">
      <h1
        className={`mb-2 ${nameSize} font-light`}
        style={{ color: primaryColor }}
      >
        <EditableText
          value={resume.header.name}
          onCommit={(v) => edit.updateHeader({ name: v })}
          placeholder="Your Name"
        />
      </h1>
      {(resume.header.headline || edit.editable) && (
        <div
          className={`${textSize} ${lineHeight} mb-2 font-medium`}
          style={{ color: accentColor }}
        >
          <EditableText
            value={resume.header.headline || ""}
            onCommit={(v) => edit.updateHeader({ headline: v })}
            placeholder="Professional headline"
          />
        </div>
      )}
      <div
        className={`${textSize} ${lineHeight} mb-2 flex flex-wrap justify-center gap-3`}
        style={{ color: secondaryColor }}
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
            {resume.header.linkedin}
          </a>
        )}
        {resume.header.github && (
          <a
            href={resume.header.github}
            className="hover:underline"
            style={{ color: accentColor }}
          >
            {resume.header.github}
          </a>
        )}
        {resume.header.website && (
          <a
            href={resume.header.website}
            className="hover:underline"
            style={{ color: accentColor }}
          >
            {resume.header.website}
          </a>
        )}
      </div>
    </header>
  );

  const renderPageBlocks = (indices: number[], prevLastSection: string) => {
    let currentSection = prevLastSection;
    return indices.map((idx) => {
      const block = blocks[idx];
      // pageGroups can hold stale indices while blocks rebuilds after a resume update
      if (!block) return null;
      const isNewSection = block.sectionKey !== currentSection;
      currentSection = block.sectionKey;

      const reorderable =
        edit.editable &&
        isListSection(block.sectionKey) &&
        block.itemIndex !== undefined;

      return (
        <div key={idx} className="mb-6">
          {isNewSection && (
            <div className="mb-3">{sectionHeadingNode(block.sectionKey)}</div>
          )}
          {reorderable ? (
            <EditableItem
              id={`${block.sectionKey}-${block.itemIndex}`}
              label={sectionLabels[block.sectionKey] ?? block.sectionKey}
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
      <MeasurementContainer widthMm={widthMm}>
        <div style={{ padding: marginPx, paddingBottom: 0 }}>
          <div ref={headerRef}>{headerNode}</div>
        </div>
        <div style={{ paddingLeft: marginPx, paddingRight: marginPx }}>
          {blocks.map((block, i) => (
            <div key={i} ref={setRef(i)}>
              {isFirstInSection(i) && (
                <div className="mb-3">
                  {sectionHeadingNode(block.sectionKey)}
                </div>
              )}
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
            background={background}
            colors={colorsTuple}
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
