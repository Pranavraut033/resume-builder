import { Link, Text, View } from "@react-pdf/renderer";
import React from "react";

import { htmlToPlainText, isHtml } from "@/lib/htmlUtils";
import { ResumeJSON, getSectionLayout } from "@/types/resume";

import { ResolvedPDFStyles, withAlpha } from "./resolveStyles";

const plain = (text: string | null | undefined): string => {
  if (!text) return "";
  return isHtml(text) ? htmlToPlainText(text) : text;
};

export type PDFSectionBuilderArgs = {
  resume: ResumeJSON;
  instance: { id: string; title: string };
  styles: ResolvedPDFStyles;
};

export type PDFSectionBuilder = (args: PDFSectionBuilderArgs) => React.ReactNode;

// ── PDF Section Builders ────────────────────────────────────────────────────
// Mirror of DOM section builders, but emit react-pdf Views/Texts instead of DOM nodes.
// Each builder handles one section type and is parameterized by instance.title.

const pdfSummary: PDFSectionBuilder = ({ resume, styles: s }) => {
  if (!resume.summary) return null;
  return (
    <Text style={{ fontSize: s.fontSize, lineHeight: s.lineHeight, color: "#374151" }}>
      {plain(resume.summary)}
    </Text>
  );
};

const pdfExperience: PDFSectionBuilder = ({ resume, styles: s }) => {
  const { fontSize, smallFontSize, lineHeight, accentColor } = s;
  if (resume.experience.length === 0) return null;

  return (
    <>
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
              <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
                {exp.role}
              </Text>
              <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                {exp.company}
              </Text>
            </View>
            <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
              {exp.startDate} – {exp.endDate || "Present"}
            </Text>
          </View>
          {exp.description ? (
            <Text style={{ fontSize, lineHeight, color: "#374151", marginBottom: 3 }}>
              {plain(exp.description)}
            </Text>
          ) : null}
          {exp.achievements.map((a, j) => (
            <Text key={j} style={{ fontSize, lineHeight, color: "#374151", marginLeft: 8 }}>
              {"• "}{a}
            </Text>
          ))}
        </View>
      ))}
    </>
  );
};

const pdfProjects: PDFSectionBuilder = ({ resume, styles: s }) => {
  const { fontSize, smallFontSize, lineHeight, accentColor, secondaryColor } = s;
  if (resume.projects.length === 0) return null;

  return (
    <>
      {resume.projects.map((proj, i) => (
        <View key={i} wrap={false} style={{ marginBottom: 9 }}>
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
            {proj.startDate || proj.endDate ? (
              <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                {proj.startDate || ""} – {proj.endDate || "Present"}
              </Text>
            ) : null}
          </View>
          <Text style={{ fontSize, lineHeight, color: "#374151", marginBottom: 3 }}>
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
    </>
  );
};

const pdfSkills: PDFSectionBuilder = ({ resume, styles: s }) => {
  if (resume.skills.length === 0) return null;
  return (
    <Text style={{ fontSize: s.fontSize, lineHeight: s.lineHeight, color: "#374151" }}>
      {resume.skills.join("  •  ")}
    </Text>
  );
};

const pdfEducation: PDFSectionBuilder = ({ resume, styles: s }) => {
  const { fontSize, smallFontSize, accentColor } = s;
  if (resume.education.length === 0) return null;

  return (
    <>
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
              <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
                {edu.degree}
                {edu.field ? ` in ${edu.field}` : ""}
              </Text>
              <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
                {edu.institution}
              </Text>
            </View>
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
    </>
  );
};

const pdfCertifications: PDFSectionBuilder = ({ resume, styles: s }) => {
  const { fontSize, smallFontSize, accentColor, secondaryColor } = s;
  if (resume.certifications.length === 0) return null;

  return (
    <>
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
        <View key={i} wrap={false} style={{ marginBottom: 6 }}>
          <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
            {pub.title}
          </Text>
          <Text style={{ fontSize: smallFontSize, lineHeight, color: "#374151" }}>
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
    </>
  );
};

const pdfLanguages: PDFSectionBuilder = ({ resume, styles: s }) => {
  const langs = resume.languages ?? [];
  if (langs.length === 0) return null;
  return (
    <Text style={{ fontSize: s.fontSize, lineHeight: s.lineHeight, color: "#374151" }}>
      {langs.map((l) => `${l.name} (${l.proficiency})`).join("  •  ")}
    </Text>
  );
};

const pdfVolunteer: PDFSectionBuilder = ({ resume, styles: s }) => {
  const { fontSize, smallFontSize, lineHeight, accentColor } = s;
  const vols = resume.volunteer ?? [];
  if (vols.length === 0) return null;

  return (
    <>
      {vols.map((v, i) => (
        <View key={i} wrap={false} style={{ marginBottom: 8 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize, fontWeight: 700, color: accentColor }}>
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
            <Text style={{ fontSize, lineHeight, color: "#374151" }}>
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
    </>
  );
};

const pdfCustom: PDFSectionBuilder = ({ resume, instance }) => {
  const section = (resume.sectionLayout?.custom ?? []).find(
    (c) => c.id === instance.id
  );
  if (!section || section.items.length === 0) return null;

  return section.type === "text" ? (
    <Text>{section.items.join(" ")}</Text>
  ) : (
    <>
      {section.items.map((item, i) => (
        <Text key={i}>{"• "}{item}</Text>
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
  custom: pdfCustom,
};
