/**
 * Tech Sidebar – Cover Letter PDF Template
 * Mirrors TechSidebarCoverLetter.tsx: colored header bar + two-column layout
 * (contact sidebar on left, body on right).
 */

import { Document, Page, Text, View } from "@react-pdf/renderer";
import React from "react";

import BackgroundPdf from "@/lib/backgrounds/BackgroundPdf";
import { formatCoverLetterDate } from "@/lib/coverLetterDate";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

import { htmlToPdfNodes } from "../htmlToPdf";
import { getPagePt, ResolvedPDFStyles, withAlpha } from "../resolveStyles";

export interface CoverLetterPDFProps {
  coverLetter: string;
  resume: ResumeJSON;
  jobDetails?: JobDetailsJSON | null;
  styles: ResolvedPDFStyles;
}

export const TechSidebarCoverLetterPDF: React.FC<CoverLetterPDFProps> = ({
  coverLetter,
  resume,
  jobDetails,
  styles: s,
}) => {
  const h = resume.header;
  const today = formatCoverLetterDate(jobDetails, s.dateFormat);

  const sidebarBg = withAlpha(s.secondaryColor, "1a"); // ~10% opacity
  const { w: pagePtW, h: pagePtH } = getPagePt(s.pageFormat);

  const contactItems = [
    h.email && { label: "Email", value: h.email },
    h.phone && { label: "Phone", value: h.phone },
    h.location && { label: "Location", value: h.location },
    h.linkedin && { label: "LinkedIn", value: h.linkedin },
    h.github && { label: "GitHub", value: h.github },
    h.website && { label: "Website", value: h.website },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <Document>
      <Page
        size={s.pageFormat}
        style={{
          fontFamily: s.fontFamily,
          fontSize: s.fontSize,
          color: s.textColor,
          backgroundColor: s.backgroundColor,
          flexDirection: "column",
        }}
      >
        <BackgroundPdf styles={s} />
        {/* Sidebar fill, painted full page height as a fixed layer instead
            of relying on `flex: 1` — the previous flex fill stopped short on
            a page whose content is shorter than the sidebar, and never
            repeated on a page 2. Same pattern as `BackgroundPdf` /
            `PDFTemplateEngine`'s `sidebarFillView`. */}
        <View
          fixed
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: pagePtW * 0.35,
            height: pagePtH,
            backgroundColor: sidebarBg,
          }}
        />
        {/* ── Coloured header bar ───────────────────────────── */}
        <View
          style={{
            backgroundColor: s.primaryColor,
            paddingHorizontal: s.marginPt,
            paddingVertical: s.marginPt * 0.6,
          }}
        >
          <Text
            style={{
              fontSize: s.nameFontSize,
              fontWeight: 700,
              color: "#ffffff",
              marginBottom: 2,
            }}
          >
            {h.name}
          </Text>
          {h.headline ? (
            <Text
              style={{ fontSize: s.fontSize, color: "rgba(255,255,255,0.85)" }}
            >
              {h.headline}
            </Text>
          ) : null}
        </View>

        {/* ── Two-column body ───────────────────────────────── */}
        <View style={{ flexDirection: "row", flex: 1 }}>
          {/* Sidebar – 35% */}
          <View
            style={{
              width: "35%",
              padding: s.marginPt * 0.6,
            }}
          >
            <Text
              style={{
                fontSize: s.fontSize,
                fontWeight: 700,
                color: s.primaryColor,
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              Contact
            </Text>
            {contactItems.map((item, i) => (
              <View key={i} style={{ marginBottom: 6 }}>
                <Text
                  style={{
                    fontSize: s.smallFontSize,
                    fontWeight: 700,
                    color: s.accentColor,
                  }}
                >
                  {item.label}
                </Text>
                <Text
                  style={{
                    fontSize: s.smallFontSize,
                    color: s.textColor,
                  }}
                >
                  {item.value}
                </Text>
              </View>
            ))}

            {/* Date in sidebar */}
            <View style={{ marginTop: 16 }}>
              <Text
                style={{
                  fontSize: s.smallFontSize,
                  fontWeight: 700,
                  color: s.accentColor,
                }}
              >
                Date
              </Text>
              <Text style={{ fontSize: s.smallFontSize, color: s.textColor }}>
                {today}
              </Text>
            </View>
          </View>

          {/* Main content – 65% */}
          <View
            style={{
              width: "65%",
              padding: s.marginPt * 0.75,
            }}
          >
            {htmlToPdfNodes(coverLetter, s)}
          </View>
        </View>
      </Page>
    </Document>
  );
};
