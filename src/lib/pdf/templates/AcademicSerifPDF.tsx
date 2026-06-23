// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import { Document, Link, Page, Text, View } from "@react-pdf/renderer";
import React, { memo } from "react";

import BackgroundPdf from "@/lib/backgrounds/BackgroundPdf";
import { htmlToPlainText, isHtml } from "@/lib/htmlUtils";
import { ResumeJSON } from "@/types/resume";

import { PDFTemplateProps } from "./ModernMinimalPDF";
import { ResolvedPDFStyles } from "../resolveStyles";
import { SectionGroup } from "./shared/SectionGroup";

const plain = (text: string | null | undefined): string => {
  if (!text) return "";
  return isHtml(text) ? htmlToPlainText(text) : text;
};

function buildContactParts(header: ResumeJSON["header"]): string[] {
  return [
    header.email,
    header.phone,
    header.location,
    header.linkedin ?? null,
    header.github ?? null,
    header.website ?? null,
  ].filter(Boolean) as string[];
}

// Section heading: small-caps style (uppercase + wide letter-spacing), serif, underlined
const SH = memo(function SH({
  title,
  s,
}: {
  title: string;
  s: ResolvedPDFStyles;
}) {
  const { primaryColor, secondaryColor, fontFamily, headingFontSize } = s;
  return (
    <View
      style={{
        marginTop: 10,
        marginBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: secondaryColor,
        paddingBottom: 2,
      }}
    >
      <Text
        style={{
          fontFamily,
          fontSize: headingFontSize,
          fontWeight: 700,
          color: primaryColor,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {title}
      </Text>
    </View>
  );
});

export const AcademicSerifPDF: React.FC<PDFTemplateProps> = ({
  resume,
  styles: s,
}) => {
  const {
    primaryColor,
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

  const contactParts = buildContactParts(resume.header);

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
        {/* ── Header (centered, traditional double rule below) ─────────── */}
        <View style={{ alignItems: "center", marginBottom: 14 }}>
          <Text
            style={{
              fontSize: nameFontSize,
              fontWeight: 700,
              color: primaryColor,
              marginBottom: 4,
              textAlign: "center",
              letterSpacing: 1,
            }}
          >
            {resume.header.name}
          </Text>
          {resume.header.headline ? (
            <Text
              style={{
                fontSize,
                fontStyle: "italic",
                color: accentColor,
                marginBottom: 4,
                textAlign: "center",
              }}
            >
              {resume.header.headline}
            </Text>
          ) : null}
          <Text
            style={{
              fontSize: smallFontSize,
              color: secondaryColor,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {contactParts.join("  •  ")}
          </Text>
          <View style={{ width: "100%" }}>
            <View
              style={{
                height: 1,
                backgroundColor: primaryColor,
                marginBottom: 1,
              }}
            />
            <View style={{ height: 1, backgroundColor: secondaryColor }} />
          </View>
        </View>

        {/* ── Summary ────────────────────────────────────────── */}
        {resume.summary ? (
          <View wrap={false}>
            <SH s={s} title="Research Summary" />
            <Text style={{ fontSize, lineHeight, textAlign: "justify" }}>
              {plain(resume.summary)}
            </Text>
          </View>
        ) : null}

        {/* ── Education ──────────────────────────────────────── */}
        {(resume.education ?? []).length > 0 ? (
          <SectionGroup heading={<SH s={s} title="Education" />}>
            {(resume.education ?? []).map((edu, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 8 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Text
                    style={{
                      fontSize,
                      fontWeight: 700,
                      fontStyle: "italic",
                      color: textColor,
                    }}
                  >
                    {edu.degree}
                  </Text>
                  <Text
                    style={{ fontSize: smallFontSize, color: secondaryColor }}
                  >
                    {edu.startDate} – {edu.endDate || "Present"}
                  </Text>
                </View>
                <Text style={{ fontSize, color: secondaryColor }}>
                  {edu.institution}
                  {edu.field ? `  •  ${edu.field}` : ""}
                </Text>
                {edu.gpa ? (
                  <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                    GPA: {edu.gpa}
                  </Text>
                ) : null}
              </View>
            ))}
          </SectionGroup>
        ) : null}

        {/* ── Experience ─────────────────────────────────────── */}
        {(resume.experience ?? []).length > 0 ? (
          <SectionGroup
            heading={<SH s={s} title="Academic & Professional Experience" />}
          >
            {(resume.experience ?? []).map((exp, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 9 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize,
                      fontWeight: 700,
                      fontStyle: "italic",
                      color: textColor,
                    }}
                  >
                    {exp.role}
                  </Text>
                  <Text
                    style={{ fontSize: smallFontSize, color: secondaryColor }}
                  >
                    {exp.startDate} – {exp.endDate || "Present"}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize,
                    fontWeight: 600,
                    color: secondaryColor,
                    marginBottom: 3,
                  }}
                >
                  {exp.company}
                </Text>
                {exp.description ? (
                  <Text
                    style={{
                      fontSize,
                      lineHeight,
                      marginBottom: 3,
                      textAlign: "justify",
                    }}
                  >
                    {plain(exp.description)}
                  </Text>
                ) : null}
                {(exp.achievements ?? []).map((a, j) => (
                  <Text
                    key={j}
                    style={{ fontSize, lineHeight, marginLeft: 12 }}
                  >
                    {"• "}
                    {a}
                  </Text>
                ))}
              </View>
            ))}
          </SectionGroup>
        ) : null}

        {/* ── Publications ───────────────────────────────────── */}
        {(resume.publications ?? []).length > 0 ? (
          <SectionGroup heading={<SH s={s} title="Publications" />}>
            {(resume.publications ?? []).map((pub, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 6 }}>
                <Text
                  style={{
                    fontSize,
                    fontWeight: 700,
                    fontStyle: "italic",
                    color: textColor,
                  }}
                >
                  {pub.title}
                </Text>
                <Text style={{ fontSize, lineHeight, marginTop: 1 }}>
                  {pub.authors.join(", ")}
                </Text>
                <Text
                  style={{
                    fontSize: smallFontSize,
                    color: secondaryColor,
                    marginTop: 1,
                  }}
                >
                  {pub.venue}
                  {" • "}
                  {pub.date}
                  {pub.doi ? `  •  DOI: ${pub.doi}` : ""}
                </Text>
              </View>
            ))}
          </SectionGroup>
        ) : null}

        {/* ── Skills ─────────────────────────────────────────── */}
        {(resume.skills ?? []).length > 0 ? (
          <View wrap={false}>
            <SH s={s} title="Areas of Expertise" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 2 }}>
              {(resume.skills ?? []).map((skill, i) => (
                <Text key={i} style={{ fontSize, lineHeight, marginRight: 16 }}>
                  {"• "}
                  {skill}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Projects ───────────────────────────────────────── */}
        {(resume.projects ?? []).length > 0 ? (
          <SectionGroup heading={<SH s={s} title="Research Projects" />}>
            {(resume.projects ?? []).map((proj, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 8 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Text
                    style={{
                      fontSize,
                      fontWeight: 700,
                      fontStyle: "italic",
                      color: textColor,
                    }}
                  >
                    {proj.name}
                  </Text>
                  {proj.startDate || proj.endDate ? (
                    <Text
                      style={{ fontSize: smallFontSize, color: secondaryColor }}
                    >
                      {proj.startDate || ""} – {proj.endDate || "Present"}
                    </Text>
                  ) : null}
                </View>
                <Text
                  style={{
                    fontSize,
                    lineHeight,
                    marginTop: 2,
                    textAlign: "justify",
                  }}
                >
                  {plain(proj.description)}
                </Text>
                {proj.technologies && proj.technologies.length > 0 ? (
                  <Text
                    style={{
                      fontSize: smallFontSize,
                      color: secondaryColor,
                      marginTop: 2,
                    }}
                  >
                    Methods: {proj.technologies.join(", ")}
                  </Text>
                ) : null}
                {proj.url ? (
                  <Link
                    src={proj.url}
                    style={{ fontSize: smallFontSize, color: accentColor }}
                  >
                    Project Link
                  </Link>
                ) : null}
              </View>
            ))}
          </SectionGroup>
        ) : null}

        {/* ── Certifications ─────────────────────────────────── */}
        {(resume.certifications ?? []).length > 0 ? (
          <SectionGroup heading={<SH s={s} title="Certifications" />}>
            {(resume.certifications ?? []).map((cert, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 5 }}>
                <Text style={{ fontSize, fontWeight: 600, color: textColor }}>
                  {cert.name}
                  <Text style={{ fontWeight: 400, color: secondaryColor }}>
                    {"  •  "}
                    {cert.issuer}
                    {"  •  "}
                    {cert.date}
                  </Text>
                </Text>
                {cert.url ? (
                  <Link
                    src={cert.url}
                    style={{ fontSize: smallFontSize, color: accentColor }}
                  >
                    Credential Link
                  </Link>
                ) : null}
              </View>
            ))}
          </SectionGroup>
        ) : null}

        {/* ── Languages ──────────────────────────────────────── */}
        {(resume.languages ?? []).length > 0 ? (
          <View wrap={false}>
            <SH s={s} title="Languages" />
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {(resume.languages ?? []).map((l, i) => (
                <Text key={i} style={{ fontSize, lineHeight, marginRight: 16 }}>
                  {"• "}
                  {l.name} ({l.proficiency})
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Volunteer ──────────────────────────────────────── */}
        {(resume.volunteer ?? []).length > 0 ? (
          <SectionGroup heading={<SH s={s} title="Service & Volunteer Work" />}>
            {(resume.volunteer ?? []).map((v, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 8 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize,
                      fontWeight: 700,
                      fontStyle: "italic",
                      color: textColor,
                    }}
                  >
                    {v.role}
                  </Text>
                  <Text
                    style={{ fontSize: smallFontSize, color: secondaryColor }}
                  >
                    {v.startDate} – {v.endDate || "Present"}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize,
                    fontWeight: 600,
                    color: secondaryColor,
                    marginBottom: 2,
                  }}
                >
                  {v.organization}
                </Text>
                {v.description ? (
                  <Text style={{ fontSize, lineHeight, textAlign: "justify" }}>
                    {plain(v.description)}
                  </Text>
                ) : null}
              </View>
            ))}
          </SectionGroup>
        ) : null}

        {/* ── Awards ─────────────────────────────────────────── */}
        {(resume.awards ?? []).length > 0 ? (
          <SectionGroup heading={<SH s={s} title="Honors & Awards" />}>
            {(resume.awards ?? []).map((award, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 5 }}>
                <Text style={{ fontSize, fontWeight: 600, color: textColor }}>
                  {award.title}
                  <Text style={{ fontWeight: 400, color: secondaryColor }}>
                    {"  •  "}
                    {award.issuer}
                    {"  •  "}
                    {award.date}
                  </Text>
                </Text>
                {award.description ? (
                  <Text style={{ fontSize, lineHeight, marginTop: 1 }}>
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
