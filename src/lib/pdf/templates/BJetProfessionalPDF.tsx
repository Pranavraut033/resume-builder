// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import { Document, Link, Page, Text, View } from "@react-pdf/renderer";
import React from "react";

import { htmlToPlainText, isHtml } from "@/lib/htmlUtils";

import { withAlpha } from "../resolveStyles";
import { PDFTemplateProps } from "./ModernMinimalPDF";

const plain = (text: string | null | undefined): string => {
  if (!text) return "";
  return isHtml(text) ? htmlToPlainText(text) : text;
};

// Outer bordered section container
const SectionBlock = ({
  title,
  children,
  s: { primaryColor, secondaryColor, fontFamily, headingFontSize },
}: {
  title: string;
  children: React.ReactNode;
  s: PDFTemplateProps["styles"];
}) => (
  <View
    style={{
      borderWidth: 1,
      borderColor: primaryColor,
      marginBottom: 10,
    }}
  >
    {/* Section header row */}
    <View
      style={{
        backgroundColor: withAlpha(secondaryColor, "22"),
        borderBottomWidth: 1,
        borderBottomColor: primaryColor,
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}
    >
      <Text
        style={{
          fontFamily,
          fontSize: headingFontSize - 1,
          fontWeight: 700,
          color: primaryColor,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {title}
      </Text>
    </View>
    {children}
  </View>
);

// Content row inside a section block
const ContentRow = ({
  children,
  noBorder,
  s: { secondaryColor },
}: {
  children: React.ReactNode;
  noBorder?: boolean;
  s: PDFTemplateProps["styles"];
}) => (
  <View
    wrap={false}
    style={{
      borderTopWidth: noBorder ? 0 : 1,
      borderTopColor: withAlpha(secondaryColor, "44"),
      paddingHorizontal: 8,
      paddingVertical: 5,
    }}
  >
    {children}
  </View>
);

export const BJetProfessionalPDF: React.FC<PDFTemplateProps> = ({
  resume,
  styles: s,
}) => {
  const {
    primaryColor,
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

  const contactParts = [
    resume.header.email,
    resume.header.phone,
    resume.header.location,
    resume.header.linkedin ?? null,
    resume.header.github ?? null,
    resume.header.website ?? null,
  ].filter(Boolean);

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
        {/* ── Header table ────────────────────────────────── */}
        <View
          style={{
            borderWidth: 1,
            borderColor: primaryColor,
            marginBottom: 10,
          }}
        >
          {/* Name row */}
          <View
            style={{
              backgroundColor: primaryColor,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <Text
              style={{
                fontSize: nameFontSize,
                fontWeight: 700,
                color: "#ffffff",
                marginBottom: 2,
              }}
            >
              {resume.header.name}
            </Text>
            {resume.header.headline ? (
              <Text
                style={{
                  fontSize,
                  color: withAlpha("#ffffff", "cc"),
                }}
              >
                {resume.header.headline}
              </Text>
            ) : null}
          </View>
          {/* Contact row */}
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: withAlpha("#ffffff", "44"),
              backgroundColor: withAlpha(primaryColor, "10"),
              paddingHorizontal: 12,
              paddingVertical: 5,
              flexDirection: "row",
              flexWrap: "wrap",
            }}
          >
            {contactParts.map((part, i) => (
              <Text
                key={i}
                style={{
                  fontSize: smallFontSize,
                  color: "#374151",
                  marginRight: 16,
                }}
              >
                {part}
              </Text>
            ))}
          </View>
        </View>

        {/* ── Summary ─────────────────────────────────────── */}
        {resume.summary ? (
          <SectionBlock title="Professional Summary" s={s}>
            <ContentRow noBorder s={s}>
              <Text style={{ fontSize, lineHeight }}>
                {plain(resume.summary)}
              </Text>
            </ContentRow>
          </SectionBlock>
        ) : null}

        {/* ── Experience ──────────────────────────────────── */}
        {(resume.experience ?? []).length > 0 ? (
          <SectionBlock title="Professional Experience" s={s}>
            {(resume.experience ?? []).map((exp, i) => (
              <ContentRow key={i} noBorder={i === 0} s={s}>
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
                      style={{
                        fontSize,
                        fontWeight: 700,
                        color: accentColor,
                      }}
                    >
                      {exp.role}
                    </Text>
                    <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                      {exp.company}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: smallFontSize,
                      color: "#6b7280",
                    }}
                  >
                    {exp.startDate} – {exp.endDate || "Present"}
                  </Text>
                </View>
                {exp.description ? (
                  <Text style={{ fontSize, lineHeight, marginBottom: 2 }}>
                    {plain(exp.description)}
                  </Text>
                ) : null}
                {(exp.achievements ?? []).map((a, j) => (
                  <Text key={j} style={{ fontSize, lineHeight, marginLeft: 8 }}>
                    {"• "}
                    {a}
                  </Text>
                ))}
              </ContentRow>
            ))}
          </SectionBlock>
        ) : null}

        {/* ── Skills (3-column grid) ──────────────────────── */}
        {(resume.skills ?? []).length > 0 ? (
          <SectionBlock title="Core Competencies" s={s}>
            <ContentRow noBorder s={s}>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {(resume.skills ?? []).map((skill, i) => (
                  <View key={i} style={{ width: "33.33%", marginBottom: 3 }}>
                    <Text style={{ fontSize, lineHeight }}>
                      {"• "}
                      {skill}
                    </Text>
                  </View>
                ))}
              </View>
            </ContentRow>
          </SectionBlock>
        ) : null}

        {/* ── Education ───────────────────────────────────── */}
        {(resume.education ?? []).length > 0 ? (
          <SectionBlock title="Education" s={s}>
            {(resume.education ?? []).map((edu, i) => (
              <ContentRow key={i} noBorder={i === 0} s={s}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize, fontWeight: 700, color: textColor }}
                    >
                      {edu.degree}
                      {edu.field ? ` in ${edu.field}` : ""}
                    </Text>
                    <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                      {edu.institution}
                    </Text>
                    {edu.gpa ? (
                      <Text
                        style={{ fontSize: smallFontSize, color: "#6b7280" }}
                      >
                        GPA: {edu.gpa}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                    {edu.startDate} – {edu.endDate || "Present"}
                  </Text>
                </View>
              </ContentRow>
            ))}
          </SectionBlock>
        ) : null}

        {/* ── Projects ────────────────────────────────────── */}
        {(resume.projects ?? []).length > 0 ? (
          <SectionBlock title="Projects" s={s}>
            {(resume.projects ?? []).map((proj, i) => (
              <ContentRow key={i} noBorder={i === 0} s={s}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 2,
                  }}
                >
                  <Text
                    style={{ fontSize, fontWeight: 700, color: accentColor }}
                  >
                    {proj.name}
                  </Text>
                  {proj.url ? (
                    <Link
                      src={proj.url}
                      style={{
                        fontSize: smallFontSize,
                        color: accentColor,
                        textDecoration: "none",
                      }}
                    >
                      [Link]
                    </Link>
                  ) : null}
                </View>
                <Text style={{ fontSize, lineHeight }}>
                  {plain(proj.description)}
                </Text>
                {(proj.technologies ?? []).length > 0 ? (
                  <Text
                    style={{
                      fontSize: smallFontSize,
                      color: "#6b7280",
                      marginTop: 2,
                    }}
                  >
                    Technologies: {proj.technologies.join(", ")}
                  </Text>
                ) : null}
              </ContentRow>
            ))}
          </SectionBlock>
        ) : null}

        {/* ── Certifications ──────────────────────────────── */}
        {(resume.certifications ?? []).length > 0 ? (
          <SectionBlock title="Certifications" s={s}>
            {(resume.certifications ?? []).map((cert, i) => (
              <ContentRow key={i} noBorder={i === 0} s={s}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{ fontSize, fontWeight: 600, color: accentColor }}
                    >
                      {cert.name}
                    </Text>
                    <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                      {cert.issuer}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                      {cert.date}
                    </Text>
                    {cert.url ? (
                      <Link
                        src={cert.url}
                        style={{
                          fontSize: smallFontSize,
                          color: accentColor,
                          textDecoration: "none",
                        }}
                      >
                        [Verify]
                      </Link>
                    ) : null}
                  </View>
                </View>
              </ContentRow>
            ))}
          </SectionBlock>
        ) : null}

        {/* ── Publications ────────────────────────────────── */}
        {(resume.publications ?? []).length > 0 ? (
          <SectionBlock title="Publications" s={s}>
            {(resume.publications ?? []).map((pub, i) => (
              <ContentRow key={i} noBorder={i === 0} s={s}>
                <Text style={{ fontSize, fontWeight: 700, color: textColor }}>
                  {pub.title}
                </Text>
                <Text style={{ fontSize, lineHeight }}>
                  {pub.authors.join(", ")}
                </Text>
                <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                  {pub.venue}
                  {" • "}
                  {pub.date}
                  {pub.doi ? `  •  DOI: ${pub.doi}` : ""}
                </Text>
              </ContentRow>
            ))}
          </SectionBlock>
        ) : null}

        {/* ── Languages ───────────────────────────────────── */}
        {(resume.languages ?? []).length > 0 ? (
          <SectionBlock title="Languages" s={s}>
            <ContentRow noBorder s={s}>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {(resume.languages ?? []).map((l, i) => (
                  <View key={i} style={{ width: "33.33%", marginBottom: 2 }}>
                    <Text style={{ fontSize, fontWeight: 600 }}>{l.name}</Text>
                    <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                      {l.proficiency}
                    </Text>
                  </View>
                ))}
              </View>
            </ContentRow>
          </SectionBlock>
        ) : null}

        {/* ── Volunteer ───────────────────────────────────── */}
        {(resume.volunteer ?? []).length > 0 ? (
          <SectionBlock title="Volunteer Experience" s={s}>
            {(resume.volunteer ?? []).map((v, i) => (
              <ContentRow key={i} noBorder={i === 0} s={s}>
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
                      {v.role}
                    </Text>
                    <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                      {v.organization}
                    </Text>
                  </View>
                  <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                    {v.startDate} – {v.endDate || "Present"}
                  </Text>
                </View>
                {v.description ? (
                  <Text style={{ fontSize, lineHeight }}>
                    {plain(v.description)}
                  </Text>
                ) : null}
              </ContentRow>
            ))}
          </SectionBlock>
        ) : null}

        {/* ── Awards ──────────────────────────────────────── */}
        {(resume.awards ?? []).length > 0 ? (
          <SectionBlock title="Awards & Honors" s={s}>
            {(resume.awards ?? []).map((award, i) => (
              <ContentRow key={i} noBorder={i === 0} s={s}>
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
                      {award.title}
                    </Text>
                    <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                      {award.issuer}
                    </Text>
                    {award.description ? (
                      <Text style={{ fontSize, lineHeight, marginTop: 2 }}>
                        {plain(award.description)}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                    {award.date}
                  </Text>
                </View>
              </ContentRow>
            ))}
          </SectionBlock>
        ) : null}
      </Page>
    </Document>
  );
};
