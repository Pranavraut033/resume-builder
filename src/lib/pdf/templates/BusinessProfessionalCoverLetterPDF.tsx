/**
 * Business Professional – Cover Letter PDF Template
 * Mirrors BusinessProfessionalCoverLetter.tsx: formal header with primary-color
 * name, horizontal rule, contact row, date, body.
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

export const BusinessProfessionalCoverLetterPDF: React.FC<
  CoverLetterPDFProps
> = ({ coverLetter, resume, styles: s }) => {
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
          padding: s.marginPt,
        }}
      >
        <BackgroundPdf styles={s} />
        {/* ── Name + divider ───────────────────────────────── */}
        <View style={{ marginBottom: 12 }}>
          <Text
            style={{
              fontSize: s.nameFontSize,
              fontWeight: 700,
              color: s.primaryColor,
              marginBottom: 6,
            }}
          >
            {h.name}
          </Text>

          {/* Horizontal rule */}
          <View
            style={{
              height: 1,
              backgroundColor: s.secondaryColor,
              marginBottom: 6,
            }}
          />

          {/* Contact row */}
          {contactParts.length > 0 && (
            <Text
              style={{ fontSize: s.smallFontSize, color: s.secondaryColor }}
            >
              {contactParts.join("   |   ")}
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
              {linkParts.join("   |   ")}
            </Text>
          )}
        </View>

        {/* ── Date ─────────────────────────────────────────── */}
        <Text
          style={{ fontSize: s.fontSize, color: "#6b7280", marginBottom: 14 }}
        >
          {today}
        </Text>

        {/* ── Body ─────────────────────────────────────────── */}
        {htmlToPdfNodes(coverLetter, s)}

        {/* ── Closing accent ───────────────────────────────── */}
        <View
          style={{
            height: 2,
            width: 40,
            backgroundColor: s.primaryColor,
            marginTop: 18,
          }}
        />
      </Page>
    </Document>
  );
};
