/**
 * Creative Modern – Cover Letter PDF Template
 * Mirrors CreativeModernCoverLetter.tsx: thick accent stripe on left edge,
 * large bold name with accent underline bar, body content.
 */

import { Document, Page, Text, View } from "@react-pdf/renderer";
import React from "react";

import BackgroundPdf from "@/lib/backgrounds/BackgroundPdf";
import { formatCoverLetterDate } from "@/lib/coverLetterDate";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

import { htmlToPdfNodes } from "../htmlToPdf";
import { getPagePt, ResolvedPDFStyles } from "../resolveStyles";

export interface CoverLetterPDFProps {
  coverLetter: string;
  resume: ResumeJSON;
  jobDetails?: JobDetailsJSON | null;
  styles: ResolvedPDFStyles;
}

export const CreativeModernCoverLetterPDF: React.FC<CoverLetterPDFProps> = ({
  coverLetter,
  resume,
  jobDetails,
  styles: s,
}) => {
  const h = resume.header;
  const today = formatCoverLetterDate(jobDetails, s.dateFormat);

  const contactParts = [h.email, h.phone, h.location].filter(Boolean);
  const linkParts = [h.linkedin, h.github, h.website].filter(Boolean);
  const { h: pagePtH } = getPagePt(s.pageFormat);

  return (
    <Document>
      <Page
        size={s.pageFormat}
        style={{
          fontFamily: s.fontFamily,
          fontSize: s.fontSize,
          color: s.textColor,
          backgroundColor: s.backgroundColor,
          flexDirection: "row",
          // Top/bottom margin on every page; the full-bleed stripe below is a
          // fixed absolute layer, so it ignores this padding.
          paddingTop: s.marginPt,
          paddingBottom: s.marginPt,
        }}
      >
        <BackgroundPdf styles={s} />
        {/* ── Vertical accent stripe ───────────────────────── */}
        {/* Fixed full-page-height layer instead of a plain flex sibling —
            a plain View here only stretches to match page 1's row height and
            doesn't repeat on a page 2. Same pattern as `BackgroundPdf`. */}
        <View
          fixed
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 6,
            height: pagePtH,
            backgroundColor: s.accentColor,
          }}
        />

        {/* ── Main content ─────────────────────────────────── */}
        <View style={{ flex: 1, paddingHorizontal: s.marginPt }}>
          {/* Header */}
          <View style={{ marginBottom: s.sp(24) }}>
            <Text
              style={{
                fontSize: s.nameFontSize,
                fontWeight: 700,
                color: s.primaryColor,
                marginBottom: s.sp(3),
              }}
            >
              {h.name}
            </Text>

            {/* Bold underline bar */}
            <View
              style={{
                height: 3,
                width: 54,
                backgroundColor: s.accentColor,
                marginBottom: s.sp(12),
              }}
            />

            {contactParts.length > 0 && (
              <Text
                style={{ fontSize: s.smallFontSize, color: s.secondaryColor }}
              >
                {contactParts.join("  •  ")}
              </Text>
            )}
            {linkParts.length > 0 && (
              <Text
                style={{
                  fontSize: s.smallFontSize,
                  color: s.accentColor,
                  marginTop: s.sp(3),
                }}
              >
                {linkParts.join("  •  ")}
              </Text>
            )}
          </View>

          {/* Date */}
          <Text
            style={{
              fontSize: s.fontSize,
              color: s.secondaryColor,
              marginBottom: s.sp(18),
            }}
          >
            {today}
          </Text>

          {/* Body */}
          {htmlToPdfNodes(coverLetter, s)}

          {/* Closing accent line */}
          <View
            style={{
              height: 2,
              width: 96,
              backgroundColor: s.accentColor,
              marginTop: s.sp(6),
            }}
          />
        </View>
      </Page>
    </Document>
  );
};
