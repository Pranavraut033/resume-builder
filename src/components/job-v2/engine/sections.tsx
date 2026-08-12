import { EditableDateRange } from "@/components/job-v2/resume/EditableDateRange";
import { EditableLink } from "@/components/job-v2/resume/EditableLink";
import { EditableText } from "@/components/job-v2/resume/EditableText";
import { ListSectionId } from "@/components/job-v2/resume/InlineEditContext";
import { LanguageField } from "@/components/job-v2/resume/LanguageField";
import cn from "@/lib/cn";
import { formatDateRange } from "@/lib/date";
import { isHtml, htmlToPlainText } from "@/lib/htmlUtils";

import { bulletGlyph } from "./bulletGlyph";
import {
  Block,
  DomSectionBuilder,
  ResolvedTemplateConfig,
  ResolvedTheme,
  SectionRegistryEntry,
  TxtSectionBuilder,
} from "./types";

import type { HeadingStyle } from "@/types/customization";
import type { Skill } from "@/types/resume";
import type { ReactNode } from "react";

/**
 * One label/value row for `entryStyle: "table"` (bjet-professional). A CSS
 * grid `<div>`, not a real `<table>`/`<tr>` — each entry block sits inside
 * EditableItem's wrapper `<div>` (TemplateEngine.tsx), so real table rows at
 * that nesting level would be invalid HTML and break contenteditable. Grid
 * also has a direct react-pdf equivalent (flexDirection: "row"), which a
 * real table does not.
 */
function TableRow({
  label,
  children,
  accentColor,
  borderColor,
  last = false,
}: {
  label: string;
  children: ReactNode;
  accentColor: string;
  borderColor: string;
  last?: boolean;
}) {
  // No label (e.g. an uncategorized skills group) — skip the label column
  // entirely instead of reserving its width for a blank cell.
  if (!label) {
    return (
      <div className={last ? "" : "border-b"} style={{ borderColor }}>
        <div className="p-2 text-xs">{children}</div>
      </div>
    );
  }
  return (
    <div
      className={`grid grid-cols-[110px_1fr] ${last ? "" : "border-b"}`}
      style={{ borderColor }}
    >
      <div
        className="border-r p-2 text-xs font-semibold"
        style={{ backgroundColor: accentColor, borderColor }}
      >
        {label}
      </div>
      <div className="p-2 text-xs">{children}</div>
    </div>
  );
}

/** Shared table-entry wrapper: a bordered box containing `TableRow`s. */
function TableEntry({
  children,
  borderColor,
}: {
  children: ReactNode;
  borderColor: string;
}) {
  return (
    <div className="overflow-hidden border" style={{ borderColor }}>
      {children}
    </div>
  );
}

export const LIST_SECTIONS: readonly ListSectionId[] = [
  "experience",
  "education",
  "projects",
  "certifications",
  "publications",
  "volunteer",
  "awards",
];
export const isListSection = (key: string): key is ListSectionId =>
  (LIST_SECTIONS as readonly string[]).includes(key);

// Each builder is the per-section block-construction logic lifted verbatim
// from the old per-template duplication (originally ~80% of every ~850-line
// template file) — kept as ONE copy here instead of nine.

const summary: DomSectionBuilder = ({ resume, theme, edit }) => {
  if (!resume.summary && !edit.editable) return [];
  return [
    {
      sectionKey: "summary",
      node: (
        <p className={`${theme.textSize} ${theme.lineHeight}`}>
          <EditableText
            value={resume.summary}
            onCommit={(v) => edit.updateSummary(v)}
            fieldType="textarea"
            placeholder="Write a short professional summary…"
          />
        </p>
      ),
    },
  ];
};

/** Shared achievements/bullet-list renderer — one `EditableText` over the
 * newline-joined string, `renderDisplay` swaps only the glyph/list-style so
 * the edit surface (a single bullet-mode textarea) never changes shape. */
function achievementsField({
  items,
  onCommit,
  theme,
  bulletStyle,
  editable,
}: {
  items: string[];
  onCommit: (items: string[]) => void;
  theme: ResolvedTheme;
  bulletStyle: ResolvedTemplateConfig["bulletStyle"];
  editable: boolean;
}) {
  if (items.length === 0 && !editable) return null;
  return (
    <EditableText
      value={items.join("\n")}
      onCommit={(v) => onCommit(v.split("\n").filter(Boolean))}
      fieldType="bullet"
      placeholder="Add bullet points, one per line…"
      renderDisplay={(v) => (
        <ul
          className={`${theme.textSize} ${theme.lineHeight} list-none space-y-1`}
        >
          {v
            .split("\n")
            .filter(Boolean)
            .map((a, i) => (
              <li key={i}>
                <span className="mr-1.5" style={{ color: theme.accentColor }}>
                  {bulletGlyph(bulletStyle)}
                </span>
                {a}
              </li>
            ))}
        </ul>
      )}
    />
  );
}

/** Wraps an `EditableDateRange` in a tinted pill when `dateStyle === "badge"`, otherwise leaves it as secondary-colored plain text. */
function dateNode({
  dates,
  theme,
  dateStyle,
  textSize,
}: {
  dates: ReactNode;
  theme: ResolvedTheme;
  dateStyle: ResolvedTemplateConfig["dateStyle"];
  textSize: string;
}) {
  if (dateStyle === "badge") {
    return (
      <span
        className={`${textSize} shrink-0 rounded-full px-3 py-1 font-medium`}
        style={{
          backgroundColor: theme.primaryColor + "1a",
          color: theme.primaryColor,
        }}
      >
        {dates}
      </span>
    );
  }
  return (
    <span
      className={`${textSize} shrink-0`}
      style={{ color: theme.secondaryColor }}
    >
      {dates}
    </span>
  );
}

const experience: DomSectionBuilder = ({ resume, theme, edit, config }) =>
  resume.experience.map((exp, expIndex): Block => {
    const entryStyle = config.entryStyle;
    const isMultiColumn = config.columns > 1;
    const dates = (
      <EditableDateRange
        startDate={exp.startDate}
        endDate={exp.endDate}
        dateFormat={theme.dateFormat}
        onCommitStart={(v) => edit.updateExperience(expIndex, { startDate: v })}
        onCommitEnd={(v) => edit.updateExperience(expIndex, { endDate: v })}
      />
    );

    const achievements = achievementsField({
      items: exp.achievements,
      onCommit: (items) => edit.updateExperienceAchievements(expIndex, items),
      theme,
      bulletStyle: config.bulletStyle,
      editable: edit.editable,
    });

    if (entryStyle === "compact") {
      return {
        sectionKey: "experience",
        itemIndex: expIndex,
        node: (
          <div>
            <p className={`${theme.textSize}`}>
              <span
                className="font-semibold"
                style={{ color: theme.accentColor }}
              >
                <EditableText
                  value={exp.role}
                  onCommit={(v) => edit.updateExperience(expIndex, { role: v })}
                  placeholder="Role"
                />
              </span>
              {" — "}
              <EditableText
                value={exp.company}
                onCommit={(v) =>
                  edit.updateExperience(expIndex, { company: v })
                }
                placeholder="Company"
              />
              <span style={{ color: theme.secondaryColor }}>
                {"  ·  "}
                {dates}
              </span>
            </p>
            {(exp.description || edit.editable) && (
              <div className={`${theme.textSize} leading-snug`}>
                <EditableText
                  value={exp.description}
                  onCommit={(v) =>
                    edit.updateExperience(expIndex, { description: v })
                  }
                  fieldType="richtext"
                  placeholder="Describe your role…"
                />
              </div>
            )}
            {achievements}
          </div>
        ),
      };
    }

    if (entryStyle === "timeline" || entryStyle === "marker") {
      const roleField = (
        <EditableText
          value={exp.role}
          onCommit={(v) => edit.updateExperience(expIndex, { role: v })}
          placeholder="Role"
        />
      );
      const companyField = (
        <EditableText
          value={exp.company}
          onCommit={(v) => edit.updateExperience(expIndex, { company: v })}
          placeholder="Company"
        />
      );
      const description = (exp.description || edit.editable) && (
        <div className={`${theme.textSize} ${theme.lineHeight} mt-1 mb-2`}>
          <EditableText
            value={exp.description}
            onCommit={(v) =>
              edit.updateExperience(expIndex, { description: v })
            }
            fieldType="richtext"
            placeholder="Describe your role…"
          />
        </div>
      );

      // "timeline" draws a continuous rail with a dot on each entry (rail
      // segments butt together via `tight` on the Block, see below); "marker"
      // (creative-modern) drops the rail for a floating dot.
      return {
        sectionKey: "experience",
        itemIndex: expIndex,
        tight: entryStyle === "timeline" ? true : undefined,
        node:
          entryStyle === "timeline" ? (
            <div
              className="relative border-l-2 pb-3 pl-4"
              style={{ borderColor: theme.accentColor }}
            >
              <span
                className="absolute top-1.5 -left-[5px] h-2 w-2 rounded-full"
                style={{ backgroundColor: theme.accentColor }}
              />
              <p
                className={`${theme.textSize} mb-0.5`}
                style={{ color: theme.secondaryColor }}
              >
                {dates}
              </p>
              <h3
                className="font-semibold"
                style={{ color: theme.accentColor }}
              >
                {roleField}
              </h3>
              <p
                className={`${theme.textSize}`}
                style={{ color: theme.secondaryColor }}
              >
                {companyField}
              </p>
              {description}
              {achievements}
            </div>
          ) : (
            <div className="relative pl-5">
              <span
                className="absolute top-1.5 left-0 h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: theme.accentColor }}
              />
              <h3
                className="font-semibold"
                style={{ color: theme.accentColor }}
              >
                {roleField}
              </h3>
              <p
                className={`${theme.textSize}`}
                style={{ color: theme.secondaryColor }}
              >
                {companyField}
                {" · "}
                {dates}
              </p>
              {description}
              {achievements}
            </div>
          ),
      };
    }

    if (entryStyle === "table") {
      const borderColor = theme.secondaryColor + "40";
      return {
        sectionKey: "experience",
        itemIndex: expIndex,
        node: (
          <TableEntry borderColor={borderColor}>
            <TableRow
              label="Company"
              accentColor={theme.accentColor + "20"}
              borderColor={borderColor}
            >
              <EditableText
                value={exp.company}
                onCommit={(v) =>
                  edit.updateExperience(expIndex, { company: v })
                }
                placeholder="Company"
              />
            </TableRow>
            <TableRow
              label="Role"
              accentColor={theme.accentColor + "20"}
              borderColor={borderColor}
            >
              <EditableText
                value={exp.role}
                onCommit={(v) => edit.updateExperience(expIndex, { role: v })}
                placeholder="Role"
              />
            </TableRow>
            <TableRow
              label="Duration"
              accentColor={theme.accentColor + "20"}
              borderColor={borderColor}
            >
              {dates}
            </TableRow>
            <TableRow
              label="Details"
              accentColor={theme.accentColor + "20"}
              borderColor={borderColor}
              last
            >
              {(exp.description || edit.editable) && (
                <div className={`${theme.lineHeight} mb-1`}>
                  <EditableText
                    value={exp.description}
                    onCommit={(v) =>
                      edit.updateExperience(expIndex, { description: v })
                    }
                    fieldType="richtext"
                    placeholder="Describe your role…"
                  />
                </div>
              )}
              {achievements}
            </TableRow>
          </TableEntry>
        ),
      };
    }

    return {
      sectionKey: "experience",
      itemIndex: expIndex,
      node: (
        <div>
          <div
            className={cn(
              "mb-1 flex items-start justify-between",
              isMultiColumn ? "flex-col gap-2" : "gap-4"
            )}
          >
            <div>
              <h3
                className="font-semibold"
                style={{ color: theme.accentColor }}
              >
                <EditableText
                  value={exp.role}
                  onCommit={(v) => edit.updateExperience(expIndex, { role: v })}
                  placeholder="Role"
                />
              </h3>
              <p
                className={`${theme.textSize} ${theme.lineHeight}`}
                style={{ color: theme.secondaryColor }}
              >
                <EditableText
                  value={exp.company}
                  onCommit={(v) =>
                    edit.updateExperience(expIndex, { company: v })
                  }
                  placeholder="Company"
                />
              </p>
            </div>
            {dateNode({
              dates,
              theme,
              dateStyle: config.dateStyle,
              textSize: theme.textSize,
            })}
          </div>
          {(exp.description || edit.editable) && (
            <div className={`${theme.textSize} ${theme.lineHeight} mb-2`}>
              <EditableText
                value={exp.description}
                onCommit={(v) =>
                  edit.updateExperience(expIndex, { description: v })
                }
                fieldType="richtext"
                placeholder="Describe your role…"
              />
            </div>
          )}
          {achievements}
        </div>
      ),
    };
  });

const projects: DomSectionBuilder = ({ resume, theme, edit, config }) =>
  resume.projects.map((project, projectIndex): Block => {
    const entryStyle = config.entryStyle;
    const nameField = (
      <EditableText
        value={project.name}
        onCommit={(v) => edit.updateProject(projectIndex, { name: v })}
        placeholder="Project name"
      />
    );
    const urlLinkField = (project.url || edit.editable) && (
      <EditableLink
        href={project.url ?? ""}
        onCommit={(v) => edit.updateProject(projectIndex, { url: v })}
        placeholder="https://…"
        className={`${theme.textSize} ml-2 hover:underline`}
        style={{ color: theme.secondaryColor }}
      >
        [Link]
      </EditableLink>
    );
    const descriptionField = (
      <EditableText
        value={project.description}
        onCommit={(v) => edit.updateProject(projectIndex, { description: v })}
        fieldType="richtext"
        placeholder="Describe the project…"
      />
    );
    const dateRangeField = (project.startDate ||
      project.endDate ||
      edit.editable) && (
      <EditableDateRange
        startDate={project.startDate ?? null}
        endDate={project.endDate ?? null}
        dateFormat={theme.dateFormat}
        onCommitStart={(v) =>
          edit.updateProject(projectIndex, { startDate: v })
        }
        onCommitEnd={(v) => edit.updateProject(projectIndex, { endDate: v })}
      />
    );
    const technologiesField = project.technologies.length > 0 && (
      <div
        className={`${theme.textSize}`}
        style={{ color: theme.secondaryColor }}
      >
        <span className="font-medium">Technologies:</span>{" "}
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
    );

    if (entryStyle === "compact") {
      const compactTechField = project.technologies.length > 0 && (
        <span style={{ color: theme.secondaryColor }}>
          {"  ·  "}
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
        </span>
      );
      return {
        sectionKey: "projects",
        itemIndex: projectIndex,
        node: (
          <div>
            <p className={`${theme.textSize}`}>
              <span
                className="font-semibold"
                style={{ color: theme.accentColor }}
              >
                {nameField}
              </span>
              {urlLinkField}
              {compactTechField}
              {dateRangeField && (
                <span style={{ color: theme.secondaryColor }}>
                  {"  ·  "}
                  {dateRangeField}
                </span>
              )}
            </p>
            {(project.description || edit.editable) && (
              <div className={`${theme.textSize} leading-snug`}>
                {descriptionField}
              </div>
            )}
          </div>
        ),
      };
    }

    if (entryStyle === "timeline" || entryStyle === "marker") {
      const dateLine = dateRangeField && (
        <p
          className={`${theme.textSize}`}
          style={{ color: theme.secondaryColor }}
        >
          {dateRangeField}
        </p>
      );
      return {
        sectionKey: "projects",
        itemIndex: projectIndex,
        tight: entryStyle === "timeline" ? true : undefined,
        node:
          entryStyle === "timeline" ? (
            <div
              className="relative border-l-2 pb-3 pl-4"
              style={{ borderColor: theme.accentColor }}
            >
              <span
                className="absolute top-1.5 -left-[5px] h-2 w-2 rounded-full"
                style={{ backgroundColor: theme.accentColor }}
              />
              {dateRangeField && (
                <p
                  className={`${theme.textSize} mb-0.5`}
                  style={{ color: theme.secondaryColor }}
                >
                  {dateRangeField}
                </p>
              )}
              <h3
                className="font-semibold"
                style={{ color: theme.accentColor }}
              >
                {nameField}
                {urlLinkField}
              </h3>
              <div className={`${theme.textSize} ${theme.lineHeight} mt-1`}>
                {descriptionField}
              </div>
              {technologiesField}
            </div>
          ) : (
            <div className="relative pl-5">
              <span
                className="absolute top-1.5 left-0 h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: theme.accentColor }}
              />
              <h3
                className="font-semibold"
                style={{ color: theme.accentColor }}
              >
                {nameField}
                {urlLinkField}
              </h3>
              {dateLine}
              <div className={`${theme.textSize} ${theme.lineHeight} mt-1`}>
                {descriptionField}
              </div>
              {technologiesField}
            </div>
          ),
      };
    }

    if (entryStyle === "table") {
      const borderColor = theme.secondaryColor + "40";
      return {
        sectionKey: "projects",
        itemIndex: projectIndex,
        node: (
          <TableEntry borderColor={borderColor}>
            <TableRow
              label="Project"
              accentColor={theme.accentColor + "20"}
              borderColor={borderColor}
            >
              {nameField}
              {urlLinkField}
            </TableRow>
            <TableRow
              label="Duration"
              accentColor={theme.accentColor + "20"}
              borderColor={borderColor}
            >
              {dateRangeField}
            </TableRow>
            <TableRow
              label="Details"
              accentColor={theme.accentColor + "20"}
              borderColor={borderColor}
              last
            >
              <div className={`${theme.lineHeight} mb-1`}>
                {descriptionField}
              </div>
              {technologiesField}
            </TableRow>
          </TableEntry>
        ),
      };
    }

    return {
      sectionKey: "projects",
      itemIndex: projectIndex,
      node: (
        <div>
          <h3 className="font-semibold" style={{ color: theme.accentColor }}>
            {nameField}
            {urlLinkField}
          </h3>
          {dateRangeField && (
            <div>
              {dateNode({
                dates: dateRangeField,
                theme,
                dateStyle: config.dateStyle,
                textSize: theme.textSize,
              })}
            </div>
          )}
          <div className={`${theme.textSize} ${theme.lineHeight} mb-1`}>
            {descriptionField}
          </div>
          {technologiesField}
        </div>
      ),
    };
  });

/** A run of skills sharing the same (optional) category, in first-seen order. */
interface SkillGroup {
  category?: string;
  skills: Skill[];
}

/**
 * Groups skills by `category` in first-seen order; skills with no category
 * form a single trailing implicit group with no heading.
 */
function groupSkills(skills: Skill[]): SkillGroup[] {
  const groups: SkillGroup[] = [];
  const byCategory = new Map<string, SkillGroup>();
  let uncategorized: SkillGroup | null = null;
  for (const skill of skills) {
    const category = skill.category?.trim();
    if (category) {
      const key = category.toLowerCase();
      let group = byCategory.get(key);
      if (!group) {
        group = { category, skills: [] };
        byCategory.set(key, group);
        groups.push(group);
      }
      group.skills.push(skill);
    } else {
      if (!uncategorized) uncategorized = { skills: [] };
      uncategorized.skills.push(skill);
    }
  }
  if (uncategorized) groups.push(uncategorized);
  return groups;
}

/**
 * Serializes grouped skills into the editable text syntax:
 * `Category: *PrimarySkill, secondarySkill | Category2: skill`
 */
function serializeSkillsForEdit(skills: Skill[]): string {
  return groupSkills(skills)
    .map((group) => {
      const list = group.skills
        .map((s) => (s.tier === "primary" ? `*${s.name}` : s.name))
        .join(", ");
      return group.category ? `${group.category}: ${list}` : list;
    })
    .join(" | ");
}

/** Inverse of {@link serializeSkillsForEdit}. */
function parseSkillsFromEdit(text: string): Skill[] {
  return text
    .split("|")
    .flatMap((segment) => {
      const colonIndex = segment.indexOf(":");
      const hasCategory = colonIndex !== -1;
      const category = hasCategory ? segment.slice(0, colonIndex).trim() : null;
      const skillsPart = hasCategory ? segment.slice(colonIndex + 1) : segment;
      return skillsPart
        .split(",")
        .map((raw) => raw.trim())
        .filter(Boolean)
        .map((raw): Skill => {
          const primary = raw.startsWith("*");
          const name = primary ? raw.slice(1).trim() : raw;
          return { name, category, tier: primary ? "primary" : null };
        });
    })
    .filter((s) => s.name.length > 0);
}

/** Styles whose paginator block is single (the whole section in one block) —
 * `list`/`grid`/`columns` stay one-block-per-category so a long skills list
 * can still split across a page break; see `skills` below. */
const SINGLE_BLOCK_SKILL_STYLES: ReadonlySet<
  ResolvedTemplateConfig["skillStyle"]
> = new Set(["inline", "chips", "table"]);

/** Renders skill group(s) per `skillStyle` — chips/list/table/grid/columns
 * are purely `renderDisplay` alternatives to the always-on inline text. For
 * `list`/`grid`/`columns`, `groupIndex` selects ONE category (one paginator
 * block per category, so a long skills list can split across a page break).
 * For the single-block styles (`inline`/`chips`/`table`) every group renders
 * together regardless of `groupIndex` — `skills` below only ever hands them
 * a single block (see `serializeSkillsForEdit`/`parseSkillsFromEdit` — the
 * edit surface itself stays the single textarea over the whole string, only
 * the *display* is sliced/grouped). */
function skillsHeadingStyle(config: ResolvedTemplateConfig): HeadingStyle {
  const inSidebar = config.columns > 1 && config.sectionColumn?.skills === 0;
  return inSidebar ? config.headingSidebar : config.heading;
}

function skillLabelClassFor(headingStyle: HeadingStyle): string {
  switch (headingStyle) {
    case "uppercase":
      return "uppercase tracking-wide";
    case "serif":
      return "font-serif italic";
    default:
      return "";
  }
}

/** A skill category label styled as a scaled-down section heading — bold,
 * matching the template's heading typography, with the skill list meant to
 * sit directly underneath (tight margin, no side-by-side column). Templates
 * whose heading is "accent-rule" get a short 20%-width underline instead of
 * the section heading's full-width rule. */
function SkillLabel({
  category,
  headingStyle,
  color,
}: {
  category: string;
  headingStyle: HeadingStyle;
  color: string;
}) {
  return (
    <div className="mb-0.5">
      <div
        className={cn("text-xs font-bold", skillLabelClassFor(headingStyle))}
        style={{ color }}
      >
        {category}
      </div>
      {headingStyle === "accent-rule" && (
        <div
          className="mt-0.5"
          style={{ width: "20%", borderBottomWidth: 2, borderColor: color }}
        />
      )}
    </div>
  );
}

function skillsGroupDisplay(
  raw: string,
  groupIndex: number,
  theme: ResolvedTheme,
  config: ResolvedTemplateConfig
) {
  const skillStyle = config.skillStyle;
  const allGroups = groupSkills(parseSkillsFromEdit(raw));
  const groups =
    allGroups.length === 0
      ? []
      : SINGLE_BLOCK_SKILL_STYLES.has(skillStyle)
        ? allGroups
        : [allGroups[groupIndex]];
  const headingStyle = skillsHeadingStyle(config);

  if (skillStyle === "chips") {
    return (
      <div className="flex flex-col gap-2">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.category && (
              <SkillLabel
                category={group.category}
                headingStyle={headingStyle}
                color={theme.primaryColor}
              />
            )}
            <div className="flex flex-wrap gap-1.5">
              {group.skills.map((s, si) => (
                <span
                  key={si}
                  className="rounded-full px-1 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: theme.accentColor + "1a",
                    color: theme.accentColor,
                  }}
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (skillStyle === "list") {
    return (
      <div className="space-y-2">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.category && (
              <SkillLabel
                category={group.category}
                headingStyle={headingStyle}
                color={theme.primaryColor}
              />
            )}
            <div className={`text-xs ${theme.lineHeight}`}>
              {group.skills.map((s, si) => (
                <span key={si}>
                  {si > 0 && ", "}
                  {s.tier === "primary" ? <strong>{s.name}</strong> : s.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (skillStyle === "table") {
    // bjet-professional: two ROWS per category (a coloured label bar, then
    // the skills underneath) instead of the label|content two-COLUMN layout
    // `TableRow` uses for every other "table" entryStyle field — deliberately
    // bespoke, not `TableRow`, so Company/Role/Duration/Details elsewhere
    // keep their own side-by-side layout untouched.
    const borderColor = theme.secondaryColor + "40";
    return (
      <div
        className="overflow-hidden rounded-md border"
        style={{ borderColor }}
      >
        {groups.length > 0 ? (
          groups.map((group, gi) => (
            <div
              key={gi}
              className={gi === groups.length - 1 ? "" : "border-b"}
              style={{ borderColor }}
            >
              {group.category && (
                <div
                  className={cn(
                    "px-2 py-1 text-xs font-bold",
                    skillLabelClassFor(headingStyle)
                  )}
                  style={{
                    backgroundColor: theme.accentColor + "20",
                    color: theme.primaryColor,
                  }}
                >
                  {group.category}
                </div>
              )}
              <div className={`px-2 py-1.5 text-xs ${theme.lineHeight}`}>
                {group.skills.map((s) => s.name).join(", ")}
              </div>
            </div>
          ))
        ) : (
          <div className="px-2 py-1.5 text-xs">—</div>
        )}
      </div>
    );
  }

  if (skillStyle === "grid") {
    return (
      <div className="flex flex-col gap-2">
        {groups.map((group, gi) => (
          <div key={gi}>
            {group.category && (
              <SkillLabel
                category={group.category}
                headingStyle={headingStyle}
                color={theme.primaryColor}
              />
            )}
            <div className={`text-xs ${theme.lineHeight}`}>
              {group.skills.map((s, si) => (
                <span key={si}>
                  {si > 0 && ", "}
                  {s.tier === "primary" ? <strong>{s.name}</strong> : s.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // "columns" and "inline" now share the same label-above-content shape as
  // list/grid — the side-by-side label column and the inline-paragraph
  // flow both got replaced by the subheading treatment (see SkillLabel).
  return (
    <div className="flex flex-col gap-2">
      {groups.map((group, gi) => (
        <div key={gi}>
          {group.category && (
            <SkillLabel
              category={group.category}
              headingStyle={headingStyle}
              color={theme.primaryColor}
            />
          )}
          <div className={`text-xs ${theme.lineHeight}`}>
            {group.skills.map((s, si) => (
              <span key={si}>
                {si > 0 && ", "}
                {s.tier === "primary" ? <strong>{s.name}</strong> : s.name}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const skills: DomSectionBuilder = ({ resume, theme, edit, config }) => {
  if (resume.skills.length === 0 && !edit.editable) return [];
  const serialized = serializeSkillsForEdit(resume.skills);
  const groupCount = SINGLE_BLOCK_SKILL_STYLES.has(config.skillStyle)
    ? 1
    : Math.max(groupSkills(resume.skills).length, 1);

  // Single-block styles (inline/chips/table) get ONE block for the whole
  // section — a flowing paragraph or one bordered box shouldn't paginate
  // mid-category. The splittable styles (list/grid/columns) still get one
  // block per category group so a long skills list can split across a page
  // break — but the edit surface must stay a SINGLE EditableText over the
  // whole serialized string, so only the first block renders the real
  // editable field; later blocks render display-only nodes for their own
  // group via the same `skillsGroupDisplay` used by the first block's
  // `renderDisplay`.
  return Array.from(
    { length: groupCount },
    (_, groupIndex): Block => ({
      sectionKey: "skills",
      node: (
        <div className={`${theme.textSize} ${theme.lineHeight}`}>
          {groupIndex === 0 ? (
            <EditableText
              value={serialized}
              onCommit={(v) => edit.updateSkills(parseSkillsFromEdit(v))}
              fieldType="textarea"
              placeholder="Languages: *TypeScript, JavaScript | Frameworks: React…"
              renderDisplay={(v) =>
                skillsGroupDisplay(v, groupIndex, theme, config)
              }
            />
          ) : (
            skillsGroupDisplay(serialized, groupIndex, theme, config)
          )}
        </div>
      ),
    })
  );
};

const education: DomSectionBuilder = ({ resume, theme, edit, config }) =>
  resume.education.map((edu, eduIndex): Block => {
    const entryStyle = config.entryStyle;
    const isMultiColumn = config.columns > 1;

    const institutionField = (
      <EditableText
        value={edu.institution}
        onCommit={(v) => edit.updateEducation(eduIndex, { institution: v })}
        placeholder="Institution"
      />
    );
    const gpaField = (edu.gpa || edit.editable) && (
      <>
        GPA:{" "}
        <EditableText
          value={edu.gpa || ""}
          onCommit={(v) => edit.updateEducation(eduIndex, { gpa: v })}
          placeholder="—"
        />
      </>
    );
    const degreeField = (
      <>
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
      </>
    );
    const dates = (
      <EditableDateRange
        startDate={edu.startDate}
        endDate={edu.endDate}
        dateFormat={theme.dateFormat}
        onCommitStart={(v) => edit.updateEducation(eduIndex, { startDate: v })}
        onCommitEnd={(v) => edit.updateEducation(eduIndex, { endDate: v })}
      />
    );

    if (entryStyle === "compact") {
      return {
        sectionKey: "education",
        itemIndex: eduIndex,
        node: (
          <p className={`${theme.textSize}`}>
            <span
              className="font-semibold"
              style={{ color: theme.accentColor }}
            >
              {degreeField}
            </span>
            {" — "}
            <EditableText
              value={edu.institution}
              onCommit={(v) =>
                edit.updateEducation(eduIndex, { institution: v })
              }
              placeholder="Institution"
            />
            <span style={{ color: theme.secondaryColor }}>
              {"  ·  "}
              {dates}
              {gpaField && (
                <>
                  {"  ·  "}
                  {gpaField}
                </>
              )}
            </span>
          </p>
        ),
      };
    }

    if (entryStyle === "timeline" || entryStyle === "marker") {
      return {
        sectionKey: "education",
        itemIndex: eduIndex,
        tight: entryStyle === "timeline" ? true : undefined,
        node:
          entryStyle === "timeline" ? (
            <div
              className="relative border-l-2 pb-3 pl-4"
              style={{ borderColor: theme.accentColor }}
            >
              <span
                className="absolute top-1.5 -left-[5px] h-2 w-2 rounded-full"
                style={{ backgroundColor: theme.accentColor }}
              />
              <p
                className={`${theme.textSize} mb-0.5`}
                style={{ color: theme.secondaryColor }}
              >
                {dates}
              </p>
              <h3
                className="font-semibold"
                style={{ color: theme.accentColor }}
              >
                {degreeField}
              </h3>
              <p
                className={`${theme.textSize}`}
                style={{ color: theme.secondaryColor }}
              >
                {institutionField}
              </p>
              {gpaField && (
                <p
                  className={`${theme.textSize}`}
                  style={{ color: theme.secondaryColor }}
                >
                  {gpaField}
                </p>
              )}
            </div>
          ) : (
            <div className="relative pl-5">
              <span
                className="absolute top-1.5 left-0 h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: theme.accentColor }}
              />
              <h3
                className="font-semibold"
                style={{ color: theme.accentColor }}
              >
                {degreeField}
              </h3>
              <p
                className={`${theme.textSize}`}
                style={{ color: theme.secondaryColor }}
              >
                {institutionField}
                {" · "}
                {dates}
              </p>
              {gpaField && (
                <p
                  className={`${theme.textSize}`}
                  style={{ color: theme.secondaryColor }}
                >
                  {gpaField}
                </p>
              )}
            </div>
          ),
      };
    }

    if (entryStyle === "table") {
      const borderColor = theme.secondaryColor + "40";
      return {
        sectionKey: "education",
        itemIndex: eduIndex,
        node: (
          <TableEntry borderColor={borderColor}>
            <TableRow
              label="Institution"
              accentColor={theme.accentColor + "20"}
              borderColor={borderColor}
            >
              {institutionField}
            </TableRow>
            <TableRow
              label="Degree"
              accentColor={theme.accentColor + "20"}
              borderColor={borderColor}
            >
              {degreeField}
            </TableRow>
            <TableRow
              label="Duration"
              accentColor={theme.accentColor + "20"}
              borderColor={borderColor}
              last={!gpaField}
            >
              {dates}
            </TableRow>
            {gpaField && (
              <TableRow
                label="GPA"
                accentColor={theme.accentColor + "20"}
                borderColor={borderColor}
                last
              >
                {gpaField}
              </TableRow>
            )}
          </TableEntry>
        ),
      };
    }

    return {
      sectionKey: "education",
      itemIndex: eduIndex,
      node: (
        <div>
          <div
            className={cn(
              "flex items-start justify-between",
              isMultiColumn ? "flex-col gap-2" : "gap-4"
            )}
          >
            <div>
              <h3
                className="font-semibold"
                style={{ color: theme.accentColor }}
              >
                {degreeField}
              </h3>
              <p
                className={`${theme.textSize} ${theme.lineHeight}`}
                style={{ color: theme.secondaryColor }}
              >
                {institutionField}
              </p>
            </div>
            {dateNode({
              dates,
              theme,
              dateStyle: config.dateStyle,
              textSize: theme.textSize,
            })}
          </div>
          {gpaField && (
            <p
              className={`${theme.textSize}`}
              style={{ color: theme.secondaryColor }}
            >
              {gpaField}
            </p>
          )}
        </div>
      ),
    };
  });

const certifications: DomSectionBuilder = ({ resume, theme, edit }) =>
  resume.certifications.map(
    (cert, certIndex): Block => ({
      sectionKey: "certifications",
      itemIndex: certIndex,
      node: (
        <div>
          <h3 className="font-semibold" style={{ color: theme.accentColor }}>
            <EditableText
              value={cert.name}
              onCommit={(v) => edit.updateCertification(certIndex, { name: v })}
              placeholder="Certification"
            />
          </h3>
          <p
            className={`${theme.textSize}`}
            style={{ color: theme.secondaryColor }}
          >
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
            {(cert.url || edit.editable) && (
              <EditableLink
                href={cert.url ?? ""}
                onCommit={(v) =>
                  edit.updateCertification(certIndex, { url: v })
                }
                placeholder="https://…"
                className="ml-2 hover:underline"
                style={{ color: theme.secondaryColor }}
              >
                [Verify]
              </EditableLink>
            )}
          </p>
        </div>
      ),
    })
  );

const publications: DomSectionBuilder = ({ resume, theme, edit }) =>
  (resume.publications ?? []).map(
    (pub, pubIndex): Block => ({
      sectionKey: "publications",
      itemIndex: pubIndex,
      node: (
        <div>
          <h3 className="font-semibold" style={{ color: theme.accentColor }}>
            <EditableText
              value={pub.title}
              onCommit={(v) => edit.updatePublication(pubIndex, { title: v })}
              placeholder="Publication title"
            />
          </h3>
          <p className={`${theme.textSize} ${theme.lineHeight}`}>
            <EditableText
              value={pub.authors.join(", ")}
              onCommit={(v) =>
                edit.updatePublication(pubIndex, {
                  authors: v
                    .split(",")
                    .map((a) => a.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Authors"
            />
          </p>
          <p
            className={`${theme.textSize}`}
            style={{ color: theme.secondaryColor }}
          >
            <EditableText
              value={pub.venue}
              onCommit={(v) => edit.updatePublication(pubIndex, { venue: v })}
              placeholder="Venue"
            />
            {" • "}
            <EditableText
              value={pub.date}
              onCommit={(v) => edit.updatePublication(pubIndex, { date: v })}
              placeholder="Date"
            />
            {(pub.doi || edit.editable) && (
              <>
                {" • DOI: "}
                <EditableText
                  value={pub.doi ?? ""}
                  onCommit={(v) => edit.updatePublication(pubIndex, { doi: v })}
                  placeholder="DOI"
                />
              </>
            )}
            {(pub.url || edit.editable) && (
              <EditableLink
                href={pub.url ?? ""}
                onCommit={(v) => edit.updatePublication(pubIndex, { url: v })}
                placeholder="https://…"
                className="ml-2 hover:underline"
                style={{ color: theme.secondaryColor }}
              >
                [View]
              </EditableLink>
            )}
          </p>
        </div>
      ),
    })
  );

const languages: DomSectionBuilder = ({ resume, theme, edit }) => {
  if ((resume.languages ?? []).length === 0 && !edit.editable) return [];
  return [
    {
      sectionKey: "languages",
      node: (
        <div
          className={`${theme.textSize} ${theme.lineHeight} flex flex-wrap gap-x-4 gap-y-1`}
        >
          {(resume.languages ?? []).map((l, idx) => (
            <LanguageField
              key={idx}
              language={l}
              onUpdate={(patch) => edit.updateLanguage(idx, patch)}
              onRemove={() => edit.removeLanguage(idx)}
            />
          ))}
          {edit.editable && (
            <button
              onClick={edit.addLanguage}
              className="text-agent-primary hover:text-agent-primary/70 text-xs opacity-60 hover:opacity-100"
            >
              + Add
            </button>
          )}
        </div>
      ),
    },
  ];
};

const hobbies: DomSectionBuilder = ({ resume, theme, edit }) => {
  const list = resume.hobbies ?? [];
  if (list.length === 0 && !edit.editable) return [];
  return [
    {
      sectionKey: "hobbies",
      node: (
        <div className={`${theme.textSize} ${theme.lineHeight}`}>
          <EditableText
            value={list.join(", ")}
            onCommit={(v) =>
              edit.updateHobbies(
                v
                  .split(",")
                  .map((h) => h.trim())
                  .filter(Boolean)
              )
            }
            placeholder="Reading, hiking, chess…"
          />
        </div>
      ),
    },
  ];
};

const volunteer: DomSectionBuilder = ({ resume, theme, edit, config }) =>
  (resume.volunteer ?? []).map((v, volIndex): Block => {
    const entryStyle = config.entryStyle;
    const isMultiColumn = config.columns > 1;
    const dates = (
      <EditableDateRange
        startDate={v.startDate}
        endDate={v.endDate}
        dateFormat={theme.dateFormat}
        onCommitStart={(val) =>
          edit.updateVolunteer(volIndex, { startDate: val })
        }
        onCommitEnd={(val) => edit.updateVolunteer(volIndex, { endDate: val })}
      />
    );
    const roleField = (
      <EditableText
        value={v.role}
        onCommit={(val) => edit.updateVolunteer(volIndex, { role: val })}
        placeholder="Role"
      />
    );
    const organizationField = (
      <EditableText
        value={v.organization}
        onCommit={(val) =>
          edit.updateVolunteer(volIndex, { organization: val })
        }
        placeholder="Organization"
      />
    );
    const descriptionField = (v.description || edit.editable) && (
      <EditableText
        value={v.description}
        onCommit={(val) => edit.updateVolunteer(volIndex, { description: val })}
        fieldType="richtext"
        placeholder="Describe your volunteer work…"
      />
    );

    if (entryStyle === "compact") {
      return {
        sectionKey: "volunteer",
        itemIndex: volIndex,
        node: (
          <div>
            <p className={`${theme.textSize}`}>
              <span
                className="font-semibold"
                style={{ color: theme.accentColor }}
              >
                {roleField}
              </span>
              {" — "}
              {organizationField}
              <span style={{ color: theme.secondaryColor }}>
                {"  ·  "}
                {dates}
              </span>
            </p>
            {descriptionField && (
              <div className={`${theme.textSize} leading-snug`}>
                {descriptionField}
              </div>
            )}
          </div>
        ),
      };
    }

    if (entryStyle === "timeline" || entryStyle === "marker") {
      return {
        sectionKey: "volunteer",
        itemIndex: volIndex,
        tight: entryStyle === "timeline" ? true : undefined,
        node:
          entryStyle === "timeline" ? (
            <div
              className="relative border-l-2 pb-3 pl-4"
              style={{ borderColor: theme.accentColor }}
            >
              <span
                className="absolute top-1.5 -left-[5px] h-2 w-2 rounded-full"
                style={{ backgroundColor: theme.accentColor }}
              />
              <p
                className={`${theme.textSize} mb-0.5`}
                style={{ color: theme.secondaryColor }}
              >
                {dates}
              </p>
              <h3
                className="font-semibold"
                style={{ color: theme.accentColor }}
              >
                {roleField}
              </h3>
              <p
                className={`${theme.textSize}`}
                style={{ color: theme.secondaryColor }}
              >
                {organizationField}
              </p>
              {descriptionField && (
                <div className={`${theme.textSize} ${theme.lineHeight} mt-1`}>
                  {descriptionField}
                </div>
              )}
            </div>
          ) : (
            <div className="relative pl-5">
              <span
                className="absolute top-1.5 left-0 h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: theme.accentColor }}
              />
              <h3
                className="font-semibold"
                style={{ color: theme.accentColor }}
              >
                {roleField}
              </h3>
              <p
                className={`${theme.textSize}`}
                style={{ color: theme.secondaryColor }}
              >
                {organizationField}
                {" · "}
                {dates}
              </p>
              {descriptionField && (
                <div className={`${theme.textSize} ${theme.lineHeight} mt-1`}>
                  {descriptionField}
                </div>
              )}
            </div>
          ),
      };
    }

    if (entryStyle === "table") {
      const borderColor = theme.secondaryColor + "40";
      return {
        sectionKey: "volunteer",
        itemIndex: volIndex,
        node: (
          <TableEntry borderColor={borderColor}>
            <TableRow
              label="Organization"
              accentColor={theme.accentColor + "20"}
              borderColor={borderColor}
            >
              {organizationField}
            </TableRow>
            <TableRow
              label="Role"
              accentColor={theme.accentColor + "20"}
              borderColor={borderColor}
            >
              {roleField}
            </TableRow>
            <TableRow
              label="Duration"
              accentColor={theme.accentColor + "20"}
              borderColor={borderColor}
              last={!descriptionField}
            >
              {dates}
            </TableRow>
            {descriptionField && (
              <TableRow
                label="Details"
                accentColor={theme.accentColor + "20"}
                borderColor={borderColor}
                last
              >
                {descriptionField}
              </TableRow>
            )}
          </TableEntry>
        ),
      };
    }

    return {
      sectionKey: "volunteer",
      itemIndex: volIndex,
      node: (
        <div>
          <div
            className={cn(
              "mb-1 flex items-start justify-between",
              isMultiColumn ? "flex-col gap-2" : "gap-4"
            )}
          >
            <div>
              <h3
                className="font-semibold"
                style={{ color: theme.accentColor }}
              >
                {roleField}
              </h3>
              <p
                className={`${theme.textSize} ${theme.lineHeight}`}
                style={{ color: theme.secondaryColor }}
              >
                {organizationField}
              </p>
            </div>
            {dateNode({
              dates,
              theme,
              dateStyle: config.dateStyle,
              textSize: theme.textSize,
            })}
          </div>
          {descriptionField && (
            <div className={`${theme.textSize} ${theme.lineHeight}`}>
              {descriptionField}
            </div>
          )}
        </div>
      ),
    };
  });

const awards: DomSectionBuilder = ({ resume, theme, edit }) =>
  (resume.awards ?? []).map(
    (award, awardIndex): Block => ({
      sectionKey: "awards",
      itemIndex: awardIndex,
      node: (
        <div>
          <h3 className="font-semibold" style={{ color: theme.accentColor }}>
            <EditableText
              value={award.title}
              onCommit={(v) => edit.updateAward(awardIndex, { title: v })}
              placeholder="Award title"
            />
          </h3>
          <p
            className={`${theme.textSize}`}
            style={{ color: theme.secondaryColor }}
          >
            <EditableText
              value={award.issuer}
              onCommit={(v) => edit.updateAward(awardIndex, { issuer: v })}
              placeholder="Issuer"
            />
            {" • "}
            <EditableText
              value={award.date}
              onCommit={(v) => edit.updateAward(awardIndex, { date: v })}
              placeholder="Date"
            />
          </p>
          {(award.description || edit.editable) && (
            <div className={`${theme.textSize} ${theme.lineHeight}`}>
              <EditableText
                value={award.description ?? ""}
                onCommit={(v) =>
                  edit.updateAward(awardIndex, { description: v })
                }
                fieldType="richtext"
                placeholder="Describe the award…"
              />
            </div>
          )}
        </div>
      ),
    })
  );

// ponytail: custom sections render bullets/text only (matches
// CustomSectionSchema.type in src/types/resume.ts). Add a richer renderer
// when a user actually needs dated/timeline entries.
const custom: DomSectionBuilder = ({ resume, instance, theme, config }) => {
  const section = (resume.sectionLayout?.custom ?? []).find(
    (c) => c.id === instance.id
  );
  if (!section) return [];
  return [
    {
      sectionKey: instance.id,
      node:
        section.type === "text" ? (
          <p className={`${theme.textSize} ${theme.lineHeight}`}>
            {section.items.join(" ")}
          </p>
        ) : (
          <ul
            className={`${theme.textSize} ${theme.lineHeight} list-none space-y-1`}
          >
            {section.items.map((item, i) => (
              <li key={i}>
                <span className="mr-1.5" style={{ color: theme.accentColor }}>
                  {bulletGlyph(config.bulletStyle)}
                </span>
                {item}
              </li>
            ))}
          </ul>
        ),
    },
  ];
};

// ── TXT builders ────────────────────────────────────────────────────────────
// Plain-text equivalent of each dom() builder. Shares buildSections() with
// the DOM/PDF engines, so order/hidden/custom apply identically here —
// fixes the old txtExport.ts silently dropping publications/languages/
// volunteer/awards (it had its own hardcoded, incomplete section list).

const plain = (text: string): string =>
  isHtml(text) ? htmlToPlainText(text) : text;

const txtSummary: TxtSectionBuilder = ({ resume }) =>
  resume.summary ? `Summary:\n${resume.summary}\n` : "";

const txtExperience: TxtSectionBuilder = ({ resume }) => {
  if (resume.experience.length === 0) return "";
  const body = resume.experience
    .map((exp) => {
      const achievements = exp.achievements.map((a) => `  - ${a}`).join("\n");
      return `${exp.role} at ${exp.company}\n${formatDateRange(exp.startDate, exp.endDate)}\n${plain(exp.description)}${achievements ? `\n${achievements}` : ""}`;
    })
    .join("\n\n");
  return `Experience:\n${body}\n`;
};

const txtProjects: TxtSectionBuilder = ({ resume }) => {
  if (resume.projects.length === 0) return "";
  const body = resume.projects
    .map(
      (p) =>
        `${p.name}\n${plain(p.description)}${p.technologies.length ? `\nTechnologies: ${p.technologies.join(", ")}` : ""}`
    )
    .join("\n\n");
  return `Projects:\n${body}\n`;
};

const txtSkills: TxtSectionBuilder = ({ resume }) => {
  if (resume.skills.length === 0) return "";
  const body = groupSkills(resume.skills)
    .map((group) => {
      const list = group.skills.map((s) => s.name).join(", ");
      return group.category ? `${group.category}: ${list}` : list;
    })
    .join("\n");
  return `Skills:\n${body}\n`;
};

const txtEducation: TxtSectionBuilder = ({ resume }) => {
  if (resume.education.length === 0) return "";
  const body = resume.education
    .map(
      (edu) =>
        `${edu.degree} in ${edu.field}, ${edu.institution}, ${formatDateRange(edu.startDate, edu.endDate)}`
    )
    .join("\n");
  return `Education:\n${body}\n`;
};

const txtCertifications: TxtSectionBuilder = ({ resume }) => {
  if (resume.certifications.length === 0) return "";
  const body = resume.certifications
    .map((c) => `${c.name}, ${c.issuer}, ${c.date}`)
    .join("\n");
  return `Certifications:\n${body}\n`;
};

const txtPublications: TxtSectionBuilder = ({ resume }) => {
  const pubs = resume.publications ?? [];
  if (pubs.length === 0) return "";
  const body = pubs
    .map((p) => `${p.title} — ${p.authors.join(", ")} (${p.venue}, ${p.date})`)
    .join("\n");
  return `Publications:\n${body}\n`;
};

const txtLanguages: TxtSectionBuilder = ({ resume }) => {
  const langs = resume.languages ?? [];
  if (langs.length === 0) return "";
  return `Languages:\n${langs.map((l) => `${l.name} (${l.proficiency})`).join(", ")}\n`;
};

const txtVolunteer: TxtSectionBuilder = ({ resume }) => {
  const vols = resume.volunteer ?? [];
  if (vols.length === 0) return "";
  const body = vols
    .map(
      (v) =>
        `${v.role} at ${v.organization}, ${formatDateRange(v.startDate, v.endDate)}\n${v.description}`
    )
    .join("\n\n");
  return `Volunteer:\n${body}\n`;
};

const txtAwards: TxtSectionBuilder = ({ resume }) => {
  const awardList = resume.awards ?? [];
  if (awardList.length === 0) return "";
  const body = awardList
    .map(
      (a) =>
        `${a.title}, ${a.issuer}, ${a.date}${a.description ? `\n${a.description}` : ""}`
    )
    .join("\n");
  return `Awards:\n${body}\n`;
};

const txtHobbies: TxtSectionBuilder = ({ resume }) => {
  const list = resume.hobbies ?? [];
  if (list.length === 0) return "";
  return `Hobbies & Interests:\n${list.join(", ")}\n`;
};

const txtCustom: TxtSectionBuilder = ({ resume, instance }) => {
  const section = (resume.sectionLayout?.custom ?? []).find(
    (c) => c.id === instance.id
  );
  if (!section || section.items.length === 0) return "";
  return `${instance.title}:\n${section.items.join(section.type === "text" ? " " : "\n")}\n`;
};

export const SECTION_REGISTRY: Record<string, SectionRegistryEntry> = {
  summary: { dom: summary, txt: txtSummary },
  experience: { dom: experience, txt: txtExperience },
  projects: { dom: projects, txt: txtProjects },
  skills: { dom: skills, txt: txtSkills },
  education: { dom: education, txt: txtEducation },
  certifications: { dom: certifications, txt: txtCertifications },
  publications: { dom: publications, txt: txtPublications },
  languages: { dom: languages, txt: txtLanguages },
  volunteer: { dom: volunteer, txt: txtVolunteer },
  awards: { dom: awards, txt: txtAwards },
  hobbies: { dom: hobbies, txt: txtHobbies },
  custom: { dom: custom, txt: txtCustom },
};
