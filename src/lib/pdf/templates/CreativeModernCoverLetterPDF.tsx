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
            width: 8,
            height: pagePtH,
            backgroundColor: s.accentColor,
          }}
        />

        {/* ── Main content ─────────────────────────────────── */}
        {/* marginLeft: 8 reserves the space the stripe used to occupy as a
            flex sibling, now that it's an absolutely-positioned overlay
            instead (see above). */}
        <View style={{ flex: 1, marginLeft: 8, padding: s.marginPt }}>
          {/* Header */}
          <View style={{ marginBottom: 16 }}>
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

            {/* Bold underline bar */}
            <View
              style={{
                height: 3,
                width: 64,
                backgroundColor: s.accentColor,
                marginBottom: 8,
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
                  marginTop: 2,
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
              marginBottom: 14,
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
              width: 80,
              backgroundColor: s.accentColor,
              marginTop: 16,
            }}
          />
        </View>
      </Page>
    </Document>
  );
};
