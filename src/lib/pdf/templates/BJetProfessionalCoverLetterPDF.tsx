/**
 * BJet Professional – Cover Letter PDF Template
 * Mirrors BJetProfessionalCoverLetter.tsx: gradient header (primary→secondary)
 * with white text, body with bottom accent bar.
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

export const BJetProfessionalCoverLetterPDF: React.FC<CoverLetterPDFProps> = ({
  coverLetter,
  resume,
  jobDetails,
  styles: s,
}) => {
  const h = resume.header;
  const today = formatCoverLetterDate(jobDetails, s.dateFormat);

  const contactParts = [h.email, h.phone, h.location]
    .filter(Boolean)
    .join("  •  ");
  const linkParts = [h.linkedin, h.github, h.website]
    .filter(Boolean)
    .join("  •  ");

  return (
    <Document>
      <Page
        size={s.pageFormat}
        style={{
          fontFamily: s.fontFamily,
          fontSize: s.fontSize,
          color: s.textColor,
          backgroundColor: s.backgroundColor,
        }}
      >
        <BackgroundPdf styles={s} />
        {/* ── Gradient Header ───────────────────────────────── */}
        <View
          style={{
            backgroundColor: s.primaryColor,
            padding: s.marginPt,
            paddingBottom: s.marginPt * 0.75,
            marginBottom: 0,
          }}
        >
          <Text
            style={{
              fontSize: s.nameFontSize,
              fontWeight: 700,
              color: "#ffffff",
              marginBottom: 4,
            }}
          >
            {h.name}
          </Text>
          {contactParts ? (
            <Text
              style={{
                fontSize: s.smallFontSize,
                color: "rgba(255,255,255,0.9)",
              }}
            >
              {contactParts}
            </Text>
          ) : null}
          {linkParts ? (
            <Text
              style={{
                fontSize: s.smallFontSize,
                color: "rgba(255,255,255,0.8)",
                marginTop: 2,
              }}
            >
              {linkParts}
            </Text>
          ) : null}
        </View>

        {/* ── Body ─────────────────────────────────────────── */}
        <View style={{ padding: s.marginPt }}>
          {/* Date */}
          <Text
            style={{
              fontSize: s.fontSize,
              color: s.secondaryColor,
              marginBottom: 14,
            }}
          >
            {today}
          </Text>

          {/* Cover letter body */}
          {htmlToPdfNodes(coverLetter, s)}

          {/* Accent bar */}
          <View
            style={{
              height: 3,
              width: 48,
              backgroundColor: s.accentColor,
              marginTop: 14,
            }}
          />
        </View>
      </Page>
    </Document>
  );
};
