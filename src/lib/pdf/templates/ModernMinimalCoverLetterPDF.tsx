/**
 * Modern Minimal – Cover Letter PDF Template
 * Mirrors ModernMinimalCoverLetter.tsx: clean border-bottom header, flush left.
 */

import { Document, Page, Text, View } from "@react-pdf/renderer";
import React from "react";

import { ResumeJSON } from "@/types/resume";

import { htmlToPdfNodes } from "../htmlToPdf";
import { ResolvedPDFStyles } from "../resolveStyles";

export interface CoverLetterPDFProps {
  coverLetter: string;
  resume: ResumeJSON;
  styles: ResolvedPDFStyles;
}

export const ModernMinimalCoverLetterPDF: React.FC<CoverLetterPDFProps> = ({
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
        {/* ── Header ───────────────────────────────────────── */}
        <View
          style={{
            borderBottomWidth: 2,
            borderBottomColor: s.primaryColor,
            paddingBottom: 8,
            marginBottom: 14,
          }}
        >
          <Text
            style={{
              fontSize: s.nameFontSize,
              fontWeight: 700,
              color: s.primaryColor,
              marginBottom: 4,
            }}
          >
            {h.name}
          </Text>
          <Text style={{ fontSize: s.smallFontSize, color: "#6b7280" }}>
            {contactParts.join("  •  ")}
          </Text>
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
