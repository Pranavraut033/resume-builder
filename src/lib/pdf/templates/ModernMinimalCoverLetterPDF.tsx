/**
 * Modern Minimal – Cover Letter PDF Template
 * Mirrors ModernMinimalCoverLetter.tsx: clean border-bottom header, flush left.
 */

import { Document, Page, Text, View } from "@react-pdf/renderer";
import React from "react";

import BackgroundPdf from "@/lib/backgrounds/BackgroundPdf";
import { formatCoverLetterDate } from "@/lib/coverLetterDate";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

import { htmlToPdfNodes } from "../htmlToPdf";
import { ResolvedPDFStyles } from "../resolveStyles";

export interface CoverLetterPDFProps {
  coverLetter: string;
  resume: ResumeJSON;
  jobDetails?: JobDetailsJSON | null;
  styles: ResolvedPDFStyles;
}

export const ModernMinimalCoverLetterPDF: React.FC<CoverLetterPDFProps> = ({
  coverLetter,
  resume,
  jobDetails,
  styles: s,
}) => {
  const h = resume.header;
  const today = formatCoverLetterDate(jobDetails, s.dateFormat);

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
          <Text style={{ fontSize: s.smallFontSize, color: s.secondaryColor }}>
            {contactParts.join("  •  ")}
          </Text>
        </View>

        {/* ── Date ─────────────────────────────────────────── */}
        <Text
          style={{
            fontSize: s.fontSize,
            color: s.secondaryColor,
            marginBottom: 14,
          }}
        >
          {today}
        </Text>

        {/* ── Body ─────────────────────────────────────────── */}
        {htmlToPdfNodes(coverLetter, s)}
      </Page>
    </Document>
  );
};
