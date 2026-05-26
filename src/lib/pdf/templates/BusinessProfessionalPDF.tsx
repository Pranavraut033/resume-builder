// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import { Document, Link, Page, Text, View } from "@react-pdf/renderer";
import React from "react";

import { htmlToPlainText, isHtml } from "@/lib/htmlUtils";
import { ResumeJSON } from "@/types/resume";

import { PDFTemplateProps } from "./ModernMinimalPDF";

const plain = (text: string | null | undefined): string => {
  if (!text) return "";
  return isHtml(text) ? htmlToPlainText(text) : text;
};

function buildContactParts(header: ResumeJSON["header"]): string[] {
  return [
    header.email,
    header.phone,
    header.location,
    header.linkedin ? "LinkedIn" : null,
    header.github ? "GitHub" : null,
    header.website ? "Portfolio" : null,
  ].filter(Boolean) as string[];
}

export const BusinessProfessionalPDF: React.FC<PDFTemplateProps> = ({
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
    headingFontSize,
    nameFontSize,
    lineHeight,
    marginPt,
    pageFormat,
  } = s;

  // Section heading: UPPERCASE, serif-style bold, primary color
  const SH = ({ title }: { title: string }) => (
    <View
      style={{
        marginTop: 10,
        marginBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: primaryColor,
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
          letterSpacing: 0.5,
        }}
      >
        {title}
      </Text>
    </View>
  );

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
        {/* ── Header (centered) ──────────────────────────────── */}
        <View style={{ alignItems: "center", marginBottom: 14 }}>
          <Text
            style={{
              fontSize: nameFontSize,
              fontWeight: 700,
              color: textColor,
              marginBottom: 4,
              textAlign: "center",
            }}
          >
            {resume.header.name}
          </Text>
          {resume.header.headline ? (
            <Text
              style={{
                fontSize,
                color: secondaryColor,
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
              color: "#6b7280",
              textAlign: "center",
            }}
          >
            {contactParts.join("  •  ")}
          </Text>
        </View>

        {/* ── Summary ────────────────────────────────────────── */}
        {resume.summary ? (
          <View wrap={false}>
            <SH title="Professional Summary" />
            <Text style={{ fontSize, lineHeight, textAlign: "justify" }}>
              {plain(resume.summary)}
            </Text>
          </View>
        ) : null}

        {/* ── Experience ─────────────────────────────────────── */}
        {(resume.experience ?? []).length > 0 ? (
          <View>
            <SH title="Professional Experience" />
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
                  <Text style={{ fontSize, fontWeight: 700, color: textColor }}>
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
                  <Text style={{ fontSize, lineHeight, marginBottom: 3 }}>
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
          </View>
        ) : null}

        {/* ── Education ──────────────────────────────────────── */}
        {(resume.education ?? []).length > 0 ? (
          <View>
            <SH title="Education" />
            {(resume.education ?? []).map((edu, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 8 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Text style={{ fontSize, fontWeight: 700, color: textColor }}>
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
          </View>
        ) : null}

        {/* ── Skills ─────────────────────────────────────────── */}
        {(resume.skills ?? []).length > 0 ? (
          <View wrap={false}>
            <SH title="Core Competencies" />
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
          <View>
            <SH title="Key Projects" />
            {(resume.projects ?? []).map((proj, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 8 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Text style={{ fontSize, fontWeight: 700, color: textColor }}>
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
                <Text style={{ fontSize, lineHeight, marginTop: 2 }}>
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
                    Technologies: {proj.technologies.join(", ")}
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
          </View>
        ) : null}

        {/* ── Certifications ─────────────────────────────────── */}
        {(resume.certifications ?? []).length > 0 ? (
          <View>
            <SH title="Certifications" />
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
          </View>
        ) : null}

        {/* ── Publications ───────────────────────────────────── */}
        {(resume.publications ?? []).length > 0 ? (
          <View>
            <SH title="Publications" />
            {(resume.publications ?? []).map((pub, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 6 }}>
                <Text style={{ fontSize, fontWeight: 700, color: textColor }}>
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
          </View>
        ) : null}

        {/* ── Languages ──────────────────────────────────────── */}
        {(resume.languages ?? []).length > 0 ? (
          <View wrap={false}>
            <SH title="Languages" />
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
          <View>
            <SH title="Volunteer Experience" />
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
                  <Text style={{ fontSize, fontWeight: 700, color: textColor }}>
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
                  <Text style={{ fontSize, lineHeight }}>
                    {plain(v.description)}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Awards ─────────────────────────────────────────── */}
        {(resume.awards ?? []).length > 0 ? (
          <View>
            <SH title="Awards" />
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
          </View>
        ) : null}
      </Page>
    </Document>
  );
};
