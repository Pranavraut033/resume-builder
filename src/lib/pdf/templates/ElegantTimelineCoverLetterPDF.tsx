/**
 * Elegant Timeline – Cover Letter PDF Template
 * Mirrors ElegantTimelineCoverLetter.tsx: decorative left border accent,
 * large styled name, contact info below, then body.
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

export const ElegantTimelineCoverLetterPDF: React.FC<CoverLetterPDFProps> = ({
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
          padding: s.marginPt,
        }}
      >
        {/* ── Elegant header with left accent bar ───────────── */}
        <View
          style={{
            flexDirection: "row",
            marginBottom: 16,
          }}
        >
          {/* Decorative left accent bar */}
          <View
            style={{
              width: 4,
              backgroundColor: s.primaryColor,
              marginRight: 12,
              borderRadius: 2,
            }}
          />

          <View style={{ flex: 1 }}>
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

            {/* Thin accent underline beneath name */}
            <View
              style={{
                height: 1,
                width: 48,
                backgroundColor: s.accentColor,
                marginBottom: 6,
              }}
            />

            {contactParts.length > 0 && (
              <Text
                style={{ fontSize: s.smallFontSize, color: s.secondaryColor }}
              >
                {contactParts.join("  ·  ")}
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
                {linkParts.join("  ·  ")}
              </Text>
            )}
          </View>
        </View>

        {/* Divider */}
        <View
          style={{
            height: 1,
            backgroundColor: s.secondaryColor,
            marginBottom: 14,
            opacity: 0.3,
          }}
        />

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
