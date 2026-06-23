// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import { Document, Link, Page, Text, View } from "@react-pdf/renderer";
import React, { memo } from "react";

import BackgroundPdf from "@/lib/backgrounds/BackgroundPdf";
import { htmlToPlainText, isHtml } from "@/lib/htmlUtils";
import { ResumeJSON } from "@/types/resume";

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

function buildContactLine(header: ResumeJSON["header"]): string {
  return [
    header.email,
    header.phone,
    header.location,
    header.linkedin ?? null,
    header.github ?? null,
    header.website ?? null,
  ]
    .filter(Boolean)
    .join("  |  ");
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
        paddingBottom: 1,
        marginTop: 6,
        marginBottom: 3,
      }}
    >
      <Text
        style={{
          fontFamily,
          fontSize: headingFontSize,
          fontWeight: 700,
          color: primaryColor,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {title}
      </Text>
    </View>
  );
});

export const CompactModernPDF: React.FC<PDFTemplateProps> = ({
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
        <View
          style={{
            marginBottom: 8,
            borderBottomWidth: 1,
            borderBottomColor: secondaryColor,
            paddingBottom: 6,
          }}
        >
          <Text
            style={{
              fontSize: nameFontSize,
              fontWeight: 700,
              color: textColor,
              marginBottom: 2,
            }}
          >
            {resume.header.name}
          </Text>
          {resume.header.headline ? (
            <Text style={{ fontSize, color: accentColor, marginBottom: 2 }}>
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
            <SH s={s} title="Summary" />
            <Text style={{ fontSize, lineHeight, color: "#374151" }}>
              {plain(resume.summary)}
            </Text>
          </View>
        ) : null}

        {/* ── Experience ─────────────────────────────────────── */}
        {resume.experience.length > 0 ? (
          <SectionGroup heading={<SH s={s} title="Experience" />}>
            {resume.experience.map((exp, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 5 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 1,
                  }}
                >
                  <Text
                    style={{ fontSize, fontWeight: 700, color: accentColor }}
                  >
                    {exp.role}
                    <Text style={{ fontWeight: 400, color: secondaryColor }}>
                      {"  —  "}
                      {exp.company}
                    </Text>
                  </Text>
                  <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                    {exp.startDate} – {exp.endDate || "Present"}
                  </Text>
                </View>
                {exp.description ? (
                  <Text
                    style={{
                      fontSize,
                      lineHeight,
                      color: "#374151",
                      marginBottom: 1,
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
              <View key={i} wrap={false} style={{ marginBottom: 5 }}>
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
                      {proj.startDate || ""} – {proj.endDate || "Present"}
                    </Text>
                  ) : null}
                </View>
                <Text
                  style={{
                    fontSize,
                    lineHeight,
                    color: "#374151",
                    marginBottom: 1,
                  }}
                >
                  {plain(proj.description)}
                </Text>
                {proj.technologies.length > 0 ? (
                  <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                    <Text style={{ fontWeight: 600 }}>{"Tech: "}</Text>
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
              {resume.skills.join("  •  ")}
            </Text>
          </View>
        ) : null}

        {/* ── Education ──────────────────────────────────────── */}
        {resume.education.length > 0 ? (
          <SectionGroup heading={<SH s={s} title="Education" />}>
            {resume.education.map((edu, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 4 }}>
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
                    {edu.degree}
                    {edu.field ? ` in ${edu.field}` : ""}
                    <Text style={{ fontWeight: 400, color: secondaryColor }}>
                      {"  —  "}
                      {edu.institution}
                    </Text>
                  </Text>
                  <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                    {edu.startDate} – {edu.endDate || "Present"}
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
              <View key={i} wrap={false} style={{ marginBottom: 3 }}>
                <Text style={{ fontSize, color: "#374151" }}>
                  <Text style={{ fontWeight: 700, color: accentColor }}>
                    {cert.name}
                  </Text>
                  {"  —  "}
                  <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                    {cert.issuer} • {cert.date}
                  </Text>
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
              <View key={i} wrap={false} style={{ marginBottom: 3 }}>
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
              <View key={i} wrap={false} style={{ marginBottom: 4 }}>
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
                    {v.role}
                    <Text style={{ fontWeight: 400, color: secondaryColor }}>
                      {"  —  "}
                      {v.organization}
                    </Text>
                  </Text>
                  <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                    {v.startDate} – {v.endDate || "Present"}
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
              <View key={i} wrap={false} style={{ marginBottom: 3 }}>
                <Text style={{ fontSize, color: "#374151" }}>
                  <Text style={{ fontWeight: 700, color: accentColor }}>
                    {award.title}
                  </Text>
                  {"  —  "}
                  <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                    {award.issuer} • {award.date}
                  </Text>
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
