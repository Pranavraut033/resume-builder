/**
 * Two-Tone – Cover Letter PDF Template
 * Mirrors TwoToneCoverLetter.tsx: bold colour-block header, reversed-out name
 * plate, accent stripe.
 */

import { Document, Page, Text, View } from "@react-pdf/renderer";
import React from "react";

import BackgroundPdf from "@/lib/backgrounds/BackgroundPdf";
import { formatCoverLetterDate } from "@/lib/coverLetterDate";
import { withAlpha } from "@/lib/pdf/resolveStyles";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

import { htmlToPdfNodes } from "../htmlToPdf";
import { ResolvedPDFStyles } from "../resolveStyles";

export interface CoverLetterPDFProps {
  coverLetter: string;
  resume: ResumeJSON;
  jobDetails?: JobDetailsJSON | null;
  styles: ResolvedPDFStyles;
}

export const TwoToneCoverLetterPDF: React.FC<CoverLetterPDFProps> = ({
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
        }}
      >
        <BackgroundPdf styles={s} />
        {/* ── Bold two-tone header band ─────────────────────── */}
        <View style={{ flexDirection: "row" }}>
          <View
            style={{
              flex: 1,
              backgroundColor: s.primaryColor,
              padding: s.marginPt,
              paddingVertical: s.marginPt * 0.9,
            }}
          >
            <Text
              style={{
                fontSize: s.nameFontSize,
                fontWeight: 700,
                // Inverted text straight on the band, not a plate — react-pdf
                // v4 doesn't reliably paint `backgroundColor` on a `<Text>`
                // node, which previously left primaryColor text on a
                // primaryColor band (invisible). Same pattern as the two-tone
                // resume PDF's `bandContent` (PDFTemplateEngine.tsx).
                color: s.backgroundColor,
                marginBottom: 6,
              }}
            >
              {h.name}
            </Text>
            {contactParts.length > 0 && (
              <Text
                style={{
                  fontSize: s.smallFontSize,
                  color: withAlpha(s.backgroundColor, "bb"),
                }}
              >
                {contactParts.join("  •  ")}
              </Text>
            )}
            {linkParts.length > 0 && (
              <Text
                style={{
                  fontSize: s.smallFontSize,
                  color: withAlpha(s.backgroundColor, "bb"),
                  marginTop: 2,
                }}
              >
                {linkParts.join("  •  ")}
              </Text>
            )}
          </View>
          {/* Second tone: accent stripe */}
          <View style={{ width: 8, backgroundColor: s.accentColor }} />
        </View>

        {/* ── Content ──────────────────────────────────────── */}
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

          {htmlToPdfNodes(coverLetter, s)}
        </View>
      </Page>
    </Document>
  );
};
