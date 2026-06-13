// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

// NOTE: The HTML template uses a linear-gradient header. react-pdf does NOT support
// CSS gradients. We use the solid primaryColor here instead.

import { Document, Link, Page, Text, View } from "@react-pdf/renderer";
import React, { memo } from "react";

import { htmlToPlainText, isHtml } from "@/lib/htmlUtils";

import { ResolvedPDFStyles, withAlpha } from "../resolveStyles";
import { PDFTemplateProps } from "./ModernMinimalPDF";
import { SectionGroup } from "./shared/SectionGroup";

const plain = (text: string | null | undefined): string => {
  if (!text) return "";
  return isHtml(text) ? htmlToPlainText(text) : text;
};

const LeftSH = memo(function LeftSH({
  title,
  s,
}: {
  title: string;
  s: ResolvedPDFStyles;
}) {
  const { primaryColor, fontFamily, fontSize } = s;
  return (
    <View
      style={{
        marginTop: 10,
        marginBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: primaryColor,
        paddingBottom: 2,
      }}
    >
      <Text
        style={{
          fontFamily,
          fontSize: fontSize + 1,
          fontWeight: 700,
          color: primaryColor,
          textTransform: "uppercase",
        }}
      >
        {title}
      </Text>
    </View>
  );
});

const RightSH = memo(function RightSH({
  title,
  s,
}: {
  title: string;
  s: ResolvedPDFStyles;
}) {
  const { accentColor, fontFamily, headingFontSize, textColor } = s;
  return (
    <View
      style={{
        marginTop: 10,
        marginBottom: 5,
        borderLeftWidth: 3,
        borderLeftColor: accentColor,
        paddingLeft: 8,
      }}
    >
      <Text
        style={{
          fontFamily,
          fontSize: headingFontSize,
          fontWeight: 700,
          color: textColor,
        }}
      >
        {title}
      </Text>
    </View>
  );
});
export const CreativeModernPDF: React.FC<PDFTemplateProps> = ({
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

  const leftBg = withAlpha(primaryColor, "08");

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
        }}
      >
        {/* ── Full-width solid header (gradient simplified — react-pdf limitation) */}
        <View
          style={{
            backgroundColor: primaryColor,
            padding: marginPt,
            paddingVertical: marginPt * 0.9,
          }}
        >
          <Text
            style={{
              fontSize: nameFontSize,
              fontWeight: 700,
              color: "#ffffff",
              marginBottom: 3,
            }}
          >
            {resume.header.name}
          </Text>
          {resume.header.headline ? (
            <Text
              style={{
                fontSize,
                color: withAlpha("#ffffff", "cc"),
                marginBottom: 5,
              }}
            >
              {resume.header.headline}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {contactParts.map((part, i) => (
              <Text
                key={i}
                style={{
                  fontSize: smallFontSize,
                  color: withAlpha("#ffffff", "bb"),
                  marginRight: 14,
                }}
              >
                {part}
              </Text>
            ))}
          </View>
        </View>

        {/* ── Two-column body ─────────────────────────────────── */}
        <View style={{ flexDirection: "row", alignItems: "stretch" }}>
          {/* ── Left column (40%) ──────────────────────────── */}
          <View
            style={{
              width: "40%",
              backgroundColor: leftBg,
              padding: marginPt * 0.7,
            }}
          >
            {/* Summary / About */}
            {resume.summary ? (
              <View wrap={false}>
                <LeftSH s={s} title="About" />
                <Text style={{ fontSize, lineHeight }}>
                  {plain(resume.summary)}
                </Text>
              </View>
            ) : null}

            {/* Skills with dot bullets */}
            {(resume.skills ?? []).length > 0 ? (
              <SectionGroup heading={<LeftSH s={s} title="Skills" />}>
                {(resume.skills ?? []).map((skill, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 3,
                    }}
                  >
                    <View
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: 3,
                        backgroundColor: accentColor,
                        marginRight: 6,
                      }}
                    />
                    <Text style={{ fontSize, color: textColor }}>{skill}</Text>
                  </View>
                ))}
              </SectionGroup>
            ) : null}

            {/* Education */}
            {(resume.education ?? []).length > 0 ? (
              <SectionGroup heading={<LeftSH s={s} title="Education" />}>
                {(resume.education ?? []).map((edu, i) => (
                  <View key={i} wrap={false} style={{ marginBottom: 8 }}>
                    <Text
                      style={{ fontSize, fontWeight: 700, color: textColor }}
                    >
                      {edu.degree}
                    </Text>
                    {edu.field ? (
                      <Text
                        style={{ fontSize: smallFontSize, color: "#6b7280" }}
                      >
                        {edu.field}
                      </Text>
                    ) : null}
                    <Text
                      style={{ fontSize: smallFontSize, color: accentColor }}
                    >
                      {edu.institution}
                    </Text>
                    <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                      {edu.startDate} – {edu.endDate || "Present"}
                    </Text>
                    {edu.gpa ? (
                      <Text
                        style={{ fontSize: smallFontSize, color: "#6b7280" }}
                      >
                        GPA: {edu.gpa}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </SectionGroup>
            ) : null}

            {/* Certifications */}
            {(resume.certifications ?? []).length > 0 ? (
              <SectionGroup heading={<LeftSH s={s} title="Certifications" />}>
                {(resume.certifications ?? []).map((cert, i) => (
                  <View key={i} wrap={false} style={{ marginBottom: 6 }}>
                    <Text
                      style={{ fontSize, fontWeight: 600, color: textColor }}
                    >
                      {cert.name}
                    </Text>
                    <Text
                      style={{ fontSize: smallFontSize, color: accentColor }}
                    >
                      {cert.issuer}
                    </Text>
                    <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                      {cert.date}
                    </Text>
                  </View>
                ))}
              </SectionGroup>
            ) : null}

            {/* Languages */}
            {(resume.languages ?? []).length > 0 ? (
              <SectionGroup heading={<LeftSH s={s} title="Languages" />}>
                {(resume.languages ?? []).map((l, i) => (
                  <View key={i} style={{ marginBottom: 3 }}>
                    <Text
                      style={{ fontSize, fontWeight: 600, color: textColor }}
                    >
                      {l.name}
                    </Text>
                    <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                      {l.proficiency}
                    </Text>
                  </View>
                ))}
              </SectionGroup>
            ) : null}

            {/* Awards */}
            {(resume.awards ?? []).length > 0 ? (
              <SectionGroup heading={<LeftSH s={s} title="Awards" />}>
                {(resume.awards ?? []).map((award, i) => (
                  <View key={i} wrap={false} style={{ marginBottom: 6 }}>
                    <Text
                      style={{ fontSize, fontWeight: 600, color: textColor }}
                    >
                      {award.title}
                    </Text>
                    <Text
                      style={{ fontSize: smallFontSize, color: accentColor }}
                    >
                      {award.issuer}
                    </Text>
                    <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                      {award.date}
                    </Text>
                  </View>
                ))}
              </SectionGroup>
            ) : null}
          </View>

          {/* ── Right column (60%) ──────────────────────────── */}
          <View
            style={{
              width: "60%",
              padding: marginPt * 0.7,
            }}
          >
            {/* Experience */}
            {(resume.experience ?? []).length > 0 ? (
              <SectionGroup heading={<RightSH s={s} title="Experience" />}>
                {(resume.experience ?? []).map((exp, i) => (
                  <View key={i} wrap={false} style={{ marginBottom: 10 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        marginBottom: 2,
                      }}
                    >
                      {/* accent dot */}
                      <View
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 4,
                          backgroundColor: accentColor,
                          marginRight: 6,
                          marginTop: 3,
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                          }}
                        >
                          <Text
                            style={{
                              fontSize,
                              fontWeight: 700,
                              color: accentColor,
                            }}
                          >
                            {exp.role}
                          </Text>
                          <Text
                            style={{
                              fontSize: smallFontSize,
                              color: "#6b7280",
                            }}
                          >
                            {exp.startDate} – {exp.endDate || "Present"}
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontSize: smallFontSize,
                            color: "#6b7280",
                            marginBottom: 3,
                          }}
                        >
                          {exp.company}
                        </Text>
                        {exp.description ? (
                          <Text
                            style={{ fontSize, lineHeight, marginBottom: 3 }}
                          >
                            {plain(exp.description)}
                          </Text>
                        ) : null}
                        {(exp.achievements ?? []).map((a, j) => (
                          <Text
                            key={j}
                            style={{ fontSize, lineHeight, marginLeft: 8 }}
                          >
                            {"\u2022 "}
                            {a}
                          </Text>
                        ))}
                      </View>
                    </View>
                  </View>
                ))}
              </SectionGroup>
            ) : null}

            {/* Projects */}
            {(resume.projects ?? []).length > 0 ? (
              <SectionGroup heading={<RightSH s={s} title="Projects" />}>
                {(resume.projects ?? []).map((proj, i) => (
                  <View key={i} wrap={false} style={{ marginBottom: 10 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 2,
                      }}
                    >
                      <Text
                        style={{ fontSize, fontWeight: 700, color: textColor }}
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
                    <Text style={{ fontSize, lineHeight, marginBottom: 3 }}>
                      {plain(proj.description)}
                    </Text>
                    {(proj.technologies ?? []).length > 0 ? (
                      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                        {proj.technologies.map((tech, j) => (
                          <View
                            key={j}
                            style={{
                              backgroundColor: accentColor,
                              borderRadius: 3,
                              paddingHorizontal: 5,
                              paddingVertical: 1,
                              marginRight: 4,
                              marginBottom: 3,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: smallFontSize,
                                color: "#ffffff",
                              }}
                            >
                              {tech}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                ))}
              </SectionGroup>
            ) : null}

            {/* Volunteer */}
            {(resume.volunteer ?? []).length > 0 ? (
              <SectionGroup heading={<RightSH s={s} title="Volunteer" />}>
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
                          color: accentColor,
                        }}
                      >
                        {v.role}
                      </Text>
                      <Text
                        style={{ fontSize: smallFontSize, color: "#6b7280" }}
                      >
                        {v.startDate} – {v.endDate || "Present"}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: smallFontSize,
                        color: "#6b7280",
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
              </SectionGroup>
            ) : null}

            {/* Publications */}
            {(resume.publications ?? []).length > 0 ? (
              <SectionGroup heading={<RightSH s={s} title="Publications" />}>
                {(resume.publications ?? []).map((pub, i) => (
                  <View key={i} wrap={false} style={{ marginBottom: 6 }}>
                    <Text
                      style={{ fontSize, fontWeight: 700, color: textColor }}
                    >
                      {pub.title}
                    </Text>
                    <Text style={{ fontSize, lineHeight }}>
                      {pub.authors.join(", ")}
                    </Text>
                    <Text
                      style={{ fontSize: smallFontSize, color: secondaryColor }}
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
          </View>
        </View>
      </Page>
    </Document>
  );
};
