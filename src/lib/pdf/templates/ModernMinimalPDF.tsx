// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import { Document, Link, Page, Text, View } from "@react-pdf/renderer";
import React, { memo } from "react";

import BackgroundPdf from "@/lib/backgrounds/BackgroundPdf";
import { formatDateRange } from "@/lib/date";
import { htmlToPlainText, isHtml } from "@/lib/htmlUtils";
import { ResumeJSON, Skill } from "@/types/resume";

import { ResolvedPDFStyles } from "../resolveStyles";
import { SectionGroup } from "./shared/SectionGroup";

export interface PDFTemplateProps {
  resume: ResumeJSON;
  styles: ResolvedPDFStyles;
}

const plain = (text: string | null | undefined): string => {
  if (!text) return "";
  return isHtml(text) ? htmlToPlainText(text) : text;
};

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

function buildContactLine(header: ResumeJSON["header"]): string {
  return [
    header.email,
    header.phone,
    header.location,
    header.linkedin ?? null,
    header.github ?? null,
    header.website ?? null,
    header.workAuthorization ?? null,
  ]
    .filter(Boolean)
    .join("  •  ");
}

const SH = memo(function SH({
  title,
  s,
}: {
  title: string;
  s: ResolvedPDFStyles;
}) {
  const { secondaryColor, fontFamily, headingFontSize, primaryColor } = s;
  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: secondaryColor,
        paddingBottom: 2,
        marginTop: 10,
        marginBottom: 5,
      }}
    >
      <Text
        style={{
          fontFamily,
          fontSize: headingFontSize,
          fontWeight: 700,
          color: primaryColor,
        }}
      >
        {title}
      </Text>
    </View>
  );
});

export const ModernMinimalPDF: React.FC<PDFTemplateProps> = ({
  resume,
  styles: s,
}) => {
  const {
    secondaryColor,
    accentColor,
    textColor,
    backgroundColor,
    fontFamily,
    fontSize,
    smallFontSize,
    nameFontSize,
    lineHeight,
    marginPt,
    pageFormat,
  } = s;

  return (
    <Document>
      <Page
        size={pageFormat}
        style={{
          fontFamily,
          fontSize,
          color: textColor,
          backgroundColor,
          padding: marginPt,
        }}
      >
        <BackgroundPdf styles={s} />
        {/* ── Header ─────────────────────────────────────────── */}
        <View style={{ marginBottom: 14 }}>
          <Text
            style={{
              fontSize: nameFontSize,
              fontWeight: 700,
              color: textColor,
              marginBottom: 3,
            }}
          >
            {resume.header.name}
          </Text>
          {resume.header.headline ? (
            <Text style={{ fontSize, color: accentColor, marginBottom: 3 }}>
              {resume.header.headline}
            </Text>
          ) : null}
          <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
            {buildContactLine(resume.header)}
          </Text>
        </View>

        {/* ── Summary ────────────────────────────────────────── */}
        {resume.summary ? (
          <View wrap={false}>
            <SH s={s} title="Professional Summary" />
            <Text style={{ fontSize, lineHeight, color: "#374151" }}>
              {plain(resume.summary)}
            </Text>
          </View>
        ) : null}

        {/* ── Experience ─────────────────────────────────────── */}
        {resume.experience.length > 0 ? (
          <SectionGroup heading={<SH s={s} title="Work Experience" />}>
            {resume.experience.map((exp, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 9 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 2,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize, fontWeight: 700, color: accentColor }}
                    >
                      {exp.role}
                    </Text>
                    <Text
                      style={{
                        fontSize: smallFontSize,
                        color: "#6b7280",
                      }}
                    >
                      {exp.company}
                    </Text>
                  </View>
                  <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                    {formatDateRange(exp.startDate, exp.endDate, s.dateFormat)}
                  </Text>
                </View>
                {exp.description ? (
                  <Text
                    style={{
                      fontSize,
                      lineHeight,
                      color: "#374151",
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
                      color: "#374151",
                      marginLeft: 8,
                    }}
                  >
                    {"• "}
                    {a}
                  </Text>
                ))}
              </View>
            ))}
          </SectionGroup>
        ) : null}

        {/* ── Projects ───────────────────────────────────────── */}
        {resume.projects.length > 0 ? (
          <SectionGroup heading={<SH s={s} title="Projects" />}>
            {resume.projects.map((proj, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 9 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Text
                    style={{ fontSize, fontWeight: 700, color: accentColor }}
                  >
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
                  {proj.startDate || proj.endDate ? (
                    <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                      {formatDateRange(
                        proj.startDate,
                        proj.endDate,
                        s.dateFormat
                      )}
                    </Text>
                  ) : null}
                </View>
                <Text
                  style={{
                    fontSize,
                    lineHeight,
                    color: "#374151",
                    marginBottom: 3,
                  }}
                >
                  {plain(proj.description)}
                </Text>
                {proj.technologies.length > 0 ? (
                  <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                    <Text style={{ fontWeight: 600 }}>{"Technologies: "}</Text>
                    {proj.technologies.join(", ")}
                  </Text>
                ) : null}
              </View>
            ))}
          </SectionGroup>
        ) : null}

        {/* ── Skills ─────────────────────────────────────────── */}
        {resume.skills.length > 0 ? (
          <View wrap={false}>
            <SH s={s} title="Skills" />
            <Text style={{ fontSize, lineHeight, color: "#374151" }}>
              {groupSkills(resume.skills).map((group, gi) => (
                <Text key={gi}>
                  {gi > 0 ? "  •  " : ""}
                  {group.category ? `${group.category}: ` : ""}
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
          </View>
        ) : null}

        {/* ── Education ──────────────────────────────────────── */}
        {resume.education.length > 0 ? (
          <SectionGroup heading={<SH s={s} title="Education" />}>
            {resume.education.map((edu, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 8 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize, fontWeight: 700, color: accentColor }}
                    >
                      {edu.degree}
                      {edu.field ? ` in ${edu.field}` : ""}
                    </Text>
                    <Text
                      style={{
                        fontSize: smallFontSize,
                        color: "#6b7280",
                      }}
                    >
                      {edu.institution}
                    </Text>
                  </View>
                  <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                    {formatDateRange(edu.startDate, edu.endDate, s.dateFormat)}
                  </Text>
                </View>
                {edu.gpa ? (
                  <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                    GPA: {edu.gpa}
                  </Text>
                ) : null}
              </View>
            ))}
          </SectionGroup>
        ) : null}

        {/* ── Certifications ─────────────────────────────────── */}
        {resume.certifications.length > 0 ? (
          <SectionGroup heading={<SH s={s} title="Certifications" />}>
            {resume.certifications.map((cert, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 6 }}>
                <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
                  {cert.name}
                </Text>
                <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
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
          </SectionGroup>
        ) : null}

        {/* ── Publications ───────────────────────────────────── */}
        {(resume.publications ?? []).length > 0 ? (
          <SectionGroup heading={<SH s={s} title="Publications" />}>
            {(resume.publications ?? []).map((pub, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 6 }}>
                <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
                  {pub.title}
                </Text>
                <Text
                  style={{
                    fontSize: smallFontSize,
                    lineHeight,
                    color: "#374151",
                  }}
                >
                  {pub.authors.join(", ")}
                </Text>
                <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                  {pub.venue}
                  {" • "}
                  {pub.date}
                  {pub.doi ? `  •  DOI: ${pub.doi}` : ""}
                </Text>
              </View>
            ))}
          </SectionGroup>
        ) : null}

        {/* ── Languages ──────────────────────────────────────── */}
        {(resume.languages ?? []).length > 0 ? (
          <View wrap={false}>
            <SH s={s} title="Languages" />
            <Text style={{ fontSize, lineHeight, color: "#374151" }}>
              {(resume.languages ?? [])
                .map((l) => `${l.name} (${l.proficiency})`)
                .join("  •  ")}
            </Text>
          </View>
        ) : null}

        {/* ── Volunteer ──────────────────────────────────────── */}
        {(resume.volunteer ?? []).length > 0 ? (
          <SectionGroup heading={<SH s={s} title="Volunteer Experience" />}>
            {(resume.volunteer ?? []).map((v, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 8 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize, fontWeight: 700, color: accentColor }}
                    >
                      {v.role}
                    </Text>
                    <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                      {v.organization}
                    </Text>
                  </View>
                  <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                    {formatDateRange(v.startDate, v.endDate, s.dateFormat)}
                  </Text>
                </View>
                {v.description ? (
                  <Text style={{ fontSize, lineHeight, color: "#374151" }}>
                    {plain(v.description)}
                  </Text>
                ) : null}
              </View>
            ))}
          </SectionGroup>
        ) : null}

        {/* ── Awards ─────────────────────────────────────────── */}
        {(resume.awards ?? []).length > 0 ? (
          <SectionGroup heading={<SH s={s} title="Awards" />}>
            {(resume.awards ?? []).map((award, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 6 }}>
                <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
                  {award.title}
                </Text>
                <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                  {award.issuer}
                  {" • "}
                  {award.date}
                </Text>
                {award.description ? (
                  <Text style={{ fontSize, lineHeight, color: "#374151" }}>
                    {plain(award.description)}
                  </Text>
                ) : null}
              </View>
            ))}
          </SectionGroup>
        ) : null}
      </Page>
    </Document>
  );
};
