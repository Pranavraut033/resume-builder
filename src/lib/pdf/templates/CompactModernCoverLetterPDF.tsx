/**
 * Compact Modern – Cover Letter PDF Template
 * Mirrors CompactModernCoverLetter.tsx: dense, ATS-friendly, pipe-joined contact line.
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

export const CompactModernCoverLetterPDF: React.FC<CoverLetterPDFProps> = ({
  coverLetter,
  resume,
  jobDetails,
  styles: s,
}) => {
  const h = resume.header;
  const today = formatCoverLetterDate(jobDetails, s.dateFormat);

  const contactParts = [h.email, h.phone, h.location].filter(Boolean);
  const linkParts = [h.linkedin, h.github, h.website].filter(Boolean);

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
            borderBottomWidth: 1,
            borderBottomColor: s.secondaryColor,
            paddingBottom: 4,
            marginBottom: 8,
          }}
        >
          <Text
            style={{
              fontSize: s.nameFontSize * 0.85,
              fontWeight: 700,
              color: s.primaryColor,
              marginBottom: 2,
            }}
          >
            {h.name}
          </Text>
          {contactParts.length > 0 && (
            <Text
              style={{ fontSize: s.smallFontSize, color: s.secondaryColor }}
            >
              {contactParts.join("  |  ")}
            </Text>
          )}
          {linkParts.length > 0 && (
            <Text
              style={{ fontSize: s.smallFontSize, color: s.secondaryColor }}
            >
              {linkParts.join("  |  ")}
            </Text>
          )}
        </View>

        {/* ── Date ─────────────────────────────────────────── */}
        <Text
          style={{
            fontSize: s.fontSize,
            color: s.secondaryColor,
            marginBottom: 6,
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
