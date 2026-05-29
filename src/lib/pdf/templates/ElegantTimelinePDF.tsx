// Adapted from Resumify (https://github.com/Afif718/Resumify)
// Copyright (c) 2025 M. H. A. Afif
// Licensed under MIT License

// NOTE: The HTML template uses alternating L/R timeline via CSS absolute positioning.
// react-pdf does not support bottom:0 in abs-positioned elements. We use a
// left-aligned timeline with an accent-colored left border per item instead.

import { Document, Link, Page, Text, View } from "@react-pdf/renderer";
import React, { memo } from "react";

import { htmlToPlainText, isHtml } from "@/lib/htmlUtils";

import { ResolvedPDFStyles, withAlpha } from "../resolveStyles";
import { PDFTemplateProps } from "./ModernMinimalPDF";

const plain = (text: string | null | undefined): string => {
  if (!text) return "";
  return isHtml(text) ? htmlToPlainText(text) : text;
};

// Centered UPPERCASE section heading with decorative line
const SH = memo(function SH({
  title,
  s,
}: {
  title: string;
  s: ResolvedPDFStyles;
}) {
  return (
    <View
      style={{
        marginTop: 12,
        marginBottom: 8,
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: withAlpha(s.accentColor, "55"),
        paddingBottom: 3,
      }}
    >
      <Text
        style={{
          fontFamily: s.fontFamily,
          fontSize: s.headingFontSize,
          fontWeight: 700,
          color: s.primaryColor,
          textTransform: "uppercase",
          letterSpacing: 1.5,
        }}
      >
        {title}
      </Text>
    </View>
  );
});

export const ElegantTimelinePDF: React.FC<PDFTemplateProps> = ({
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

  const contactParts = [
    resume.header.email,
    resume.header.phone,
    resume.header.location,
    resume.header.linkedin ? "LinkedIn" : null,
    resume.header.github ? "GitHub" : null,
    resume.header.website ? "Portfolio" : null,
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
        {/* ── Centered header ─────────────────────────────── */}
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <Text
            style={{
              fontSize: nameFontSize,
              fontWeight: 300,
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
                color: accentColor,
                marginBottom: 5,
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
          {/* Decorative line */}
          <View
            style={{
              height: 1,
              backgroundColor: accentColor,
              width: 60,
              marginTop: 10,
            }}
          />
        </View>

        {/* ── Summary ─────────────────────────────────────── */}
        {resume.summary ? (
          <View wrap={false}>
            <SH title="Profile" s={s} />
            <Text
              style={{
                fontSize,
                lineHeight,
                textAlign: "center",
                marginHorizontal: 20,
              }}
            >
              {plain(resume.summary)}
            </Text>
          </View>
        ) : null}

        {/* ── Experience (left-border timeline) ───────────── */}
        {(resume.experience ?? []).length > 0 ? (
          <View>
            <SH title="Experience" s={s} />
            {(resume.experience ?? []).map((exp, i) => (
              <View
                key={i}
                wrap={false}
                style={{ flexDirection: "row", marginBottom: 10 }}
              >
                {/* Timeline accent bar */}
                <View
                  style={{
                    width: 3,
                    backgroundColor: accentColor,
                    marginRight: 10,
                    borderRadius: 2,
                  }}
                />
                <View style={{ flex: 1 }}>
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
                      {exp.role}
                    </Text>
                    <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                      {exp.startDate} – {exp.endDate || "Present"}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: smallFontSize,
                      color: secondaryColor,
                      fontWeight: 600,
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
                      {"• "}
                      {a}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Projects ────────────────────────────────────── */}
        {(resume.projects ?? []).length > 0 ? (
          <View>
            <SH title="Projects" s={s} />
            {(resume.projects ?? []).map((proj, i) => (
              <View
                key={i}
                wrap={false}
                style={{ flexDirection: "row", marginBottom: 10 }}
              >
                <View
                  style={{
                    width: 3,
                    backgroundColor: withAlpha(accentColor, "88"),
                    marginRight: 10,
                    borderRadius: 2,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
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
                  <Text style={{ fontSize, lineHeight, marginTop: 2 }}>
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
                      {proj.technologies.join("  •  ")}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Skills (pill tags) ──────────────────────────── */}
        {(resume.skills ?? []).length > 0 ? (
          <View wrap={false}>
            <SH title="Skills" s={s} />
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {(resume.skills ?? []).map((skill, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: withAlpha(accentColor, "22"),
                    borderRadius: 10,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    marginRight: 5,
                    marginBottom: 5,
                  }}
                >
                  <Text style={{ fontSize: smallFontSize, color: accentColor }}>
                    {skill}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Education ───────────────────────────────────── */}
        {(resume.education ?? []).length > 0 ? (
          <View>
            <SH title="Education" s={s} />
            {(resume.education ?? []).map((edu, i) => (
              <View
                key={i}
                wrap={false}
                style={{ flexDirection: "row", marginBottom: 8 }}
              >
                <View
                  style={{
                    width: 3,
                    backgroundColor: withAlpha(primaryColor, "88"),
                    marginRight: 10,
                    borderRadius: 2,
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
                      style={{ fontSize, fontWeight: 700, color: textColor }}
                    >
                      {edu.degree}
                      {edu.field ? ` in ${edu.field}` : ""}
                    </Text>
                    <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                      {edu.startDate} – {edu.endDate || "Present"}
                    </Text>
                  </View>
                  <Text
                    style={{ fontSize: smallFontSize, color: secondaryColor }}
                  >
                    {edu.institution}
                  </Text>
                  {edu.gpa ? (
                    <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                      GPA: {edu.gpa}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Certifications ──────────────────────────────── */}
        {(resume.certifications ?? []).length > 0 ? (
          <View>
            <SH title="Certifications" s={s} />
            {(resume.certifications ?? []).map((cert, i) => (
              <View
                key={i}
                wrap={false}
                style={{ textAlign: "center", marginBottom: 5 }}
              >
                <Text
                  style={{
                    fontSize,
                    fontWeight: 600,
                    color: accentColor,
                    textAlign: "center",
                  }}
                >
                  {cert.name}
                </Text>
                <Text
                  style={{
                    fontSize: smallFontSize,
                    color: "#6b7280",
                    textAlign: "center",
                  }}
                >
                  {cert.issuer}
                  {" • "}
                  {cert.date}
                  {cert.url ? (
                    <Text>
                      {"  "}
                      <Link src={cert.url} style={{ color: accentColor }}>
                        [Verify]
                      </Link>
                    </Text>
                  ) : null}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Publications ────────────────────────────────── */}
        {(resume.publications ?? []).length > 0 ? (
          <View>
            <SH title="Publications" s={s} />
            {(resume.publications ?? []).map((pub, i) => (
              <View
                key={i}
                wrap={false}
                style={{ textAlign: "center", marginBottom: 6 }}
              >
                <Text
                  style={{
                    fontSize,
                    fontWeight: 600,
                    color: textColor,
                    textAlign: "center",
                  }}
                >
                  {pub.title}
                </Text>
                <Text
                  style={{
                    fontSize,
                    lineHeight,
                    color: "#4b5563",
                    textAlign: "center",
                  }}
                >
                  {pub.authors.join(", ")}
                </Text>
                <Text
                  style={{
                    fontSize: smallFontSize,
                    color: "#6b7280",
                    textAlign: "center",
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

        {/* ── Languages ───────────────────────────────────── */}
        {(resume.languages ?? []).length > 0 ? (
          <View wrap={false}>
            <SH title="Languages" s={s} />
            <Text
              style={{
                fontSize,
                lineHeight,
                textAlign: "center",
              }}
            >
              {(resume.languages ?? [])
                .map((l) => `${l.name} (${l.proficiency})`)
                .join("  •  ")}
            </Text>
          </View>
        ) : null}

        {/* ── Volunteer ───────────────────────────────────── */}
        {(resume.volunteer ?? []).length > 0 ? (
          <View>
            <SH title="Volunteer" s={s} />
            {(resume.volunteer ?? []).map((v, i) => (
              <View
                key={i}
                wrap={false}
                style={{ flexDirection: "row", marginBottom: 8 }}
              >
                <View
                  style={{
                    width: 3,
                    backgroundColor: withAlpha(accentColor, "66"),
                    marginRight: 10,
                    borderRadius: 2,
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
                      style={{ fontSize, fontWeight: 700, color: accentColor }}
                    >
                      {v.role}
                    </Text>
                    <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                      {v.startDate} – {v.endDate || "Present"}
                    </Text>
                  </View>
                  <Text
                    style={{ fontSize: smallFontSize, color: secondaryColor }}
                  >
                    {v.organization}
                  </Text>
                  {v.description ? (
                    <Text style={{ fontSize, lineHeight }}>
                      {plain(v.description)}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Awards ──────────────────────────────────────── */}
        {(resume.awards ?? []).length > 0 ? (
          <View>
            <SH title="Awards" s={s} />
            {(resume.awards ?? []).map((award, i) => (
              <View
                key={i}
                wrap={false}
                style={{ textAlign: "center", marginBottom: 5 }}
              >
                <Text
                  style={{
                    fontSize,
                    fontWeight: 600,
                    color: accentColor,
                    textAlign: "center",
                  }}
                >
                  {award.title}
                </Text>
                <Text
                  style={{
                    fontSize: smallFontSize,
                    color: "#6b7280",
                    textAlign: "center",
                  }}
                >
                  {award.issuer}
                  {" • "}
                  {award.date}
                </Text>
                {award.description ? (
                  <Text style={{ fontSize, lineHeight, textAlign: "center" }}>
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
