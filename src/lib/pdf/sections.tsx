import { Link, Text, View } from "@react-pdf/renderer";
import React from "react";

import { bulletGlyph } from "@/components/job-v2/engine/bulletGlyph";
import { ResolvedTemplateConfig } from "@/components/job-v2/engine/types";
import { formatDateRange } from "@/lib/date";
import { isHtml } from "@/lib/htmlUtils";
import { HeadingStyle } from "@/types/customization";
import { ResumeJSON, Skill } from "@/types/resume";

import { htmlToPdfNodes } from "./htmlToPdf";
import { borderTint, ResolvedPDFStyles, withAlpha } from "./resolveStyles";

import type { Styles } from "@react-pdf/renderer";

type Style = Styles[string];

/** Rich-text field → react-pdf nodes (paragraphs, lists, bold, links) via
 * `htmlToPdfNodes`. Plain strings (no tags) render as one Text, unchanged.
 * The last node's trailing margin is zeroed so a field never leaves a gap
 * after itself — the caller owns all spacing. `fontSize` defaults to body. */
function rich(
  text: string | null | undefined,
  s: ResolvedPDFStyles,
  opts: { fontSize?: number; justify?: boolean } = {}
): React.ReactNode {
  if (!text) return null;
  const fontSize = opts.fontSize ?? s.fontSize;
  const nodes: React.ReactElement<{ style?: Style }>[] = isHtml(text)
    ? htmlToPdfNodes(text, s, { fontSize })
    : [
        <Text
          key={0}
          style={{
            fontFamily: s.fontFamily,
            fontSize,
            color: s.textColor,
            lineHeight: s.lineHeight,
          }}
        >
          {text}
        </Text>,
      ];
  const last = nodes.length - 1;
  return nodes.map((n, i) =>
    React.cloneElement(n, {
      style: {
        ...n.props.style,
        ...(opts.justify ? { textAlign: "justify" as const } : {}),
        ...(i === last ? { marginBottom: 0 } : {}),
      },
    })
  );
}

/** `rich()` inside a View carrying the caller's margins; null when empty. */
function richBlock(
  text: string | null | undefined,
  s: ResolvedPDFStyles,
  opts: {
    fontSize?: number;
    justify?: boolean;
    marginTop?: number;
    marginBottom?: number;
  } = {}
): React.ReactNode {
  if (!text) return null;
  const { marginTop, marginBottom, ...richOpts } = opts;
  return (
    <View style={{ marginTop, marginBottom }}>{rich(text, s, richOpts)}</View>
  );
}

/** Hanging-indent bullet list: 10pt glyph column, text flex:1, sp(2) between. */
function bulletList(
  items: string[],
  s: ResolvedPDFStyles,
  config: ResolvedTemplateConfig,
  fontSize: number = s.fontSize
): React.ReactNode {
  if (items.length === 0) return null;
  const glyph = bulletGlyph(config.bulletStyle);
  return (
    <View>
      {items.map((a, j) => (
        <View
          key={j}
          style={{ flexDirection: "row", marginTop: j > 0 ? s.sp(2) : 0 }}
        >
          <View style={{ width: 10 }}>
            <Text
              style={{
                fontSize,
                lineHeight: s.lineHeight,
                color: s.accentColor,
              }}
            >
              {glyph}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            {rich(a, s, { fontSize, justify: config.justifyText })}
          </View>
        </View>
      ))}
    </View>
  );
}

/** An entry that may break between bullets: `head` (entry head + first bullet)
 * is one unbreakable unit, each `rest[k]` (one more bullet) another. */
type EntrySplit = { head: React.ReactNode; rest: React.ReactNode[] };

const isEntrySplit = (v: React.ReactNode | EntrySplit): v is EntrySplit =>
  typeof v === "object" &&
  v !== null &&
  !React.isValidElement(v) &&
  "head" in v &&
  "rest" in v;

/** Entries with sp(6) between them and no trailing margin. `tight` (rail /
 * date-column styles) skips the gap — those pad themselves to keep the rail
 * continuous. A render callback returns either a node (one atomic unit) or an
 * `EntrySplit` (see `splitEntry`) whose units each get their own
 * `wrap={false}` View, so the page may break between bullets. */
function entries<T>(
  list: T[],
  s: ResolvedPDFStyles,
  render: (item: T, i: number, last: boolean) => React.ReactNode | EntrySplit,
  tight = false
): React.ReactNode {
  return (
    <>
      {list.map((item, i) => {
        const out = render(item, i, i === list.length - 1);
        const marginTop = !tight && i > 0 ? s.sp(6) : 0;
        if (!isEntrySplit(out)) {
          return (
            <View key={i} wrap={false} style={{ marginTop }}>
              {out}
            </View>
          );
        }
        return (
          <React.Fragment key={i}>
            <View wrap={false} style={{ marginTop }}>
              {out.head}
            </View>
            {out.rest.map((unit, k) => (
              <View key={k} wrap={false}>
                {unit}
              </View>
            ))}
          </React.Fragment>
        );
      })}
    </>
  );
}

/** Splits an entry with >1 bullets into head (`headBody` + first bullet) and
 * one unit per remaining bullet; ≤1 bullets stays a single node. `wrap` is the
 * entry's container (rail / marker indent / date column) — it is applied to
 * every unit, with `head` true only on the first (dots live there) and
 * `final` true only on the last (the entry's bottom padding goes there). A
 * continuation's `paddingTop` sits INSIDE the wrapper so a rail stays
 * continuous. */
function splitEntry(
  items: string[],
  s: ResolvedPDFStyles,
  config: ResolvedTemplateConfig,
  fontSize: number,
  headBody: (bullets: React.ReactNode) => React.ReactNode,
  wrap: (
    body: React.ReactNode,
    edge: { head: boolean; final: boolean }
  ) => React.ReactNode
): React.ReactNode | EntrySplit {
  if (items.length <= 1) {
    return wrap(headBody(bulletList(items, s, config, fontSize)), {
      head: true,
      final: true,
    });
  }
  return {
    head: wrap(headBody(bulletList(items.slice(0, 1), s, config, fontSize)), {
      head: true,
      final: false,
    }),
    rest: items
      .slice(1)
      .map((item, k) =>
        wrap(
          <View style={{ paddingTop: s.sp(2) }}>
            {bulletList([item], s, config, fontSize)}
          </View>,
          { head: false, final: k === items.length - 2 }
        )
      ),
  };
}

const isRailStyle = (entryStyle: ResolvedTemplateConfig["entryStyle"]) =>
  entryStyle === "timeline" || entryStyle === "date-column";

/** Container style for timeline (continuous rail) / marker (floating dot). */
function railBox(
  s: ResolvedPDFStyles,
  timeline: boolean,
  last: boolean
): Style {
  return timeline
    ? {
        position: "relative",
        paddingLeft: s.sp(10),
        paddingBottom: last ? 0 : s.sp(10),
        borderLeftWidth: s.sp(2),
        borderLeftColor: s.accentColor,
      }
    : { paddingLeft: s.sp(12), position: "relative" };
}

/** 6pt dot; for a timeline it is centered on the rail (rail width via sp). */
function railDot(s: ResolvedPDFStyles, timeline: boolean) {
  return (
    <View
      style={{
        position: "absolute",
        left: timeline ? -(s.sp(2) / 2) - 3 : 0,
        top: 3,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: s.accentColor,
      }}
    />
  );
}

/** Left date column + ruled body, shared by every date-column entry. */
function dateColumnEntry(
  s: ResolvedPDFStyles,
  last: boolean,
  date: React.ReactNode,
  body: React.ReactNode
) {
  return (
    <View
      style={{
        flexDirection: "row",
        paddingBottom: last ? 0 : s.sp(10),
        gap: s.sp(8),
      }}
    >
      <View style={{ width: "22%" }}>
        {date ? (
          <Text
            style={{
              fontSize: s.smallFontSize,
              color: s.accentColor,
              textAlign: "right",
            }}
          >
            {date}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          flex: 1,
          borderLeftWidth: 1,
          borderLeftColor: borderTint(s.secondaryColor, "40"),
          paddingLeft: s.sp(8),
        }}
      >
        {body}
      </View>
    </View>
  );
}

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
        <View style={{ flex: 1, padding: sp(6) }}>{children}</View>
      </View>
    );
  }
  if (variant === "label") {
    return (
      <View style={{ flexDirection: "row" as const }}>
        <View
          style={{
            width: 82.5,
            borderRightWidth: 1,
            borderRightColor: borderColor,
            padding: sp(6),
          }}
        >
          <Text style={{ fontSize, fontWeight: 700, textAlign: "right" }}>
            {label}
          </Text>
        </View>
        <View style={{ flex: 1, padding: sp(6) }}>{children}</View>
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
          width: 82.5,
          backgroundColor: accentColor,
          borderRightWidth: 1,
          borderRightColor: borderColor,
          padding: sp(6),
        }}
      >
        <Text style={{ fontSize, fontWeight: 700 }}>{label}</Text>
      </View>
      <View style={{ flex: 1, padding: sp(6) }}>{children}</View>
    </View>
  );
}

/** Bordered box wrapping a run of `PdfTableRow`s. Entry-to-entry spacing is
 * owned by `entries()`, not this wrapper.
 * `variant="label"` (europass-classic) drops the outer box border — the
 * single vertical divider comes from `PdfTableRow`'s own right border. */
function PdfTableEntry({
  children,
  borderColor,
  variant = "boxed",
}: {
  children: React.ReactNode;
  borderColor: string;
  variant?: "boxed" | "label";
}) {
  if (variant === "label") {
    return <View>{children}</View>;
  }
  return (
    <View wrap={false} style={{ borderWidth: 1, borderColor }}>
      {children}
    </View>
  );
}

/** Wraps a date-range Text in a tinted pill when `dateStyle === "badge"`.
 * `extra` carries row-mode layout (flexShrink/marginLeft) from the caller. */
function pdfDateNode({
  children,
  dateStyle,
  primaryColor,
  secondaryColor,
  smallFontSize,
  sp,
  extra,
}: {
  children: React.ReactNode;
  dateStyle: ResolvedTemplateConfig["dateStyle"];
  primaryColor: string;
  secondaryColor: string;
  smallFontSize: number;
  sp: (n: number) => number;
  extra?: Style;
}) {
  if (dateStyle === "badge") {
    return (
      <Text
        style={{
          fontSize: smallFontSize,
          color: primaryColor,
          backgroundColor: withAlpha(primaryColor, "1a"),
          borderRadius: 8,
          // DOM: `px-3 py-1` (sections.tsx `dateNode`).
          paddingVertical: sp(3),
          paddingHorizontal: sp(9),
          ...extra,
        }}
      >
        {children}
      </Text>
    );
  }
  return (
    <Text style={{ fontSize: smallFontSize, color: secondaryColor, ...extra }}>
      {children}
    </Text>
  );
}

/** Date node for a title+date row: shrink-proof, with a gap from the title,
 * but only in row mode (multi-column stacks the date under the title). */
function rowDate(
  s: ResolvedPDFStyles,
  config: ResolvedTemplateConfig,
  children: React.ReactNode,
  stacked: boolean
) {
  return pdfDateNode({
    children,
    dateStyle: config.dateStyle,
    primaryColor: s.primaryColor,
    secondaryColor: s.secondaryColor,
    smallFontSize: s.smallFontSize,
    sp: s.sp,
    // DOM row is `gap-4` (12pt) between title block and date.
    extra: stacked ? undefined : { flexShrink: 0, marginLeft: s.sp(12) },
  });
}

// ── PDF Section Builders ────────────────────────────────────────────────────
// Mirror of DOM section builders, but emit react-pdf Views/Texts instead of DOM nodes.
// Each builder handles one section type and is parameterized by instance.title.

const pdfSummary: PDFSectionBuilder = ({ resume, styles: s, config }) => {
  if (!resume.summary) return null;
  return (
    <View>{rich(resume.summary, s, { justify: config.justifyText })}</View>
  );
};

const pdfExperience: PDFSectionBuilder = ({ resume, styles: s, config }) => {
  const { fontSize, smallFontSize, accentColor, dateFormat } = s;
  const entryStyle = config.entryStyle;
  const isMultiColumn = config.columns > 1;
  if (resume.experience.length === 0) return null;
  const range = (exp: (typeof resume.experience)[number]) =>
    formatDateRange(exp.startDate, exp.endDate, dateFormat);

  if (entryStyle === "compact") {
    return entries(resume.experience, s, (exp) =>
      splitEntry(
        exp.achievements,
        s,
        config,
        smallFontSize,
        (bullets) => (
          <>
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
                {range(exp)}
              </Text>
            </Text>
            {richBlock(exp.description, s, { fontSize: smallFontSize })}
            {bullets}
          </>
        ),
        (body) => <View>{body}</View>
      )
    );
  }

  if (
    entryStyle === "timeline" ||
    entryStyle === "marker" ||
    entryStyle === "date-column"
  ) {
    return entries(
      resume.experience,
      s,
      (exp, _i, last) => {
        const description = richBlock(exp.description, s, {
          marginTop: s.sp(2),
          marginBottom: exp.achievements.length > 0 ? s.sp(3) : 0,
        });
        if (entryStyle === "date-column") {
          return splitEntry(
            exp.achievements,
            s,
            config,
            fontSize,
            (bullets) => (
              <>
                <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
                  {exp.role}
                </Text>
                <Text
                  style={{ fontSize: smallFontSize, color: s.secondaryColor }}
                >
                  {exp.company}
                </Text>
                {description}
                {bullets}
              </>
            ),
            (body, edge) =>
              dateColumnEntry(
                s,
                last || !edge.final,
                edge.head ? range(exp) : null,
                body
              )
          );
        }
        const timeline = entryStyle === "timeline";
        return splitEntry(
          exp.achievements,
          s,
          config,
          fontSize,
          (bullets) => (
            <>
              {timeline ? (
                <Text
                  style={{
                    fontSize: smallFontSize,
                    color: s.secondaryColor,
                    marginBottom: s.sp(2),
                  }}
                >
                  {range(exp)}
                </Text>
              ) : null}
              <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
                {exp.role}
              </Text>
              <Text
                style={{ fontSize: smallFontSize, color: s.secondaryColor }}
              >
                {exp.company}
                {entryStyle === "marker" ? ` · ${range(exp)}` : ""}
              </Text>
              {description}
              {bullets}
            </>
          ),
          (body, edge) => (
            <View style={railBox(s, timeline, last || !edge.final)}>
              {edge.head ? railDot(s, timeline) : null}
              {body}
            </View>
          )
        );
      },
      isRailStyle(entryStyle)
    );
  }

  if (entryStyle === "table" || entryStyle === "label-column") {
    const borderColor = borderTint(s.secondaryColor, "40");
    const tint = withAlpha(accentColor, "20");
    const variant = entryStyle === "label-column" ? "label" : "boxed";
    return entries(resume.experience, s, (exp) => (
      <PdfTableEntry borderColor={borderColor} variant={variant}>
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
          <Text style={{ fontSize: smallFontSize }}>{range(exp)}</Text>
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
          {richBlock(exp.description, s, {
            fontSize: smallFontSize,
            marginBottom: exp.achievements.length > 0 ? s.sp(2) : 0,
          })}
          {bulletList(exp.achievements, s, config, smallFontSize)}
        </PdfTableRow>
      </PdfTableEntry>
    ));
  }

  return entries(resume.experience, s, (exp) =>
    splitEntry(
      exp.achievements,
      s,
      config,
      fontSize,
      (bullets) => (
        <>
          <View
            style={{
              flexDirection: isMultiColumn ? "column" : "row",
              justifyContent: isMultiColumn ? undefined : "space-between",
              alignItems: "flex-start",
              gap: isMultiColumn ? s.sp(6) : undefined, // DOM `flex-col gap-2`
              marginBottom: s.sp(2),
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
            {rowDate(s, config, range(exp), isMultiColumn)}
          </View>
          {richBlock(exp.description, s, {
            justify: config.justifyText,
            marginBottom: exp.achievements.length > 0 ? s.sp(3) : 0,
          })}
          {bullets}
        </>
      ),
      (body) => <View>{body}</View>
    )
  );
};

const pdfProjects: PDFSectionBuilder = ({ resume, styles: s, config }) => {
  const { fontSize, smallFontSize, accentColor, secondaryColor, dateFormat } =
    s;
  const entryStyle = config.entryStyle;
  if (resume.projects.length === 0) return null;
  type Proj = (typeof resume.projects)[number];
  const hasDates = (p: Proj) => !!(p.startDate || p.endDate);
  const range = (p: Proj) =>
    formatDateRange(p.startDate, p.endDate, dateFormat);
  /** `[Link]` after the name; inherits the name's size, regular weight. */
  const link = (p: Proj) =>
    p.url ? (
      <Text style={{ fontWeight: 400, color: secondaryColor }}>
        {"  "}
        <Link src={p.url} style={{ color: secondaryColor }}>
          [Link]
        </Link>
      </Text>
    ) : null;
  const tech = (p: Proj) =>
    p.technologies.length > 0 ? (
      <Text style={{ fontSize: smallFontSize, color: s.secondaryColor }}>
        <Text style={{ fontWeight: 600 }}>{"Technologies: "}</Text>
        {p.technologies.join(", ")}
      </Text>
    ) : null;

  if (entryStyle === "compact") {
    return entries(resume.projects, s, (proj) => (
      <View>
        <Text style={{ fontSize, color: s.textColor }}>
          <Text style={{ fontWeight: 700, color: accentColor }}>
            {proj.name}
          </Text>
          {link(proj)}
          {proj.technologies.length > 0 &&
            `  ·  ${proj.technologies.join(", ")}`}
          {hasDates(proj) ? (
            <Text style={{ fontSize: smallFontSize, color: secondaryColor }}>
              {"  ·  "}
              {range(proj)}
            </Text>
          ) : null}
        </Text>
        {richBlock(proj.description, s, { fontSize: smallFontSize })}
      </View>
    ));
  }

  if (
    entryStyle === "timeline" ||
    entryStyle === "marker" ||
    entryStyle === "date-column"
  ) {
    return entries(
      resume.projects,
      s,
      (proj, _i, last) => {
        const description = richBlock(proj.description, s, {
          marginTop: s.sp(2),
          marginBottom: proj.technologies.length > 0 ? s.sp(3) : 0,
        });
        if (entryStyle === "date-column") {
          return dateColumnEntry(
            s,
            last,
            hasDates(proj) ? range(proj) : null,
            <>
              <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
                {proj.name}
                {link(proj)}
              </Text>
              {description}
              {tech(proj)}
            </>
          );
        }
        const timeline = entryStyle === "timeline";
        const dateLine = hasDates(proj) ? (
          <Text
            style={{
              fontSize: smallFontSize,
              color: s.secondaryColor,
              marginBottom: timeline ? s.sp(2) : 0,
            }}
          >
            {range(proj)}
          </Text>
        ) : null;
        return (
          <View style={railBox(s, timeline, last)}>
            {railDot(s, timeline)}
            {timeline ? dateLine : null}
            <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
              {proj.name}
              {link(proj)}
            </Text>
            {timeline ? null : dateLine}
            {description}
            {tech(proj)}
          </View>
        );
      },
      isRailStyle(entryStyle)
    );
  }

  if (entryStyle === "table" || entryStyle === "label-column") {
    const borderColor = borderTint(s.secondaryColor, "40");
    const tint = withAlpha(accentColor, "20");
    const variant = entryStyle === "label-column" ? "label" : "boxed";
    return entries(resume.projects, s, (proj) => (
      <PdfTableEntry borderColor={borderColor} variant={variant}>
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
            {link(proj)}
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
            {hasDates(proj) ? range(proj) : "—"}
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
          {richBlock(proj.description, s, {
            fontSize: smallFontSize,
            marginBottom: proj.technologies.length > 0 ? s.sp(2) : 0,
          })}
          {tech(proj)}
        </PdfTableRow>
      </PdfTableEntry>
    ));
  }

  return entries(resume.projects, s, (proj) => (
    <View>
      {/* Date stacked under the name, as the DOM's standard project entry. */}
      <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
        {proj.name}
        {link(proj)}
      </Text>
      {hasDates(proj) ? (
        <View style={{ flexDirection: "row" }}>
          {rowDate(s, config, range(proj), true)}
        </View>
      ) : null}
      {richBlock(proj.description, s, {
        justify: config.justifyText,
        marginBottom: proj.technologies.length > 0 ? s.sp(3) : 0,
      })}
      {tech(proj)}
    </View>
  ));
};

/** Styles whose PDF section is a single atomic block (mirrors
 * `SINGLE_BLOCK_SKILL_STYLES` in `engine/sections.tsx`) — `table`
 * renders as one View so `SectionGroup` can't split them mid-box,
 * and `inline` is one flowing paragraph. `chips`/`list`/`grid`/`columns` instead
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
    // One unbreakable node per category (DOM: one paginator block per
    // category) so a long chip list can start on the current page instead
    // of jumping whole to the next one. marginTop, not marginBottom — see
    // the section-gap note in PDFTemplateEngine.tsx.
    return groups.map((group, gi) => (
      <View key={gi} wrap={false} style={{ marginTop: gi > 0 ? s.sp(6) : 0 }}>
        {group.category ? skillLabel(group.category) : null}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: s.sp(4.5),
          }}
        >
          {group.skills.map((skill, si) => (
            <Text
              key={si}
              style={{
                fontSize: s.smallFontSize,
                color: s.accentColor,
                backgroundColor: withAlpha(s.accentColor, "1a"),
                borderRadius: 8,
                paddingVertical: s.sp(1.5),
                paddingHorizontal: s.sp(3),
              }}
            >
              {skill.name}
            </Text>
          ))}
        </View>
      </View>
    ));
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
  type Edu = (typeof resume.education)[number];
  const range = (e: Edu) => formatDateRange(e.startDate, e.endDate, dateFormat);
  const degree = (e: Edu) => `${e.degree}${e.field ? ` in ${e.field}` : ""}`;
  const gpaLine = (e: Edu) =>
    e.gpa ? (
      <Text style={{ fontSize: smallFontSize, color: s.secondaryColor }}>
        GPA: {e.gpa}
      </Text>
    ) : null;

  if (entryStyle === "compact") {
    return entries(resume.education, s, (edu) => (
      <View>
        <Text style={{ fontSize, color: s.textColor }}>
          <Text style={{ fontWeight: 700, color: accentColor }}>
            {degree(edu)}
          </Text>
          {" — "}
          {edu.institution}
          <Text style={{ fontSize: smallFontSize, color: s.secondaryColor }}>
            {"  ·  "}
            {range(edu)}
            {edu.gpa ? `  ·  GPA: ${edu.gpa}` : ""}
          </Text>
        </Text>
      </View>
    ));
  }

  if (
    entryStyle === "timeline" ||
    entryStyle === "marker" ||
    entryStyle === "date-column"
  ) {
    return entries(
      resume.education,
      s,
      (edu, _i, last) => {
        if (entryStyle === "date-column") {
          return dateColumnEntry(
            s,
            last,
            range(edu),
            <>
              <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
                {degree(edu)}
              </Text>
              <Text
                style={{ fontSize: smallFontSize, color: s.secondaryColor }}
              >
                {edu.institution}
              </Text>
              {gpaLine(edu)}
            </>
          );
        }
        const timeline = entryStyle === "timeline";
        return (
          <View style={railBox(s, timeline, last)}>
            {railDot(s, timeline)}
            {timeline ? (
              <Text
                style={{
                  fontSize: smallFontSize,
                  color: s.secondaryColor,
                  marginBottom: s.sp(2),
                }}
              >
                {range(edu)}
              </Text>
            ) : null}
            <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
              {degree(edu)}
            </Text>
            <Text style={{ fontSize: smallFontSize, color: s.secondaryColor }}>
              {edu.institution}
              {entryStyle === "marker" ? ` · ${range(edu)}` : ""}
            </Text>
            {gpaLine(edu)}
          </View>
        );
      },
      isRailStyle(entryStyle)
    );
  }

  if (entryStyle === "table" || entryStyle === "label-column") {
    const borderColor = borderTint(s.secondaryColor, "40");
    const tint = withAlpha(accentColor, "20");
    const variant = entryStyle === "label-column" ? "label" : "boxed";
    return entries(resume.education, s, (edu) => (
      <PdfTableEntry borderColor={borderColor} variant={variant}>
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
          <Text style={{ fontSize: smallFontSize }}>{degree(edu)}</Text>
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
          <Text style={{ fontSize: smallFontSize }}>{range(edu)}</Text>
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
    ));
  }

  return entries(resume.education, s, (edu) => (
    <View>
      <View
        style={{
          flexDirection: isMultiColumn ? "column" : "row",
          justifyContent: isMultiColumn ? undefined : "space-between",
          alignItems: "flex-start",
          gap: isMultiColumn ? s.sp(6) : undefined, // DOM `flex-col gap-2`
        }}
      >
        {/* See pdfExperience's identical comment above — `flex: 1` only
                belongs in row mode. */}
        <View style={isMultiColumn ? undefined : { flex: 1 }}>
          <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
            {degree(edu)}
          </Text>
          <Text style={{ fontSize: smallFontSize, color: s.secondaryColor }}>
            {edu.institution}
          </Text>
        </View>
        {rowDate(s, config, range(edu), isMultiColumn)}
      </View>
      {gpaLine(edu)}
    </View>
  ));
};

const pdfCertifications: PDFSectionBuilder = ({ resume, styles: s }) => {
  const { fontSize, smallFontSize, accentColor, secondaryColor } = s;
  if (resume.certifications.length === 0) return null;

  return entries(resume.certifications, s, (cert) => (
    <View>
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
  ));
};

const pdfPublications: PDFSectionBuilder = ({ resume, styles: s }) => {
  const { fontSize, smallFontSize, lineHeight, accentColor } = s;
  const pubs = resume.publications ?? [];
  if (pubs.length === 0) return null;

  return entries(pubs, s, (pub) => (
    <View>
      <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
        {pub.title}
      </Text>
      <Text style={{ fontSize: smallFontSize, lineHeight, color: s.textColor }}>
        {pub.authors.join(", ")}
      </Text>
      <Text style={{ fontSize: smallFontSize, color: s.secondaryColor }}>
        {pub.venue}
        {" • "}
        {pub.date}
        {pub.doi ? `  •  DOI: ${pub.doi}` : ""}
        {pub.url ? (
          <Text>
            {"  "}
            <Link src={pub.url} style={{ color: s.secondaryColor }}>
              [View]
            </Link>
          </Text>
        ) : null}
      </Text>
    </View>
  ));
};

const pdfLanguages: PDFSectionBuilder = ({ resume, styles: s }) => {
  const langs = resume.languages ?? [];
  if (langs.length === 0) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        columnGap: s.sp(12),
        rowGap: s.sp(3),
      }}
    >
      {langs.map((l, i) => (
        <Text
          key={i}
          style={{
            fontSize: s.fontSize,
            lineHeight: s.lineHeight,
            color: s.textColor,
          }}
        >
          {l.proficiency?.trim() ? `${l.name} (${l.proficiency})` : l.name}
        </Text>
      ))}
    </View>
  );
};

const pdfVolunteer: PDFSectionBuilder = ({ resume, styles: s, config }) => {
  const { fontSize, smallFontSize, accentColor, dateFormat } = s;
  const entryStyle = config.entryStyle;
  const isMultiColumn = config.columns > 1;
  const vols = resume.volunteer ?? [];
  if (vols.length === 0) return null;
  type Vol = (typeof vols)[number];
  const range = (v: Vol) => formatDateRange(v.startDate, v.endDate, dateFormat);

  if (entryStyle === "compact") {
    return entries(vols, s, (v) => (
      <View>
        <Text style={{ fontSize, color: s.textColor }}>
          <Text style={{ fontWeight: 700, color: accentColor }}>{v.role}</Text>
          {" — "}
          {v.organization}
          <Text style={{ fontSize: smallFontSize, color: s.secondaryColor }}>
            {"  ·  "}
            {range(v)}
          </Text>
        </Text>
        {richBlock(v.description, s, { fontSize: smallFontSize })}
      </View>
    ));
  }

  if (
    entryStyle === "timeline" ||
    entryStyle === "marker" ||
    entryStyle === "date-column"
  ) {
    return entries(
      vols,
      s,
      (v, _i, last) => {
        const description = richBlock(v.description, s, {
          marginTop: s.sp(2),
        });
        if (entryStyle === "date-column") {
          return dateColumnEntry(
            s,
            last,
            range(v),
            <>
              <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
                {v.role}
              </Text>
              <Text
                style={{ fontSize: smallFontSize, color: s.secondaryColor }}
              >
                {v.organization}
              </Text>
              {description}
            </>
          );
        }
        const timeline = entryStyle === "timeline";
        return (
          <View style={railBox(s, timeline, last)}>
            {railDot(s, timeline)}
            {timeline ? (
              <Text
                style={{
                  fontSize: smallFontSize,
                  color: s.secondaryColor,
                  marginBottom: s.sp(2),
                }}
              >
                {range(v)}
              </Text>
            ) : null}
            <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
              {v.role}
            </Text>
            <Text style={{ fontSize: smallFontSize, color: s.secondaryColor }}>
              {v.organization}
              {entryStyle === "marker" ? ` · ${range(v)}` : ""}
            </Text>
            {description}
          </View>
        );
      },
      isRailStyle(entryStyle)
    );
  }

  if (entryStyle === "table" || entryStyle === "label-column") {
    const borderColor = borderTint(s.secondaryColor, "40");
    const tint = withAlpha(accentColor, "20");
    const variant = entryStyle === "label-column" ? "label" : "boxed";
    return entries(vols, s, (v) => (
      <PdfTableEntry borderColor={borderColor} variant={variant}>
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
          <Text style={{ fontSize: smallFontSize }}>{range(v)}</Text>
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
            {rich(v.description, s, { fontSize: smallFontSize })}
          </PdfTableRow>
        ) : null}
      </PdfTableEntry>
    ));
  }

  return entries(vols, s, (v) => (
    <View>
      <View
        style={{
          flexDirection: isMultiColumn ? "column" : "row",
          justifyContent: isMultiColumn ? undefined : "space-between",
          alignItems: "flex-start",
          gap: isMultiColumn ? s.sp(6) : undefined, // DOM `flex-col gap-2`
        }}
      >
        {/* See pdfExperience's identical comment above — `flex: 1` only
                belongs in row mode. */}
        <View style={isMultiColumn ? undefined : { flex: 1 }}>
          <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
            {v.role}
          </Text>
          <Text style={{ fontSize: smallFontSize, color: s.secondaryColor }}>
            {v.organization}
          </Text>
        </View>
        {rowDate(s, config, range(v), isMultiColumn)}
      </View>
      {richBlock(v.description, s, { justify: config.justifyText })}
    </View>
  ));
};

const pdfAwards: PDFSectionBuilder = ({ resume, styles: s }) => {
  const { fontSize, smallFontSize, accentColor } = s;
  const awardList = resume.awards ?? [];
  if (awardList.length === 0) return null;

  return entries(awardList, s, (award) => (
    <View>
      <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
        {award.title}
      </Text>
      <Text style={{ fontSize: smallFontSize, color: s.secondaryColor }}>
        {award.issuer}
        {" • "}
        {award.date}
      </Text>
      {richBlock(award.description, s)}
    </View>
  ));
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

  return section.type === "text" ? (
    <View>
      {rich(section.items.join(" "), s, { justify: config.justifyText })}
    </View>
  ) : (
    bulletList(section.items, s, config)
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
