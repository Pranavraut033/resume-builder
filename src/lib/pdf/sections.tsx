import { Link, Text, View } from "@react-pdf/renderer";
import React from "react";

import { bulletGlyph } from "@/components/job-v2/engine/bulletGlyph";
import { ResolvedTemplateConfig } from "@/components/job-v2/engine/types";
import { formatDateRange } from "@/lib/date";
import { htmlToPlainText, isHtml } from "@/lib/htmlUtils";
import { ResumeJSON, Skill } from "@/types/resume";

import { ResolvedPDFStyles, withAlpha } from "./resolveStyles";

const plain = (text: string | null | undefined): string => {
  if (!text) return "";
  return isHtml(text) ? htmlToPlainText(text) : text;
};

/** A run of skills sharing the same (optional) category, in first-seen order. */
export interface SkillGroup {
  category?: string;
  skills: Skill[];
}

/**
 * Groups skills by `category` in first-seen order; skills with no category
 * form a single trailing implicit group with no heading.
 */
export function groupSkills(skills: Skill[]): SkillGroup[] {
  const groups: SkillGroup[] = [];
  const byCategory = new Map<string, SkillGroup>();
  let uncategorized: SkillGroup | null = null;
  for (const skill of skills) {
    if (skill.category) {
      let group = byCategory.get(skill.category);
      if (!group) {
        group = { category: skill.category, skills: [] };
        byCategory.set(skill.category, group);
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

export type PDFSectionBuilderArgs = {
  resume: ResumeJSON;
  instance: { id: string; title: string };
  styles: ResolvedPDFStyles;
  config: ResolvedTemplateConfig;
};

export type PDFSectionBuilder = (
  args: PDFSectionBuilderArgs
) => React.ReactNode;

/** One label/value row for `entryStyle: "table"` (bjet-professional) —
 * react-pdf mirror of the DOM `TableRow` in engine/sections.tsx.
 *
 * `fontSize`/`sp` are optional (defaulting to the pre-fitScale literals) so
 * the `pdfSkills` "table" skillStyle branch — which also calls this — keeps
 * compiling/working unchanged; it's Cluster B's job to thread `s.smallFontSize`/
 * `s.sp` through its own call sites when it touches that file. */
function PdfTableRow({
  label,
  children,
  accentColor,
  borderColor,
  isLast = false,
  fontSize = 8,
  sp = (n: number) => n,
}: {
  label: string;
  children: React.ReactNode;
  accentColor: string;
  borderColor: string;
  isLast?: boolean;
  fontSize?: number;
  sp?: (n: number) => number;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: borderColor,
      }}
    >
      <View
        style={{
          width: sp(80),
          backgroundColor: accentColor,
          borderRightWidth: 1,
          borderRightColor: borderColor,
          padding: sp(4),
        }}
      >
        <Text style={{ fontSize, fontWeight: 700 }}>{label}</Text>
      </View>
      <View style={{ flex: 1, padding: sp(4) }}>{children}</View>
    </View>
  );
}

/** Bordered box wrapping a run of `PdfTableRow`s.
 * `sp` is optional for the same reason as `PdfTableRow` above. */
function PdfTableEntry({
  children,
  borderColor,
  sp = (n: number) => n,
}: {
  children: React.ReactNode;
  borderColor: string;
  sp?: (n: number) => number;
}) {
  return (
    <View
      wrap={false}
      style={{ marginBottom: sp(8), borderWidth: 1, borderColor }}
    >
      {children}
    </View>
  );
}

/** Wraps a date-range Text in a tinted pill when `dateStyle === "badge"`. */
function pdfDateNode({
  children,
  dateStyle,
  primaryColor,
  secondaryColor,
  smallFontSize,
}: {
  children: React.ReactNode;
  dateStyle: ResolvedTemplateConfig["dateStyle"];
  primaryColor: string;
  secondaryColor: string;
  smallFontSize: number;
}) {
  if (dateStyle === "badge") {
    return (
      <Text
        style={{
          fontSize: smallFontSize,
          color: primaryColor,
          backgroundColor: withAlpha(primaryColor, "1a"),
          borderRadius: 8,
          paddingVertical: 2,
          paddingHorizontal: 6,
        }}
      >
        {children}
      </Text>
    );
  }
  return (
    <Text style={{ fontSize: smallFontSize, color: secondaryColor }}>
      {children}
    </Text>
  );
}

// ── PDF Section Builders ────────────────────────────────────────────────────
// Mirror of DOM section builders, but emit react-pdf Views/Texts instead of DOM nodes.
// Each builder handles one section type and is parameterized by instance.title.

const pdfSummary: PDFSectionBuilder = ({ resume, styles: s, config }) => {
  if (!resume.summary) return null;
  return (
    <Text
      style={{
        fontSize: s.fontSize,
        lineHeight: s.lineHeight,
        color: s.textColor,
        textAlign: config.justifyText ? "justify" : undefined,
      }}
    >
      {plain(resume.summary)}
    </Text>
  );
};

const pdfExperience: PDFSectionBuilder = ({ resume, styles: s, config }) => {
  const { fontSize, smallFontSize, lineHeight, accentColor, dateFormat } = s;
  const entryStyle = config.entryStyle;
  const glyph = bulletGlyph(config.bulletStyle);
  if (resume.experience.length === 0) return null;

  if (entryStyle === "compact") {
    return (
      <>
        {resume.experience.map((exp, i) => (
          <View key={i} wrap={false} style={{ marginBottom: s.sp(5) }}>
            <Text style={{ fontSize, color: s.textColor }}>
              <Text style={{ fontWeight: 700, color: accentColor }}>
                {exp.role}
              </Text>
              {" — "}
              {exp.company}
              <Text
                style={{ fontSize: smallFontSize, color: s.secondaryColor }}
              >
                {"  ·  "}
                {formatDateRange(exp.startDate, exp.endDate, dateFormat)}
              </Text>
            </Text>
            {exp.achievements.map((a, j) => (
              <Text
                key={j}
                style={{
                  fontSize: smallFontSize,
                  lineHeight,
                  color: s.textColor,
                  marginLeft: s.sp(8),
                }}
              >
                {glyph} {a}
              </Text>
            ))}
          </View>
        ))}
      </>
    );
  }

  if (entryStyle === "timeline" || entryStyle === "marker") {
    return (
      <>
        {resume.experience.map((exp, i) => (
          <View
            key={i}
            wrap={false}
            style={
              entryStyle === "timeline"
                ? {
                    position: "relative",
                    paddingLeft: s.sp(10),
                    paddingBottom: s.sp(10),
                    borderLeftWidth: s.sp(2),
                    borderLeftColor: accentColor,
                  }
                : {
                    marginBottom: s.sp(10),
                    paddingLeft: s.sp(12),
                    position: "relative",
                  }
            }
          >
            <View
              style={{
                position: "absolute",
                left: entryStyle === "timeline" ? -3 : 0,
                top: 3,
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: accentColor,
              }}
            />
            {entryStyle === "timeline" ? (
              <Text
                style={{
                  fontSize: smallFontSize,
                  color: s.secondaryColor,
                  marginBottom: 2,
                }}
              >
                {formatDateRange(exp.startDate, exp.endDate, dateFormat)}
              </Text>
            ) : null}
            <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
              {exp.role}
            </Text>
            <Text style={{ fontSize: smallFontSize, color: s.secondaryColor }}>
              {exp.company}
              {entryStyle === "marker"
                ? ` · ${formatDateRange(exp.startDate, exp.endDate, dateFormat)}`
                : ""}
            </Text>
            {exp.description ? (
              <Text
                style={{
                  fontSize,
                  lineHeight,
                  color: s.textColor,
                  marginTop: 2,
                  marginBottom: 3,
                }}
              >
                {plain(exp.description)}
              </Text>
            ) : null}
            {exp.achievements.map((a, j) => (
              <Text
                key={j}
                style={{
                  fontSize,
                  lineHeight,
                  color: s.textColor,
                  marginLeft: s.sp(8),
                }}
              >
                {glyph} {a}
              </Text>
            ))}
          </View>
        ))}
      </>
    );
  }

  if (entryStyle === "table") {
    const borderColor = withAlpha(s.secondaryColor, "40");
    const tint = withAlpha(accentColor, "20");
    return (
      <>
        {resume.experience.map((exp, i) => (
          <PdfTableEntry key={i} borderColor={borderColor} sp={s.sp}>
            <PdfTableRow
              label="Company"
              accentColor={tint}
              borderColor={borderColor}
              fontSize={smallFontSize}
              sp={s.sp}
            >
              <Text style={{ fontSize: smallFontSize }}>{exp.company}</Text>
            </PdfTableRow>
            <PdfTableRow
              label="Role"
              accentColor={tint}
              borderColor={borderColor}
              fontSize={smallFontSize}
              sp={s.sp}
            >
              <Text style={{ fontSize: smallFontSize }}>{exp.role}</Text>
            </PdfTableRow>
            <PdfTableRow
              label="Duration"
              accentColor={tint}
              borderColor={borderColor}
              fontSize={smallFontSize}
              sp={s.sp}
            >
              <Text style={{ fontSize: smallFontSize }}>
                {formatDateRange(exp.startDate, exp.endDate, dateFormat)}
              </Text>
            </PdfTableRow>
            <PdfTableRow
              label="Details"
              accentColor={tint}
              borderColor={borderColor}
              isLast
              fontSize={smallFontSize}
              sp={s.sp}
            >
              {exp.description ? (
                <Text
                  style={{
                    fontSize: smallFontSize,
                    lineHeight,
                    marginBottom: 2,
                  }}
                >
                  {plain(exp.description)}
                </Text>
              ) : null}
              {exp.achievements.map((a, j) => (
                <Text key={j} style={{ fontSize: smallFontSize, lineHeight }}>
                  {glyph} {a}
                </Text>
              ))}
            </PdfTableRow>
          </PdfTableEntry>
        ))}
      </>
    );
  }

  return (
    <>
      {resume.experience.map((exp, i) => (
        <View key={i} wrap={false} style={{ marginBottom: s.sp(9) }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 2,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
                {exp.role}
              </Text>
              <Text
                style={{ fontSize: smallFontSize, color: s.secondaryColor }}
              >
                {exp.company}
              </Text>
            </View>
            {pdfDateNode({
              children: formatDateRange(exp.startDate, exp.endDate, dateFormat),
              dateStyle: config.dateStyle,
              primaryColor: s.primaryColor,
              secondaryColor: s.secondaryColor,
              smallFontSize,
            })}
          </View>
          {exp.description ? (
            <Text
              style={{
                fontSize,
                lineHeight,
                color: s.textColor,
                marginBottom: 3,
                textAlign: config.justifyText ? "justify" : undefined,
              }}
            >
              {plain(exp.description)}
            </Text>
          ) : null}
          {exp.achievements.map((a, j) => (
            <Text
              key={j}
              style={{
                fontSize,
                lineHeight,
                color: s.textColor,
                marginLeft: s.sp(8),
              }}
            >
              {glyph} {a}
            </Text>
          ))}
        </View>
      ))}
    </>
  );
};

const pdfProjects: PDFSectionBuilder = ({ resume, styles: s, config }) => {
  const {
    fontSize,
    smallFontSize,
    lineHeight,
    accentColor,
    secondaryColor,
    dateFormat,
  } = s;
  const entryStyle = config.entryStyle;
  if (resume.projects.length === 0) return null;

  if (entryStyle === "compact") {
    return (
      <>
        {resume.projects.map((proj, i) => (
          <View key={i} wrap={false} style={{ marginBottom: s.sp(5) }}>
            <Text style={{ fontSize, color: s.textColor }}>
              <Text style={{ fontWeight: 700, color: accentColor }}>
                {proj.name}
              </Text>
              {proj.technologies.length > 0 &&
                `  ·  ${proj.technologies.join(", ")}`}
            </Text>
          </View>
        ))}
      </>
    );
  }

  if (entryStyle === "timeline" || entryStyle === "marker") {
    return (
      <>
        {resume.projects.map((proj, i) => (
          <View
            key={i}
            wrap={false}
            style={
              entryStyle === "timeline"
                ? {
                    position: "relative",
                    paddingLeft: s.sp(10),
                    paddingBottom: s.sp(10),
                    borderLeftWidth: s.sp(2),
                    borderLeftColor: accentColor,
                  }
                : {
                    marginBottom: s.sp(10),
                    paddingLeft: s.sp(12),
                    position: "relative",
                  }
            }
          >
            <View
              style={{
                position: "absolute",
                left: entryStyle === "timeline" ? -3 : 0,
                top: 3,
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: accentColor,
              }}
            />
            {entryStyle === "timeline" && (proj.startDate || proj.endDate) ? (
              <Text
                style={{
                  fontSize: smallFontSize,
                  color: s.secondaryColor,
                  marginBottom: 2,
                }}
              >
                {formatDateRange(proj.startDate, proj.endDate, dateFormat)}
              </Text>
            ) : null}
            <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
              {proj.name}
            </Text>
            <Text
              style={{
                fontSize,
                lineHeight,
                color: s.textColor,
                marginTop: 2,
                marginBottom: 3,
              }}
            >
              {plain(proj.description)}
            </Text>
            {proj.technologies.length > 0 ? (
              <Text
                style={{ fontSize: smallFontSize, color: s.secondaryColor }}
              >
                <Text style={{ fontWeight: 600 }}>{"Technologies: "}</Text>
                {proj.technologies.join(", ")}
              </Text>
            ) : null}
          </View>
        ))}
      </>
    );
  }

  if (entryStyle === "table") {
    const borderColor = withAlpha(s.secondaryColor, "40");
    const tint = withAlpha(accentColor, "20");
    return (
      <>
        {resume.projects.map((proj, i) => (
          <PdfTableEntry key={i} borderColor={borderColor} sp={s.sp}>
            <PdfTableRow
              label="Project"
              accentColor={tint}
              borderColor={borderColor}
              fontSize={smallFontSize}
              sp={s.sp}
            >
              <Text style={{ fontSize: smallFontSize }}>
                {proj.name}
                {proj.url ? (
                  <Text style={{ color: secondaryColor }}>
                    {"  "}
                    <Link src={proj.url} style={{ color: secondaryColor }}>
                      [Link]
                    </Link>
                  </Text>
                ) : null}
              </Text>
            </PdfTableRow>
            <PdfTableRow
              label="Duration"
              accentColor={tint}
              borderColor={borderColor}
              fontSize={smallFontSize}
              sp={s.sp}
            >
              <Text style={{ fontSize: smallFontSize }}>
                {proj.startDate || proj.endDate
                  ? formatDateRange(proj.startDate, proj.endDate, dateFormat)
                  : "—"}
              </Text>
            </PdfTableRow>
            <PdfTableRow
              label="Details"
              accentColor={tint}
              borderColor={borderColor}
              isLast
              fontSize={smallFontSize}
              sp={s.sp}
            >
              <Text
                style={{ fontSize: smallFontSize, lineHeight, marginBottom: 2 }}
              >
                {plain(proj.description)}
              </Text>
              {proj.technologies.length > 0 ? (
                <Text style={{ fontSize: smallFontSize }}>
                  <Text style={{ fontWeight: 600 }}>{"Technologies: "}</Text>
                  {proj.technologies.join(", ")}
                </Text>
              ) : null}
            </PdfTableRow>
          </PdfTableEntry>
        ))}
      </>
    );
  }

  return (
    <>
      {resume.projects.map((proj, i) => (
        <View key={i} wrap={false} style={{ marginBottom: s.sp(9) }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
              {proj.name}
              {proj.url ? (
                <Text style={{ fontWeight: 400, color: secondaryColor }}>
                  {"  "}
                  <Link src={proj.url} style={{ color: secondaryColor }}>
                    [Link]
                  </Link>
                </Text>
              ) : null}
            </Text>
            {proj.startDate || proj.endDate
              ? pdfDateNode({
                  children: formatDateRange(
                    proj.startDate,
                    proj.endDate,
                    dateFormat
                  ),
                  dateStyle: config.dateStyle,
                  primaryColor: s.primaryColor,
                  secondaryColor,
                  smallFontSize,
                })
              : null}
          </View>
          <Text
            style={{
              fontSize,
              lineHeight,
              color: s.textColor,
              marginBottom: 3,
              textAlign: config.justifyText ? "justify" : undefined,
            }}
          >
            {plain(proj.description)}
          </Text>
          {proj.technologies.length > 0 ? (
            <Text style={{ fontSize: smallFontSize, color: s.secondaryColor }}>
              <Text style={{ fontWeight: 600 }}>{"Technologies: "}</Text>
              {proj.technologies.join(", ")}
            </Text>
          ) : null}
        </View>
      ))}
    </>
  );
};

/** Styles whose PDF section is a single atomic block (mirrors
 * `SINGLE_BLOCK_SKILL_STYLES` in `engine/sections.tsx`) — `chips`/`table`
 * render as one Fragment/View so `SectionGroup` can't split them mid-box,
 * and `inline` is one flowing paragraph. `list`/`grid`/`columns` instead
 * return an ARRAY of per-group nodes (not wrapped in one Fragment) so
 * `SectionGroup` (Cluster A) can split a long skills list across pages. */
const pdfSkills: PDFSectionBuilder = ({ resume, styles: s, config }) => {
  if (resume.skills.length === 0) return null;
  const groups = groupSkills(resume.skills);

  if (config.skillStyle === "chips") {
    return (
      <View style={{ flexDirection: "column", gap: s.sp(6) }}>
        {groups.map((group, gi) => (
          <View key={gi}>
            {group.category ? (
              <Text
                style={{
                  fontSize: s.smallFontSize,
                  color: s.secondaryColor,
                  marginBottom: 2,
                }}
              >
                {group.category}
              </Text>
            ) : null}
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", gap: s.sp(4) }}
            >
              {group.skills.map((skill, si) => (
                <Text
                  key={si}
                  style={{
                    fontSize: s.smallFontSize,
                    color: s.accentColor,
                    backgroundColor: withAlpha(s.accentColor, "1a"),
                    borderRadius: 8,
                    paddingVertical: s.sp(2),
                    paddingHorizontal: s.sp(6),
                  }}
                >
                  {skill.name}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (config.skillStyle === "list") {
    // Comma-joined and wrapped, not one skill per line or one bulleted chunk
    // per skill — a narrow sidebar column with 5+ skills in a category
    // otherwise burns a line (or several) per category instead of packing
    // keywords tightly. Matches the DOM "list" branch in engine/sections.tsx.
    return groups.map((group, gi) => (
      <View key={gi} wrap={false} style={{ marginBottom: s.sp(3) }}>
        {group.category ? (
          <Text
            style={{
              fontSize: s.smallFontSize,
              color: s.secondaryColor,
            }}
          >
            {group.category}
          </Text>
        ) : null}
        <Text style={{ fontSize: s.smallFontSize, color: s.textColor }}>
          {group.skills.map((skill, si) => (
            <Text key={si}>
              {si > 0 ? ", " : ""}
              {skill.tier === "primary" ? (
                <Text style={{ fontWeight: 700 }}>{skill.name}</Text>
              ) : (
                skill.name
              )}
            </Text>
          ))}
        </Text>
      </View>
    ));
  }

  if (config.skillStyle === "grid") {
    return groups.map((group, gi) => (
      <View
        key={gi}
        wrap={false}
        style={{
          marginBottom: s.sp(6),
          borderLeftWidth: s.sp(2),
          borderLeftColor: s.accentColor,
          paddingLeft: s.sp(8),
        }}
      >
        {group.category ? (
          <Text
            style={{
              fontSize: s.smallFontSize,
              fontWeight: 600,
              color: s.secondaryColor,
              marginBottom: 2,
            }}
          >
            {group.category}
          </Text>
        ) : null}
        <Text style={{ fontSize: s.smallFontSize, color: s.textColor }}>
          {group.skills.map((skill, si) => (
            <Text key={si}>
              {si > 0 ? ", " : ""}
              {skill.tier === "primary" ? (
                <Text style={{ fontWeight: 700 }}>{skill.name}</Text>
              ) : (
                skill.name
              )}
            </Text>
          ))}
        </Text>
      </View>
    ));
  }

  if (config.skillStyle === "columns") {
    return groups.map((group, gi) => (
      <View
        key={gi}
        wrap={false}
        style={{ flexDirection: "row", marginBottom: s.sp(4) }}
      >
        <Text
          style={{
            width: s.sp(80),
            fontSize: s.smallFontSize,
            fontWeight: 600,
            color: s.secondaryColor,
          }}
        >
          {group.category ?? "Skills"}
        </Text>
        <Text style={{ flex: 1, fontSize: s.smallFontSize, color: s.textColor }}>
          {group.skills.map((skill, si) => (
            <Text key={si}>
              {si > 0 ? ", " : ""}
              {skill.tier === "primary" ? (
                <Text style={{ fontWeight: 700 }}>{skill.name}</Text>
              ) : (
                skill.name
              )}
            </Text>
          ))}
        </Text>
      </View>
    ));
  }

  if (config.skillStyle === "table") {
    const borderColor = withAlpha(s.secondaryColor, "40");
    const tint = withAlpha(s.accentColor, "20");
    return (
      <PdfTableEntry borderColor={borderColor} sp={s.sp}>
        {groups.length > 0 ? (
          groups.map((group, gi) => (
            <PdfTableRow
              key={gi}
              label={group.category ?? "Skills"}
              accentColor={tint}
              borderColor={borderColor}
              isLast={gi === groups.length - 1}
              fontSize={s.smallFontSize}
              sp={s.sp}
            >
              <Text style={{ fontSize: s.smallFontSize }}>
                {group.skills.map((skill) => skill.name).join(", ")}
              </Text>
            </PdfTableRow>
          ))
        ) : (
          <PdfTableRow
            label="Skills"
            accentColor={tint}
            borderColor={borderColor}
            isLast
            fontSize={s.smallFontSize}
            sp={s.sp}
          >
            <Text style={{ fontSize: s.smallFontSize }}>—</Text>
          </PdfTableRow>
        )}
      </PdfTableEntry>
    );
  }

  // "inline" — one flowing paragraph, groups joined by a middot separator.
  return (
    <Text
      style={{
        fontSize: s.fontSize,
        lineHeight: s.lineHeight,
        color: s.textColor,
      }}
    >
      {groups.map((group, gi) => (
        <Text key={gi}>
          {gi > 0 ? "  •  " : ""}
          {group.category ? (
            <Text style={{ fontWeight: 600 }}>{`${group.category}: `}</Text>
          ) : (
            ""
          )}
          {group.skills.map((skill, si) => (
            <Text key={si}>
              {si > 0 ? ", " : ""}
              {skill.tier === "primary" ? (
                <Text style={{ fontWeight: 700 }}>{skill.name}</Text>
              ) : (
                skill.name
              )}
            </Text>
          ))}
        </Text>
      ))}
    </Text>
  );
};

const pdfEducation: PDFSectionBuilder = ({ resume, styles: s, config }) => {
  const { fontSize, smallFontSize, accentColor, dateFormat } = s;
  const entryStyle = config.entryStyle;
  if (resume.education.length === 0) return null;

  if (entryStyle === "compact") {
    return (
      <>
        {resume.education.map((edu, i) => (
          <View key={i} wrap={false} style={{ marginBottom: s.sp(5) }}>
            <Text style={{ fontSize, color: s.textColor }}>
              <Text style={{ fontWeight: 700, color: accentColor }}>
                {edu.degree}
                {edu.field ? ` in ${edu.field}` : ""}
              </Text>
              {" — "}
              {edu.institution}
              <Text
                style={{ fontSize: smallFontSize, color: s.secondaryColor }}
              >
                {"  ·  "}
                {formatDateRange(edu.startDate, edu.endDate, dateFormat)}
              </Text>
            </Text>
          </View>
        ))}
      </>
    );
  }

  if (entryStyle === "timeline" || entryStyle === "marker") {
    return (
      <>
        {resume.education.map((edu, i) => (
          <View
            key={i}
            wrap={false}
            style={
              entryStyle === "timeline"
                ? {
                    position: "relative",
                    paddingLeft: s.sp(10),
                    paddingBottom: s.sp(10),
                    borderLeftWidth: s.sp(2),
                    borderLeftColor: accentColor,
                  }
                : {
                    marginBottom: s.sp(10),
                    paddingLeft: s.sp(12),
                    position: "relative",
                  }
            }
          >
            <View
              style={{
                position: "absolute",
                left: entryStyle === "timeline" ? -3 : 0,
                top: 3,
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: accentColor,
              }}
            />
            {entryStyle === "timeline" ? (
              <Text
                style={{
                  fontSize: smallFontSize,
                  color: s.secondaryColor,
                  marginBottom: 2,
                }}
              >
                {formatDateRange(edu.startDate, edu.endDate, dateFormat)}
              </Text>
            ) : null}
            <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
              {edu.degree}
              {edu.field ? ` in ${edu.field}` : ""}
            </Text>
            <Text style={{ fontSize: smallFontSize, color: s.secondaryColor }}>
              {edu.institution}
              {entryStyle === "marker"
                ? ` · ${formatDateRange(edu.startDate, edu.endDate, dateFormat)}`
                : ""}
            </Text>
          </View>
        ))}
      </>
    );
  }

  if (entryStyle === "table") {
    const borderColor = withAlpha(s.secondaryColor, "40");
    const tint = withAlpha(accentColor, "20");
    return (
      <>
        {resume.education.map((edu, i) => (
          <PdfTableEntry key={i} borderColor={borderColor} sp={s.sp}>
            <PdfTableRow
              label="Institution"
              accentColor={tint}
              borderColor={borderColor}
              fontSize={smallFontSize}
              sp={s.sp}
            >
              <Text style={{ fontSize: smallFontSize }}>{edu.institution}</Text>
            </PdfTableRow>
            <PdfTableRow
              label="Degree"
              accentColor={tint}
              borderColor={borderColor}
              fontSize={smallFontSize}
              sp={s.sp}
            >
              <Text style={{ fontSize: smallFontSize }}>
                {edu.degree}
                {edu.field ? ` in ${edu.field}` : ""}
              </Text>
            </PdfTableRow>
            <PdfTableRow
              label="Duration"
              accentColor={tint}
              borderColor={borderColor}
              isLast={!edu.gpa}
              fontSize={smallFontSize}
              sp={s.sp}
            >
              <Text style={{ fontSize: smallFontSize }}>
                {formatDateRange(edu.startDate, edu.endDate, dateFormat)}
              </Text>
            </PdfTableRow>
            {edu.gpa ? (
              <PdfTableRow
                label="GPA"
                accentColor={tint}
                borderColor={borderColor}
                isLast
                fontSize={smallFontSize}
                sp={s.sp}
              >
                <Text style={{ fontSize: smallFontSize }}>{edu.gpa}</Text>
              </PdfTableRow>
            ) : null}
          </PdfTableEntry>
        ))}
      </>
    );
  }

  return (
    <>
      {resume.education.map((edu, i) => (
        <View key={i} wrap={false} style={{ marginBottom: s.sp(8) }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
                {edu.degree}
                {edu.field ? ` in ${edu.field}` : ""}
              </Text>
              <Text
                style={{ fontSize: smallFontSize, color: s.secondaryColor }}
              >
                {edu.institution}
              </Text>
            </View>
            <Text style={{ fontSize: smallFontSize, color: s.secondaryColor }}>
              {formatDateRange(edu.startDate, edu.endDate, dateFormat)}
            </Text>
          </View>
          {edu.gpa ? (
            <Text style={{ fontSize: smallFontSize, color: s.secondaryColor }}>
              GPA: {edu.gpa}
            </Text>
          ) : null}
        </View>
      ))}
    </>
  );
};

const pdfCertifications: PDFSectionBuilder = ({ resume, styles: s }) => {
  const { fontSize, smallFontSize, accentColor, secondaryColor } = s;
  if (resume.certifications.length === 0) return null;

  return (
    <>
      {resume.certifications.map((cert, i) => (
        <View key={i} wrap={false} style={{ marginBottom: s.sp(6) }}>
          <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
            {cert.name}
          </Text>
          <Text style={{ fontSize: smallFontSize, color: s.secondaryColor }}>
            {cert.issuer}
            {" • "}
            {cert.date}
            {cert.url ? (
              <Text>
                {"  "}
                <Link src={cert.url} style={{ color: secondaryColor }}>
                  [Verify]
                </Link>
              </Text>
            ) : null}
          </Text>
        </View>
      ))}
    </>
  );
};

const pdfPublications: PDFSectionBuilder = ({ resume, styles: s }) => {
  const { fontSize, smallFontSize, lineHeight, accentColor } = s;
  const pubs = resume.publications ?? [];
  if (pubs.length === 0) return null;

  return (
    <>
      {pubs.map((pub, i) => (
        <View key={i} wrap={false} style={{ marginBottom: s.sp(6) }}>
          <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
            {pub.title}
          </Text>
          <Text
            style={{ fontSize: smallFontSize, lineHeight, color: s.textColor }}
          >
            {pub.authors.join(", ")}
          </Text>
          <Text style={{ fontSize: smallFontSize, color: s.secondaryColor }}>
            {pub.venue}
            {" • "}
            {pub.date}
            {pub.doi ? `  •  DOI: ${pub.doi}` : ""}
          </Text>
        </View>
      ))}
    </>
  );
};

const pdfLanguages: PDFSectionBuilder = ({ resume, styles: s }) => {
  const langs = resume.languages ?? [];
  if (langs.length === 0) return null;
  return (
    <Text
      style={{
        fontSize: s.fontSize,
        lineHeight: s.lineHeight,
        color: s.textColor,
      }}
    >
      {langs.map((l) => `${l.name} (${l.proficiency})`).join("  •  ")}
    </Text>
  );
};

const pdfVolunteer: PDFSectionBuilder = ({ resume, styles: s, config }) => {
  const { fontSize, smallFontSize, lineHeight, accentColor, dateFormat } = s;
  const entryStyle = config.entryStyle;
  const vols = resume.volunteer ?? [];
  if (vols.length === 0) return null;

  if (entryStyle === "compact") {
    return (
      <>
        {vols.map((v, i) => (
          <View key={i} wrap={false} style={{ marginBottom: s.sp(5) }}>
            <Text style={{ fontSize, color: s.textColor }}>
              <Text style={{ fontWeight: 700, color: accentColor }}>
                {v.role}
              </Text>
              {" — "}
              {v.organization}
              <Text
                style={{ fontSize: smallFontSize, color: s.secondaryColor }}
              >
                {"  ·  "}
                {formatDateRange(v.startDate, v.endDate, dateFormat)}
              </Text>
            </Text>
          </View>
        ))}
      </>
    );
  }

  if (entryStyle === "timeline" || entryStyle === "marker") {
    return (
      <>
        {vols.map((v, i) => (
          <View
            key={i}
            wrap={false}
            style={
              entryStyle === "timeline"
                ? {
                    position: "relative",
                    paddingLeft: s.sp(10),
                    paddingBottom: s.sp(10),
                    borderLeftWidth: s.sp(2),
                    borderLeftColor: accentColor,
                  }
                : {
                    marginBottom: s.sp(10),
                    paddingLeft: s.sp(12),
                    position: "relative",
                  }
            }
          >
            <View
              style={{
                position: "absolute",
                left: entryStyle === "timeline" ? -3 : 0,
                top: 3,
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: accentColor,
              }}
            />
            {entryStyle === "timeline" ? (
              <Text
                style={{
                  fontSize: smallFontSize,
                  color: s.secondaryColor,
                  marginBottom: 2,
                }}
              >
                {formatDateRange(v.startDate, v.endDate, dateFormat)}
              </Text>
            ) : null}
            <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
              {v.role}
            </Text>
            <Text style={{ fontSize: smallFontSize, color: s.secondaryColor }}>
              {v.organization}
              {entryStyle === "marker"
                ? ` · ${formatDateRange(v.startDate, v.endDate, dateFormat)}`
                : ""}
            </Text>
            {v.description ? (
              <Text
                style={{
                  fontSize,
                  lineHeight,
                  color: s.textColor,
                  marginTop: 2,
                }}
              >
                {plain(v.description)}
              </Text>
            ) : null}
          </View>
        ))}
      </>
    );
  }

  if (entryStyle === "table") {
    const borderColor = withAlpha(s.secondaryColor, "40");
    const tint = withAlpha(accentColor, "20");
    return (
      <>
        {vols.map((v, i) => (
          <PdfTableEntry key={i} borderColor={borderColor} sp={s.sp}>
            <PdfTableRow
              label="Organization"
              accentColor={tint}
              borderColor={borderColor}
              fontSize={smallFontSize}
              sp={s.sp}
            >
              <Text style={{ fontSize: smallFontSize }}>{v.organization}</Text>
            </PdfTableRow>
            <PdfTableRow
              label="Role"
              accentColor={tint}
              borderColor={borderColor}
              fontSize={smallFontSize}
              sp={s.sp}
            >
              <Text style={{ fontSize: smallFontSize }}>{v.role}</Text>
            </PdfTableRow>
            <PdfTableRow
              label="Duration"
              accentColor={tint}
              borderColor={borderColor}
              isLast={!v.description}
              fontSize={smallFontSize}
              sp={s.sp}
            >
              <Text style={{ fontSize: smallFontSize }}>
                {formatDateRange(v.startDate, v.endDate, dateFormat)}
              </Text>
            </PdfTableRow>
            {v.description ? (
              <PdfTableRow
                label="Details"
                accentColor={tint}
                borderColor={borderColor}
                isLast
                fontSize={smallFontSize}
                sp={s.sp}
              >
                <Text style={{ fontSize: smallFontSize, lineHeight }}>
                  {plain(v.description)}
                </Text>
              </PdfTableRow>
            ) : null}
          </PdfTableEntry>
        ))}
      </>
    );
  }

  return (
    <>
      {vols.map((v, i) => (
        <View key={i} wrap={false} style={{ marginBottom: s.sp(8) }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
                {v.role}
              </Text>
              <Text
                style={{ fontSize: smallFontSize, color: s.secondaryColor }}
              >
                {v.organization}
              </Text>
            </View>
            <Text style={{ fontSize: smallFontSize, color: s.secondaryColor }}>
              {formatDateRange(v.startDate, v.endDate, dateFormat)}
            </Text>
          </View>
          {v.description ? (
            <Text
              style={{
                fontSize,
                lineHeight,
                color: s.textColor,
                textAlign: config.justifyText ? "justify" : undefined,
              }}
            >
              {plain(v.description)}
            </Text>
          ) : null}
        </View>
      ))}
    </>
  );
};

const pdfAwards: PDFSectionBuilder = ({ resume, styles: s }) => {
  const { fontSize, smallFontSize, lineHeight, accentColor } = s;
  const awardList = resume.awards ?? [];
  if (awardList.length === 0) return null;

  return (
    <>
      {awardList.map((award, i) => (
        <View key={i} wrap={false} style={{ marginBottom: s.sp(6) }}>
          <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
            {award.title}
          </Text>
          <Text style={{ fontSize: smallFontSize, color: s.secondaryColor }}>
            {award.issuer}
            {" • "}
            {award.date}
          </Text>
          {award.description ? (
            <Text style={{ fontSize, lineHeight, color: s.textColor }}>
              {plain(award.description)}
            </Text>
          ) : null}
        </View>
      ))}
    </>
  );
};

const pdfHobbies: PDFSectionBuilder = ({ resume, styles: s }) => {
  const list = resume.hobbies ?? [];
  if (list.length === 0) return null;
  return (
    <Text
      style={{
        fontSize: s.fontSize,
        lineHeight: s.lineHeight,
        color: s.textColor,
      }}
    >
      {list.join(", ")}
    </Text>
  );
};

const pdfCustom: PDFSectionBuilder = ({ resume, instance, config }) => {
  const section = (resume.sectionLayout?.custom ?? []).find(
    (c) => c.id === instance.id
  );
  if (!section || section.items.length === 0) return null;
  const glyph = bulletGlyph(config.bulletStyle);

  return section.type === "text" ? (
    <Text>{section.items.join(" ")}</Text>
  ) : (
    <>
      {section.items.map((item, i) => (
        <Text key={i}>
          {glyph} {item}
        </Text>
      ))}
    </>
  );
};

// ── PDF Section Registry ────────────────────────────────────────────────────
export const PDF_SECTION_REGISTRY: Record<string, PDFSectionBuilder> = {
  summary: pdfSummary,
  experience: pdfExperience,
  projects: pdfProjects,
  skills: pdfSkills,
  education: pdfEducation,
  certifications: pdfCertifications,
  publications: pdfPublications,
  languages: pdfLanguages,
  volunteer: pdfVolunteer,
  awards: pdfAwards,
  hobbies: pdfHobbies,
  custom: pdfCustom,
};
