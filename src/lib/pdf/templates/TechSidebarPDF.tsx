// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

import { Document, Link, Page, Text, View } from "@react-pdf/renderer";
import React from "react";

import { htmlToPlainText, isHtml } from "@/lib/htmlUtils";
import { ResumeJSON } from "@/types/resume";

import { withAlpha } from "../resolveStyles";
import { PDFTemplateProps } from "./ModernMinimalPDF";

const plain = (text: string | null | undefined): string => {
  if (!text) return "";
  return isHtml(text) ? htmlToPlainText(text) : text;
};

export const TechSidebarPDF: React.FC<PDFTemplateProps> = ({
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

  const sidebarBg = withAlpha(secondaryColor, "10");

  // Section heading for the sidebar column
  const SidebarSH = ({ title }: { title: string }) => (
    <View
      style={{
        marginBottom: 5,
        marginTop: 10,
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
        }}
      >
        {title.toUpperCase()}
      </Text>
    </View>
  );

  // Section heading for the main column
  const MainSH = ({ title }: { title: string }) => (
    <View
      style={{
        marginBottom: 5,
        marginTop: 10,
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
        }}
      >
        {title}
      </Text>
    </View>
  );

  const contactParts = [
    resume.header.email,
    resume.header.phone,
    resume.header.location,
  ].filter(Boolean);

  const socialParts: { label: string; url?: string }[] = [
    resume.header.linkedin
      ? { label: "LinkedIn", url: resume.header.linkedin }
      : null,
    resume.header.github
      ? { label: "GitHub", url: resume.header.github }
      : null,
    resume.header.website
      ? { label: "Portfolio", url: resume.header.website }
      : null,
  ].filter(Boolean) as { label: string; url?: string }[];

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
        {/* ── Full-width header ──────────────────────────────── */}
        <View
          style={{
            backgroundColor: primaryColor,
            padding: marginPt,
            paddingVertical: marginPt * 0.8,
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
                  color: withAlpha("#ffffff", "cc"),
                  marginRight: 14,
                }}
              >
                {part}
              </Text>
            ))}
            {socialParts.map((s2, i) =>
              s2.url ? (
                <Link
                  key={i}
                  src={s2.url}
                  style={{
                    fontSize: smallFontSize,
                    color: withAlpha("#ffffff", "cc"),
                    marginRight: 14,
                    textDecoration: "none",
                  }}
                >
                  {s2.label}
                </Link>
              ) : (
                <Text
                  key={i}
                  style={{
                    fontSize: smallFontSize,
                    color: withAlpha("#ffffff", "cc"),
                    marginRight: 14,
                  }}
                >
                  {s2.label}
                </Text>
              )
            )}
          </View>
        </View>

        {/* ── Two-column body ───────────────────────────────── */}
        {/* alignItems: 'stretch' makes both columns equal height so sidebar bg fills fully */}
        <View style={{ flexDirection: "row", alignItems: "stretch" }}>
          {/* ── Sidebar ───────────────────────────────────── */}
          <View
            style={{
              width: "35%",
              backgroundColor: sidebarBg,
              padding: marginPt * 0.7,
            }}
          >
            {/* Skills */}
            {(resume.skills ?? []).length > 0 ? (
              <View>
                <SidebarSH title="Skills" />
                {(resume.skills ?? []).map((skill, i) => (
                  <Text
                    key={i}
                    style={{
                      fontSize,
                      lineHeight,
                      color: textColor,
                      marginBottom: 2,
                    }}
                  >
                    {"\u2022 "}
                    {skill}
                  </Text>
                ))}
              </View>
            ) : null}

            {/* Education */}
            {(resume.education ?? []).length > 0 ? (
              <View>
                <SidebarSH title="Education" />
                {(resume.education ?? []).map((edu, i) => (
                  <View key={i} wrap={false} style={{ marginBottom: 8 }}>
                    <Text
                      style={{
                        fontSize,
                        fontWeight: 700,
                        color: textColor,
                        marginBottom: 1,
                      }}
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
              </View>
            ) : null}

            {/* Certifications */}
            {(resume.certifications ?? []).length > 0 ? (
              <View>
                <SidebarSH title="Certifications" />
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
              </View>
            ) : null}

            {/* Languages */}
            {(resume.languages ?? []).length > 0 ? (
              <View>
                <SidebarSH title="Languages" />
                {(resume.languages ?? []).map((l, i) => (
                  <View key={i} wrap={false} style={{ marginBottom: 4 }}>
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
              </View>
            ) : null}

            {/* Awards */}
            {(resume.awards ?? []).length > 0 ? (
              <View>
                <SidebarSH title="Awards" />
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
                    {award.description ? (
                      <Text style={{ fontSize: smallFontSize, lineHeight }}>
                        {plain(award.description)}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {/* ── Main column ───────────────────────────────── */}
          <View
            style={{
              width: "65%",
              padding: marginPt * 0.7,
            }}
          >
            {/* Summary */}
            {resume.summary ? (
              <View wrap={false}>
                <MainSH title="Summary" />
                <Text style={{ fontSize, lineHeight }}>
                  {plain(resume.summary)}
                </Text>
              </View>
            ) : null}

            {/* Experience */}
            {(resume.experience ?? []).length > 0 ? (
              <View>
                <MainSH title="Work Experience" />
                {(resume.experience ?? []).map((exp, i) => (
                  <View key={i} wrap={false} style={{ marginBottom: 10 }}>
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
                          flex: 1,
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
                      <Text style={{ fontSize, lineHeight, marginBottom: 3 }}>
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
                ))}
              </View>
            ) : null}

            {/* Projects */}
            {(resume.projects ?? []).length > 0 ? (
              <View>
                <MainSH title="Projects" />
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
                        style={{
                          fontSize,
                          fontWeight: 700,
                          color: accentColor,
                        }}
                      >
                        {proj.name}
                      </Text>
                      {proj.url ? (
                        <Link
                          src={proj.url}
                          style={{
                            fontSize: smallFontSize,
                            color: secondaryColor,
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
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                        }}
                      >
                        {proj.technologies.map((tech, j) => (
                          <View
                            key={j}
                            style={{
                              backgroundColor: withAlpha(accentColor, "20"),
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
                                color: accentColor,
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
              </View>
            ) : null}

            {/* Publications */}
            {(resume.publications ?? []).length > 0 ? (
              <View>
                <MainSH title="Publications" />
                {(resume.publications ?? []).map((pub, i) => (
                  <View key={i} wrap={false} style={{ marginBottom: 6 }}>
                    <Text
                      style={{ fontSize, fontWeight: 700, color: accentColor }}
                    >
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
                  </View>
                ))}
              </View>
            ) : null}

            {/* Volunteer */}
            {(resume.volunteer ?? []).length > 0 ? (
              <View>
                <MainSH title="Volunteer Experience" />
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
              </View>
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
};
