/**
 * Two-Tone – Cover Letter PDF Template
 * Mirrors TwoToneCoverLetter.tsx: bold colour-block header, reversed-out name
 * plate, accent stripe.
 */

import { Document, Page, Text, View } from "@react-pdf/renderer";
import React from "react";

import BackgroundPdf from "@/lib/backgrounds/BackgroundPdf";
import { withAlpha } from "@/lib/pdf/resolveStyles";
import { ResumeJSON } from "@/types/resume";

import { htmlToPdfNodes } from "../htmlToPdf";
import { ResolvedPDFStyles } from "../resolveStyles";

export interface CoverLetterPDFProps {
  coverLetter: string;
  resume: ResumeJSON;
  styles: ResolvedPDFStyles;
}

export const TwoToneCoverLetterPDF: React.FC<CoverLetterPDFProps> = ({
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
                color: s.primaryColor,
                backgroundColor: s.backgroundColor,
                alignSelf: "flex-start",
                paddingHorizontal: 8,
                paddingVertical: 3,
                marginBottom: 6,
              }}
            >
              {h.name}
            </Text>
            {contactParts.length > 0 && (
              <Text
                style={{
                  fontSize: s.smallFontSize,
                  color: withAlpha("#ffffff", "bb"),
                }}
              >
                {contactParts.join("  •  ")}
              </Text>
            )}
            {linkParts.length > 0 && (
              <Text
                style={{
                  fontSize: s.smallFontSize,
                  color: withAlpha("#ffffff", "bb"),
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
            style={{ fontSize: s.fontSize, color: "#6b7280", marginBottom: 14 }}
          >
            {today}
          </Text>

          {htmlToPdfNodes(coverLetter, s)}
        </View>
      </Page>
    </Document>
  );
};
