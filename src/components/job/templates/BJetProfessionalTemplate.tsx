"use client";
// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

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

  const edit = useInlineEdit();

  const sectionHeaderStyle: React.CSSProperties = {
    backgroundColor: `${secondaryColor}30`,
    color: primaryColor,
  };

  const sectionLabels: Record<string, string> = {
    summary: "PROFESSIONAL SUMMARY",
    experience: "PROFESSIONAL EXPERIENCE",
    education: "EDUCATION",
    skills: "CORE COMPETENCIES",
    projects: "KEY PROJECTS",
    certifications: "CERTIFICATIONS",
    publications: "PUBLICATIONS",
    languages: "LANGUAGES",
    volunteer: "VOLUNTEER EXPERIENCE",
    awards: "AWARDS",
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

  // ── Section heading row (used for sections that don't use sectionTable()) ──
  const sectionHeadingRow = (sectionKey: string) => {
    const title = sectionLabels[sectionKey] ?? sectionKey;
    const canAdd = edit.editable && isListSection(sectionKey);
    return (
      <table className="mb-0 w-full border-2 border-b-0" style={{ borderColor: primaryColor }}>
        <tbody>
          <tr>
            <td
              className="group/heading flex items-center justify-between gap-2 p-2 font-bold"
              style={sectionHeaderStyle}
            >
              <span>{title}</span>
              {canAdd && (
                <button
                  onClick={() => edit.addItem(sectionKey as ListSectionId)}
                  aria-label={`Add ${title} entry`}
                  title={`Add ${title} entry`}
                  className="text-agent-on-surface-variant hover:bg-agent-primary-container hover:text-agent-on-primary-container -my-1 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium opacity-0 transition-all duration-150 group-hover/heading:opacity-100"
                >
                  <Icon name="plus" className="h-3.5 w-3.5" />
                  Add
                </button>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    );
  };

  const blocks: Block[] = [];

  if (resume.summary || edit.editable) {
    blocks.push({
      sectionKey: "summary",
      node: sectionTable(
        "PROFESSIONAL SUMMARY",
        tdCell(
          <p className={`${textSize} ${lineHeight} leading-relaxed`}>
            <EditableText
              value={resume.summary}
              onCommit={(v) => edit.updateSummary(v)}
              fieldType="textarea"
              placeholder="Write a short professional summary…"
            />
          </p>
        )
      ),
    });
  }

  (resume.experience ?? []).forEach((exp, expIndex) => {
    blocks.push({
      sectionKey: "experience",
      itemIndex: expIndex,
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
                    <span className={`${textSize} font-bold`}>
                      <EditableText
                        value={exp.role}
                        onCommit={(v) =>
                          edit.updateExperience(expIndex, { role: v })
                        }
                        placeholder="Role"
                      />
                    </span>
                    <span className="mx-2">•</span>
                    <span
                      className={`${textSize} font-semibold`}
                      style={{ color: secondaryColor }}
                    >
                      <EditableText
                        value={exp.company}
                        onCommit={(v) =>
                          edit.updateExperience(expIndex, { company: v })
                        }
                        placeholder="Company"
                      />
                    </span>
                  </div>
                  <div className="text-xs shrink-0">
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
                      <li
                        key={i}
                        className={`${textSize} ${lineHeight} ml-5 list-disc`}
                      >
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
            )}
          </tbody>
        </table>
      ),
    });
  });

  (resume.education ?? []).forEach((edu, eduIndex) => {
    blocks.push({
      sectionKey: "education",
      itemIndex: eduIndex,
      node: (
        <table
          className="w-full border-x-2 border-b-2"
          style={{ borderColor: primaryColor }}
        >
          <tbody>
            {tdCell(
              <div className="flex justify-between gap-4">
                <div>
                  <div className={`${textSize} font-bold`}>
                    <EditableText
                      value={edu.degree}
                      onCommit={(v) =>
                        edit.updateEducation(eduIndex, { degree: v })
                      }
                      placeholder="Degree"
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
                </div>
                <div className="text-xs shrink-0">
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
                    onCommit={(v) =>
                      edit.updateEducation(eduIndex, { endDate: v })
                    }
                    placeholder="Present"
                  />
                  {(edu.gpa || edit.editable) && (
                    <>
                      {" • GPA: "}
                      <EditableText
                        value={edu.gpa || ""}
                        onCommit={(v) =>
                          edit.updateEducation(eduIndex, { gpa: v })
                        }
                        placeholder="—"
                      />
                    </>
                  )}
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
      sectionKey: "skills",
      node: sectionTable(
        "CORE COMPETENCIES",
        tdCell(
          <div className="grid grid-cols-3 gap-2">
            {(resume.skills ?? []).map((skill, idx) => (
              <div key={idx} className={`${textSize} ${lineHeight}`}>
                •{" "}
                <EditableText
                  value={skill}
                  onCommit={(v) => edit.updateSkill(idx, v)}
                  placeholder="Skill"
                />
              </div>
            ))}
          </div>
        )
      ),
    });
  }

  (resume.projects ?? []).forEach((project, projectIndex) => {
    blocks.push({
      sectionKey: "projects",
      itemIndex: projectIndex,
      node: (
        <table
          className="w-full border-x-2 border-b-2"
          style={{ borderColor: primaryColor }}
        >
          <tbody>
            {tdCell(
              <div>
                <div className="flex justify-between gap-4">
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
                    <div className="text-xs shrink-0">
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
                  <div className={`${textSize} ${lineHeight}`}>
                    <span className="font-semibold">Technologies: </span>
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
            )}
          </tbody>
        </table>
      ),
    });
  });

  (resume.certifications ?? []).forEach((cert, certIndex) => {
    blocks.push({
      sectionKey: "certifications",
      itemIndex: certIndex,
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
                    <EditableText
                      value={cert.name}
                      onCommit={(v) =>
                        edit.updateCertification(certIndex, { name: v })
                      }
                      placeholder="Certification"
                    />
                  </div>
                  <div
                    className={`${textSize} ${lineHeight}`}
                    style={{ color: secondaryColor }}
                  >
                    <EditableText
                      value={cert.issuer}
                      onCommit={(v) =>
                        edit.updateCertification(certIndex, { issuer: v })
                      }
                      placeholder="Issuer"
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
                <div className="text-xs shrink-0">
                  <EditableText
                    value={cert.date}
                    onCommit={(v) =>
                      edit.updateCertification(certIndex, { date: v })
                    }
                    placeholder="Date"
                  />
                </div>
              </div>
            )}
          </tbody>
        </table>
      ),
    });
  });

  (resume.publications ?? []).forEach((pub) => {
    blocks.push({
      sectionKey: "publications",
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
      sectionKey: "languages",
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
      sectionKey: "volunteer",
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
      sectionKey: "awards",
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
    <table
      className="mb-6 w-full border-2"
      style={{ borderColor: primaryColor }}
    >
      <tbody>
        <tr>
          <td className="p-4" style={{ backgroundColor: primaryColor }}>
            <h1 className="text-2xl font-bold text-white">
              <EditableText
                value={resume.header.name}
                onCommit={(v) => edit.updateHeader({ name: v })}
                placeholder="Your Name"
                className="text-white"
              />
            </h1>
            {(resume.header.headline || edit.editable) && (
              <div className={`${textSize} mt-1 text-white`}>
                <EditableText
                  value={resume.header.headline || ""}
                  onCommit={(v) => edit.updateHeader({ headline: v })}
                  placeholder="Professional headline"
                  className="text-white"
                />
              </div>
            )}
          </td>
        </tr>
        <tr>
          <td className="border-t p-3" style={{ borderColor: secondaryColor }}>
            <div className={`${textSize} ${lineHeight} space-y-1`}>
              {(resume.header.email || edit.editable) && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Email:</span>
                  <span>
                    <EditableText
                      value={resume.header.email}
                      onCommit={(v) => edit.updateHeader({ email: v })}
                      placeholder="email@example.com"
                    />
                  </span>
                </div>
              )}
              {(resume.header.phone || edit.editable) && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Phone:</span>
                  <span>
                    <EditableText
                      value={resume.header.phone || ""}
                      onCommit={(v) => edit.updateHeader({ phone: v })}
                      placeholder="Phone"
                    />
                  </span>
                </div>
              )}
              {(resume.header.location || edit.editable) && (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Location:</span>
                  <span>
                    <EditableText
                      value={resume.header.location || ""}
                      onCommit={(v) => edit.updateHeader({ location: v })}
                      placeholder="Location"
                    />
                  </span>
                </div>
              )}
              <div className="flex flex-wrap gap-4">
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
            </div>
          </td>
        </tr>
      </tbody>
    </table>
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

      const needsHeadingRow =
        isNewSection &&
        !["summary", "skills", "languages"].includes(block.sectionKey);

      return (
        <div key={idx}>
          {needsHeadingRow && sectionHeadingRow(block.sectionKey)}
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
        <div style={{ padding: marginPx }}>
          <div ref={headerRef}>{headerNode}</div>
        </div>
        <div style={{ paddingLeft: marginPx, paddingRight: marginPx }}>
          {(() => {
            let currentSection = "";
            return blocks.map((block, i) => {
              const isNewSection = block.sectionKey !== currentSection;
              currentSection = block.sectionKey;
              const needsHeadingRow =
                isNewSection &&
                !["summary", "skills", "languages"].includes(
                  block.sectionKey
                );
              return (
                <div key={i} ref={setRef(i)}>
                  {needsHeadingRow && sectionHeadingRow(block.sectionKey)}
                  {block.node}
                </div>
              );
            });
          })()}
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
                overflowY: "hidden",
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
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        {body}
      </SortableContext>
    </DndContext>
  );
};
