/**
 * Business Professional – Cover Letter PDF Template
 * Mirrors BusinessProfessionalCoverLetter.tsx: formal header with primary-color
 * name, horizontal rule, contact row, date, body.
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

export const BusinessProfessionalCoverLetterPDF: React.FC<
  CoverLetterPDFProps
> = ({ coverLetter, resume, jobDetails, styles: s }) => {
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
        {/* ── Name + divider ───────────────────────────────── */}
        <View
          style={{
            marginBottom: s.sp(24),
            paddingBottom: s.sp(18),
            borderBottomWidth: 1,
            borderBottomColor: s.secondaryColor,
          }}
        >
          <Text
            style={{
              fontSize: s.nameFontSize,
              fontWeight: 700,
              color: s.primaryColor,
              marginBottom: s.sp(6),
              textAlign: "center",
            }}
          >
            {h.name}
          </Text>

          {/* Contact rows (centered, like the preview) */}
          {contactParts.length > 0 && (
            <Text
              style={{
                fontSize: s.smallFontSize,
                color: s.secondaryColor,
                textAlign: "center",
              }}
            >
              {contactParts.join("  •  ")}
            </Text>
          )}
          {linkParts.length > 0 && (
            <Text
              style={{
                fontSize: s.smallFontSize,
                color: s.secondaryColor,
                marginTop: s.sp(3),
                textAlign: "center",
              }}
            >
              {linkParts.join("  •  ")}
            </Text>
          )}
        </View>

        {/* ── Date ─────────────────────────────────────────── */}
        <Text
          style={{
            fontSize: s.fontSize,
            color: s.secondaryColor,
            marginBottom: s.sp(18),
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
