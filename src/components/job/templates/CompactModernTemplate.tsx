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

export const CompactModernTemplate: React.FC<TemplateRendererProps> = ({
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

  // ── Section headings (small-caps, dense) ───────────────────────────────────
  const sectionHeadingNode = (sectionKey: string) => {
    const title = sectionLabels[sectionKey] ?? sectionKey;
    const canAdd = edit.editable && isListSection(sectionKey);
    return (
      <h2
        className={`${headingSize} group/heading mb-1.5 flex items-center justify-between gap-2 border-b pb-0.5 font-semibold tracking-wide uppercase`}
        style={{ color: primaryColor, borderColor: secondaryColor }}
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

  const sectionLabels: Record<string, string> = {
    summary: "Summary",
    experience: "Experience",
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

  if (resume.summary || edit.editable) {
    blocks.push({
      sectionKey: "summary",
      node: (
        <p className={`${textSize} ${lineHeight}`}>
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

  resume.experience.forEach((exp, expIndex) => {
    blocks.push({
      sectionKey: "experience",
      itemIndex: expIndex,
      node: (
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-semibold" style={{ color: accentColor }}>
              <EditableText
                value={exp.role}
                onCommit={(v) => edit.updateExperience(expIndex, { role: v })}
                placeholder="Role"
              />
              <span style={{ color: secondaryColor }}>
                {" — "}
                <EditableText
                  value={exp.company}
                  onCommit={(v) =>
                    edit.updateExperience(expIndex, { company: v })
                  }
                  placeholder="Company"
                />
              </span>
            </h3>
            <span
              className={`${textSize} shrink-0`}
              style={{ color: secondaryColor }}
            >
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
          {(exp.description || edit.editable) && (
            <p className={`${textSize} ${lineHeight} mb-0.5`}>
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
          {exp.achievements.length > 0 && (
            <ul
              className={`${textSize} ${lineHeight} list-inside list-disc space-y-0.5`}
            >
              {exp.achievements.map((a, i) => (
                <li key={i}>
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

  resume.projects.forEach((project, projectIndex) => {
    blocks.push({
      sectionKey: "projects",
      itemIndex: projectIndex,
      node: (
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-semibold" style={{ color: accentColor }}>
              <EditableText
                value={project.name}
                onCommit={(v) => edit.updateProject(projectIndex, { name: v })}
                placeholder="Project name"
              />
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
            {(project.startDate || project.endDate || edit.editable) && (
              <span
                className={`${textSize} shrink-0`}
                style={{ color: secondaryColor }}
              >
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
          <p className={`${textSize} ${lineHeight} mb-0.5`}>
            <EditableText
              value={project.description}
              onCommit={(v) =>
                edit.updateProject(projectIndex, { description: v })
              }
              fieldType="textarea"
              placeholder="Describe the project…"
            />
          </p>
          {project.technologies.length > 0 && (
            <div className={`${textSize}`} style={{ color: secondaryColor }}>
              <span className="font-medium">Tech:</span>{" "}
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

  if (resume.skills.length > 0) {
    blocks.push({
      sectionKey: "skills",
      node: (
        <div className={`${textSize} ${lineHeight}`}>
          {resume.skills.map((skill, i) => (
            <span key={i}>
              {i > 0 && " • "}
              <EditableText
                value={skill}
                onCommit={(v) => edit.updateSkill(i, v)}
                placeholder="Skill"
              />
            </span>
          ))}
        </div>
      ),
    });
  }

  resume.education.forEach((edu, eduIndex) => {
    blocks.push({
      sectionKey: "education",
      itemIndex: eduIndex,
      node: (
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="font-semibold" style={{ color: accentColor }}>
            <EditableText
              value={edu.degree}
              onCommit={(v) => edit.updateEducation(eduIndex, { degree: v })}
              placeholder="Degree"
            />
            {(edu.field || edit.editable) && (
              <>
                {" in "}
                <EditableText
                  value={edu.field}
                  onCommit={(v) => edit.updateEducation(eduIndex, { field: v })}
                  placeholder="Field"
                />
              </>
            )}
            <span style={{ color: secondaryColor }}>
              {" — "}
              <EditableText
                value={edu.institution}
                onCommit={(v) =>
                  edit.updateEducation(eduIndex, { institution: v })
                }
                placeholder="Institution"
              />
            </span>
          </h3>
          <span
            className={`${textSize} shrink-0`}
            style={{ color: secondaryColor }}
          >
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
          </span>
        </div>
      ),
    });
  });

  resume.certifications.forEach((cert, certIndex) => {
    blocks.push({
      sectionKey: "certifications",
      itemIndex: certIndex,
      node: (
        <div className={`${textSize}`}>
          <span className="font-semibold" style={{ color: accentColor }}>
            <EditableText
              value={cert.name}
              onCommit={(v) => edit.updateCertification(certIndex, { name: v })}
              placeholder="Certification"
            />
          </span>
          <span style={{ color: secondaryColor }}>
            {" — "}
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
          </span>
          {cert.url && (
            <a
              href={cert.url}
              className="ml-2 hover:underline"
              style={{ color: secondaryColor }}
            >
              [Verify]
            </a>
          )}
        </div>
      ),
    });
  });

  (resume.publications ?? []).forEach((pub) => {
    blocks.push({
      sectionKey: "publications",
      node: (
        <div className={`${textSize}`}>
          <span className="font-semibold" style={{ color: accentColor }}>
            {pub.title}
          </span>
          <span style={{ color: secondaryColor }}>
            {" — "}
            {pub.authors.join(", ")} • {pub.venue} • {pub.date}
            {pub.doi && ` • DOI: ${pub.doi}`}
          </span>
        </div>
      ),
    });
  });

  if ((resume.languages ?? []).length > 0) {
    blocks.push({
      sectionKey: "languages",
      node: (
        <div className={`${textSize} ${lineHeight}`}>
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
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-semibold" style={{ color: accentColor }}>
              {v.role}
              <span style={{ color: secondaryColor }}>
                {" — "}
                {v.organization}
              </span>
            </h3>
            <span
              className={`${textSize} shrink-0`}
              style={{ color: secondaryColor }}
            >
              {v.startDate} - {v.endDate || "Present"}
            </span>
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
        <div className={`${textSize}`}>
          <span className="font-semibold" style={{ color: accentColor }}>
            {award.title}
          </span>
          <span style={{ color: secondaryColor }}>
            {" — "}
            {award.issuer} • {award.date}
          </span>
          {award.description && (
            <p className={`${textSize} ${lineHeight}`}>{award.description}</p>
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

  // ── Pagination (tight gaps to maximize density) ─────────────────────────────
  const isFirstInSection = (i: number) =>
    i === 0 || blocks[i].sectionKey !== blocks[i - 1].sectionKey;

  const { setRef, pageGroups } = useBlockPaginator({
    count: blocks.length,
    pageContentHeight: contentHeightPx,
    firstPageReserved: headerHeight,
    gapPx: 8, // dense layout: matches the `mb-2` gap between rendered blocks
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

  // ── Header node (plain text contact line — no icons, ATS-friendly) ─────────
  const headerNode = (
    <header
      className="mb-4 border-b pb-2"
      style={{ borderColor: primaryColor }}
    >
      <h1
        className={`mb-1 ${nameSize} font-bold`}
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
          className={`${textSize} ${lineHeight} mb-1 font-medium`}
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
        className={`${textSize} ${lineHeight}`}
        style={{ color: secondaryColor }}
      >
        {(resume.header.email || edit.editable) && (
          <span>
            <EditableText
              value={resume.header.email}
              onCommit={(v) => edit.updateHeader({ email: v })}
              placeholder="email@example.com"
            />
          </span>
        )}
        {(resume.header.phone || edit.editable) && (
          <span>
            {" | "}
            <EditableText
              value={resume.header.phone || ""}
              onCommit={(v) => edit.updateHeader({ phone: v })}
              placeholder="Phone"
            />
          </span>
        )}
        {(resume.header.location || edit.editable) && (
          <span>
            {" | "}
            <EditableText
              value={resume.header.location || ""}
              onCommit={(v) => edit.updateHeader({ location: v })}
              placeholder="Location"
            />
          </span>
        )}
        {resume.header.linkedin && (
          <span>
            {" | "}
            <a
              href={resume.header.linkedin}
              className="hover:underline"
              style={{ color: accentColor }}
            >
              {resume.header.linkedin}
            </a>
          </span>
        )}
        {resume.header.github && (
          <span>
            {" | "}
            <a
              href={resume.header.github}
              className="hover:underline"
              style={{ color: accentColor }}
            >
              {resume.header.github}
            </a>
          </span>
        )}
        {resume.header.website && (
          <span>
            {" | "}
            <a
              href={resume.header.website}
              className="hover:underline"
              style={{ color: accentColor }}
            >
              {resume.header.website}
            </a>
          </span>
        )}
      </div>
    </header>
  );

  // ── Page content renderer ──────────────────────────────────────────────────
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
        <div key={idx} className="mb-2">
          {isNewSection && (
            <div className="mb-1">{sectionHeadingNode(block.sectionKey)}</div>
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
      {/* ── Off-screen measurement ──────────────────────────────────────────── */}
      <MeasurementContainer widthMm={widthMm}>
        <div style={{ padding: marginPx, paddingBottom: 0 }}>
          <div ref={headerRef}>{headerNode}</div>
        </div>
        <div style={{ paddingLeft: marginPx, paddingRight: marginPx }}>
          {blocks.map((block, i) => (
            <div key={i} ref={setRef(i)}>
              {isFirstInSection(i) && (
                <div className="mb-1">
                  {sectionHeadingNode(block.sectionKey)}
                </div>
              )}
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
