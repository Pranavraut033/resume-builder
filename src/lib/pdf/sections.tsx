import { Link, Text, View } from "@react-pdf/renderer";
import React from "react";

import { bulletGlyph } from "@/components/job-v2/engine/bulletGlyph";
import { ResolvedTemplateConfig } from "@/components/job-v2/engine/types";
import { formatDateRange } from "@/lib/date";
import { htmlToPlainText, isHtml } from "@/lib/htmlUtils";
import { HeadingStyle } from "@/types/customization";
import { ResumeJSON, Skill } from "@/types/resume";

import { borderTint, ResolvedPDFStyles, withAlpha } from "./resolveStyles";

const plain = (text: string | null | undefined): string => {
  if (!text) return "";
  return isHtml(text) ? htmlToPlainText(text) : text;
};

/** Resolves which heading style a skill category label should mirror —
 * `headingSidebar` when Skills renders in a 2-column template's sidebar
 * column, else the template's main `heading`. Mirrors the DOM helper of the
 * same name in engine/sections.tsx. */
function skillsHeadingStyle(config: ResolvedTemplateConfig): HeadingStyle {
  const inSidebar = config.columns > 1 && config.sectionColumn?.skills === 0;
  return inSidebar ? config.headingSidebar : config.heading;
}

/** react-pdf Text style giving a skill category label the same typographic
 * character as the template's section headings, scaled down to subheading
 * size — bold always (set by the caller), plus a per-style accent. No serif
 * italic here: the label Text is already bold, and this app's registered
 * fonts don't ship a bold+italic variant (react-pdf then fails to resolve
 * the font entirely) — a full font-family swap to the serif heading font
 * would need importing from PDFTemplateEngine.tsx, which imports this file,
 * so plain bold is the simplification that avoids both problems. */
function pdfSkillLabelStyle(headingStyle: HeadingStyle) {
  switch (headingStyle) {
    case "uppercase":
      return { textTransform: "uppercase" as const, letterSpacing: 0.5 };
    default:
      return {};
  }
}

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
  variant = "boxed",
}: {
  label: string;
  children: React.ReactNode;
  accentColor: string;
  borderColor: string;
  isLast?: boolean;
  fontSize?: number;
  sp?: (n: number) => number;
  /** "boxed" (default) is the original bjet-professional look: bordered
   * rows, accent-tinted label cell. "label" (europass-classic) drops the
   * per-row border and label tint and right-aligns the label — each row's
   * own right border stands in for one continuous divider for the whole
   * entry, since rows stack with no gap between them. */
  variant?: "boxed" | "label";
}) {
  // No label (e.g. an uncategorized skills group) — skip the label column
  // entirely instead of reserving its width for a blank cell.
  if (!label) {
    const rowStyle =
      variant === "boxed"
        ? {
            flexDirection: "row" as const,
            borderBottomWidth: isLast ? 0 : 1,
            borderBottomColor: borderColor,
          }
        : { flexDirection: "row" as const };
    return (
      <View style={rowStyle}>
        <View style={{ flex: 1, padding: sp(4) }}>{children}</View>
      </View>
    );
  }
  if (variant === "label") {
    return (
      <View style={{ flexDirection: "row" as const }}>
        <View
          style={{
            width: sp(80),
            borderRightWidth: 1,
            borderRightColor: borderColor,
            padding: sp(4),
          }}
        >
          <Text style={{ fontSize, fontWeight: 700, textAlign: "right" }}>
            {label}
          </Text>
        </View>
        <View style={{ flex: 1, padding: sp(4) }}>{children}</View>
      </View>
    );
  }
  return (
    <View
      style={{
        flexDirection: "row" as const,
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
 * `sp` is optional for the same reason as `PdfTableRow` above.
 * `variant="label"` (europass-classic) drops the outer box border — the
 * single vertical divider comes from `PdfTableRow`'s own right border. */
function PdfTableEntry({
  children,
  borderColor,
  sp = (n: number) => n,
  variant = "boxed",
}: {
  children: React.ReactNode;
  borderColor: string;
  sp?: (n: number) => number;
  variant?: "boxed" | "label";
}) {
  if (variant === "label") {
    return <View style={{ marginBottom: sp(8) }}>{children}</View>;
  }
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
  const isMultiColumn = config.columns > 1;
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
            {exp.description ? (
              <Text
                style={{
                  fontSize: smallFontSize,
                  lineHeight,
                  color: s.textColor,
                }}
              >
                {plain(exp.description)}
              </Text>
            ) : null}
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

  if (
    entryStyle === "timeline" ||
    entryStyle === "marker" ||
    entryStyle === "date-column"
  ) {
    if (entryStyle === "date-column") {
      const borderColor = borderTint(s.secondaryColor, "40");
      return (
        <>
          {resume.experience.map((exp, i) => (
            <View
              key={i}
              wrap={false}
              style={{
                flexDirection: "row",
                paddingBottom: s.sp(10),
                gap: s.sp(8),
              }}
            >
              <View style={{ width: "22%" }}>
                <Text
                  style={{
                    fontSize: smallFontSize,
                    color: accentColor,
                    textAlign: "right",
                  }}
                >
                  {formatDateRange(exp.startDate, exp.endDate, dateFormat)}
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  borderLeftWidth: 1,
                  borderLeftColor: borderColor,
                  paddingLeft: s.sp(8),
                }}
              >
                <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
                  {exp.role}
                </Text>
                <Text
                  style={{ fontSize: smallFontSize, color: s.secondaryColor }}
                >
                  {exp.company}
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
            </View>
          ))}
        </>
      );
    }
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

  if (entryStyle === "table" || entryStyle === "label-column") {
    const borderColor = borderTint(s.secondaryColor, "40");
    const tint = withAlpha(accentColor, "20");
    const variant = entryStyle === "label-column" ? "label" : "boxed";
    return (
      <>
        {resume.experience.map((exp, i) => (
          <PdfTableEntry
            key={i}
            borderColor={borderColor}
            sp={s.sp}
            variant={variant}
          >
            <PdfTableRow
              label="Company"
              accentColor={tint}
              borderColor={borderColor}
              fontSize={smallFontSize}
              sp={s.sp}
              variant={variant}
            >
              <Text style={{ fontSize: smallFontSize }}>{exp.company}</Text>
            </PdfTableRow>
            <PdfTableRow
              label="Role"
              accentColor={tint}
              borderColor={borderColor}
              fontSize={smallFontSize}
              sp={s.sp}
              variant={variant}
            >
              <Text style={{ fontSize: smallFontSize }}>{exp.role}</Text>
            </PdfTableRow>
            <PdfTableRow
              label="Duration"
              accentColor={tint}
              borderColor={borderColor}
              fontSize={smallFontSize}
              sp={s.sp}
              variant={variant}
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
              variant={variant}
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
              flexDirection: isMultiColumn ? "column" : "row",
              justifyContent: isMultiColumn ? undefined : "space-between",
              alignItems: "flex-start",
              gap: isMultiColumn ? s.sp(2) : undefined,
              marginBottom: 2,
            }}
          >
            {/* `flex: 1` only makes sense in row mode, to push the date to
                the right edge. In column mode (isMultiColumn) it sets
                flexBasis: 0 on a column-direction child with no explicit
                height, which react-pdf's Yoga layout collapses to zero
                height — the date node then renders at the same y as this
                block instead of below it. */}
            <View style={isMultiColumn ? undefined : { flex: 1 }}>
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
            {proj.description ? (
              <Text
                style={{
                  fontSize: smallFontSize,
                  lineHeight,
                  color: s.textColor,
                }}
              >
                {plain(proj.description)}
              </Text>
            ) : null}
          </View>
        ))}
      </>
    );
  }

  if (
    entryStyle === "timeline" ||
    entryStyle === "marker" ||
    entryStyle === "date-column"
  ) {
    if (entryStyle === "date-column") {
      const borderColor = borderTint(s.secondaryColor, "40");
      return (
        <>
          {resume.projects.map((proj, i) => (
            <View
              key={i}
              wrap={false}
              style={{
                flexDirection: "row",
                paddingBottom: s.sp(10),
                gap: s.sp(8),
              }}
            >
              <View style={{ width: "22%" }}>
                {proj.startDate || proj.endDate ? (
                  <Text
                    style={{
                      fontSize: smallFontSize,
                      color: accentColor,
                      textAlign: "right",
                    }}
                  >
                    {formatDateRange(proj.startDate, proj.endDate, dateFormat)}
                  </Text>
                ) : null}
              </View>
              <View
                style={{
                  flex: 1,
                  borderLeftWidth: 1,
                  borderLeftColor: borderColor,
                  paddingLeft: s.sp(8),
                }}
              >
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
                    style={{
                      fontSize: smallFontSize,
                      color: s.secondaryColor,
                    }}
                  >
                    <Text style={{ fontWeight: 600 }}>{"Technologies: "}</Text>
                    {proj.technologies.join(", ")}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </>
      );
    }
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

  if (entryStyle === "table" || entryStyle === "label-column") {
    const borderColor = borderTint(s.secondaryColor, "40");
    const tint = withAlpha(accentColor, "20");
    const variant = entryStyle === "label-column" ? "label" : "boxed";
    return (
      <>
        {resume.projects.map((proj, i) => (
          <PdfTableEntry
            key={i}
            borderColor={borderColor}
            sp={s.sp}
            variant={variant}
          >
            <PdfTableRow
              label="Project"
              accentColor={tint}
              borderColor={borderColor}
              fontSize={smallFontSize}
              sp={s.sp}
              variant={variant}
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
              variant={variant}
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
              variant={variant}
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
  const headingStyle = skillsHeadingStyle(config);

  const skillLabel = (category: string) => (
    <View style={{ marginBottom: s.sp(2) }}>
      <Text
        style={{
          fontSize: s.smallFontSize,
          fontWeight: 700,
          color: s.primaryColor,
          ...pdfSkillLabelStyle(headingStyle),
        }}
      >
        {category}
      </Text>
      {headingStyle === "accent-rule" && (
        <View
          style={{
            marginTop: s.sp(2),
            width: "20%",
            borderBottomWidth: 2,
            borderBottomColor: s.primaryColor,
          }}
        />
      )}
    </View>
  );

  if (config.skillStyle === "chips") {
    return (
      <View style={{ flexDirection: "column", gap: s.sp(6) }}>
        {groups.map((group, gi) => (
          <View key={gi}>
            {group.category ? skillLabel(group.category) : null}
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", gap: s.sp(6) }}
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
                    paddingHorizontal: s.sp(3),
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
    return groups.map((group, gi) => (
      <View key={gi} wrap={false} style={{ marginBottom: s.sp(6) }}>
        {group.category ? skillLabel(group.category) : null}
        <Text
          style={{
            fontSize: s.smallFontSize,
            lineHeight: s.lineHeight,
            color: s.textColor,
          }}
        >
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
      <View key={gi} wrap={false} style={{ marginBottom: s.sp(6) }}>
        {group.category ? skillLabel(group.category) : null}
        <Text
          style={{
            fontSize: s.smallFontSize,
            lineHeight: s.lineHeight,
            color: s.textColor,
          }}
        >
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

  // "columns" and "inline" now share the same label-above-content shape as
  // list/grid — the side-by-side label column and the inline-paragraph flow
  // both got replaced by the subheading treatment.
  if (config.skillStyle === "columns" || config.skillStyle === "inline") {
    return groups.map((group, gi) => (
      <View key={gi} wrap={false} style={{ marginBottom: s.sp(6) }}>
        {group.category ? skillLabel(group.category) : null}
        <Text
          style={{
            fontSize: s.smallFontSize,
            lineHeight: s.lineHeight,
            color: s.textColor,
          }}
        >
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

  // config.skillStyle === "table" (bjet-professional): two ROWS per
  // category — a coloured label bar, then the skills underneath — instead
  // of the label|content two-COLUMN layout `PdfTableRow` uses for every
  // other "table" entryStyle field. Deliberately bespoke, not `PdfTableRow`,
  // so Company/Role/Duration/Details elsewhere keep their side-by-side
  // layout untouched.
  const borderColor = borderTint(s.secondaryColor, "40");
  const tint = withAlpha(s.accentColor, "20");
  return (
    <View wrap={false} style={{ borderWidth: 1, borderColor, borderRadius: 3 }}>
      {groups.length > 0 ? (
        groups.map((group, gi) => (
          <View
            key={gi}
            style={{
              borderBottomWidth: gi === groups.length - 1 ? 0 : 1,
              borderBottomColor: borderColor,
            }}
          >
            {group.category ? (
              <View style={{ backgroundColor: tint, padding: s.sp(4) }}>
                <Text
                  style={{
                    fontSize: s.smallFontSize,
                    fontWeight: 700,
                    color: s.primaryColor,
                    ...pdfSkillLabelStyle(headingStyle),
                  }}
                >
                  {group.category}
                </Text>
              </View>
            ) : null}
            <Text
              style={{
                fontSize: s.smallFontSize,
                lineHeight: s.lineHeight,
                padding: s.sp(4),
              }}
            >
              {group.skills.map((skill) => skill.name).join(", ")}
            </Text>
          </View>
        ))
      ) : (
        <Text style={{ fontSize: s.smallFontSize, padding: s.sp(4) }}>—</Text>
      )}
    </View>
  );
};

const pdfEducation: PDFSectionBuilder = ({ resume, styles: s, config }) => {
  const { fontSize, smallFontSize, accentColor, dateFormat } = s;
  const entryStyle = config.entryStyle;
  const isMultiColumn = config.columns > 1;
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

  if (
    entryStyle === "timeline" ||
    entryStyle === "marker" ||
    entryStyle === "date-column"
  ) {
    if (entryStyle === "date-column") {
      const borderColor = borderTint(s.secondaryColor, "40");
      return (
        <>
          {resume.education.map((edu, i) => (
            <View
              key={i}
              wrap={false}
              style={{
                flexDirection: "row",
                paddingBottom: s.sp(10),
                gap: s.sp(8),
              }}
            >
              <View style={{ width: "22%" }}>
                <Text
                  style={{
                    fontSize: smallFontSize,
                    color: accentColor,
                    textAlign: "right",
                  }}
                >
                  {formatDateRange(edu.startDate, edu.endDate, dateFormat)}
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  borderLeftWidth: 1,
                  borderLeftColor: borderColor,
                  paddingLeft: s.sp(8),
                }}
              >
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
            </View>
          ))}
        </>
      );
    }
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

  if (entryStyle === "table" || entryStyle === "label-column") {
    const borderColor = borderTint(s.secondaryColor, "40");
    const tint = withAlpha(accentColor, "20");
    const variant = entryStyle === "label-column" ? "label" : "boxed";
    return (
      <>
        {resume.education.map((edu, i) => (
          <PdfTableEntry
            key={i}
            borderColor={borderColor}
            sp={s.sp}
            variant={variant}
          >
            <PdfTableRow
              label="Institution"
              accentColor={tint}
              borderColor={borderColor}
              fontSize={smallFontSize}
              sp={s.sp}
              variant={variant}
            >
              <Text style={{ fontSize: smallFontSize }}>{edu.institution}</Text>
            </PdfTableRow>
            <PdfTableRow
              label="Degree"
              accentColor={tint}
              borderColor={borderColor}
              fontSize={smallFontSize}
              sp={s.sp}
              variant={variant}
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
              variant={variant}
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
                variant={variant}
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
              flexDirection: isMultiColumn ? "column" : "row",
              justifyContent: isMultiColumn ? undefined : "space-between",
              alignItems: "flex-start",
              gap: isMultiColumn ? s.sp(2) : undefined,
            }}
          >
            {/* See pdfExperience's identical comment above — `flex: 1` only
                belongs in row mode. */}
            <View style={isMultiColumn ? undefined : { flex: 1 }}>
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
  const isMultiColumn = config.columns > 1;
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

  if (
    entryStyle === "timeline" ||
    entryStyle === "marker" ||
    entryStyle === "date-column"
  ) {
    if (entryStyle === "date-column") {
      const borderColor = borderTint(s.secondaryColor, "40");
      return (
        <>
          {vols.map((v, i) => (
            <View
              key={i}
              wrap={false}
              style={{
                flexDirection: "row",
                paddingBottom: s.sp(10),
                gap: s.sp(8),
              }}
            >
              <View style={{ width: "22%" }}>
                <Text
                  style={{
                    fontSize: smallFontSize,
                    color: accentColor,
                    textAlign: "right",
                  }}
                >
                  {formatDateRange(v.startDate, v.endDate, dateFormat)}
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  borderLeftWidth: 1,
                  borderLeftColor: borderColor,
                  paddingLeft: s.sp(8),
                }}
              >
                <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
                  {v.role}
                </Text>
                <Text
                  style={{ fontSize: smallFontSize, color: s.secondaryColor }}
                >
                  {v.organization}
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
            </View>
          ))}
        </>
      );
    }
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

  if (entryStyle === "table" || entryStyle === "label-column") {
    const borderColor = borderTint(s.secondaryColor, "40");
    const tint = withAlpha(accentColor, "20");
    const variant = entryStyle === "label-column" ? "label" : "boxed";
    return (
      <>
        {vols.map((v, i) => (
          <PdfTableEntry
            key={i}
            borderColor={borderColor}
            sp={s.sp}
            variant={variant}
          >
            <PdfTableRow
              label="Organization"
              accentColor={tint}
              borderColor={borderColor}
              fontSize={smallFontSize}
              sp={s.sp}
              variant={variant}
            >
              <Text style={{ fontSize: smallFontSize }}>{v.organization}</Text>
            </PdfTableRow>
            <PdfTableRow
              label="Role"
              accentColor={tint}
              borderColor={borderColor}
              fontSize={smallFontSize}
              sp={s.sp}
              variant={variant}
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
              variant={variant}
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
                variant={variant}
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
              flexDirection: isMultiColumn ? "column" : "row",
              justifyContent: isMultiColumn ? undefined : "space-between",
              alignItems: "flex-start",
              gap: isMultiColumn ? s.sp(2) : undefined,
            }}
          >
            {/* See pdfExperience's identical comment above — `flex: 1` only
                belongs in row mode. */}
            <View style={isMultiColumn ? undefined : { flex: 1 }}>
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

const pdfCustom: PDFSectionBuilder = ({
  resume,
  instance,
  styles: s,
  config,
}) => {
  const section = (resume.sectionLayout?.custom ?? []).find(
    (c) => c.id === instance.id
  );
  if (!section || section.items.length === 0) return null;
  const glyph = bulletGlyph(config.bulletStyle);

  return section.type === "text" ? (
    <Text
      style={{
        fontSize: s.fontSize,
        lineHeight: s.lineHeight,
        color: s.textColor,
      }}
    >
      {section.items.join(" ")}
    </Text>
  ) : (
    <>
      {section.items.map((item, i) => (
        <Text
          key={i}
          style={{
            fontSize: s.fontSize,
            lineHeight: s.lineHeight,
            color: s.textColor,
          }}
        >
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
