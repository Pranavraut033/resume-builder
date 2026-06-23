/**
 * Academic Serif – Cover Letter PDF Template
 * Mirrors AcademicSerifCoverLetter.tsx: centered header, double-rule divider.
 */

import { Document, Page, Text, View } from "@react-pdf/renderer";
import React from "react";

import BackgroundPdf from "@/lib/backgrounds/BackgroundPdf";
import { ResumeJSON } from "@/types/resume";

import { htmlToPdfNodes } from "../htmlToPdf";
import { ResolvedPDFStyles } from "../resolveStyles";

export interface CoverLetterPDFProps {
  coverLetter: string;
  resume: ResumeJSON;
  styles: ResolvedPDFStyles;
}

export const AcademicSerifCoverLetterPDF: React.FC<CoverLetterPDFProps> = ({
  coverLetter,
  resume,
  styles: s,
}) => {
  const h = resume.header;
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const contactParts = [
    h.email,
    h.phone,
    h.location,
    h.linkedin,
    h.github,
    h.website,
  ].filter(Boolean);

  return (
    <Document>
      <Page
        size={s.pageFormat}
        style={{
          fontFamily: s.fontFamily,
          fontSize: s.fontSize,
          color: s.textColor,
          backgroundColor: s.backgroundColor,
          padding: s.marginPt,
        }}
      >
        <BackgroundPdf styles={s} />
        {/* ── Header (centered, double-rule divider) ───────── */}
        <View style={{ alignItems: "center", marginBottom: 16 }}>
          <Text
            style={{
              fontSize: s.nameFontSize,
              fontWeight: 700,
              color: s.primaryColor,
              marginBottom: 4,
              textAlign: "center",
              letterSpacing: 1,
            }}
          >
            {h.name}
          </Text>
          <Text
            style={{
              fontSize: s.smallFontSize,
              color: s.secondaryColor,
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
                backgroundColor: s.primaryColor,
                marginBottom: 1,
              }}
            />
            <View style={{ height: 1, backgroundColor: s.secondaryColor }} />
          </View>
        </View>

        {/* ── Date ─────────────────────────────────────────── */}
        <Text
          style={{ fontSize: s.fontSize, color: "#6b7280", marginBottom: 14 }}
        >
          {today}
        </Text>

        {/* ── Body ─────────────────────────────────────────── */}
        {htmlToPdfNodes(coverLetter, s)}
      </Page>
    </Document>
  );
};
