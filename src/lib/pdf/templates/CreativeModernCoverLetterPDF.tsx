/**
 * Creative Modern – Cover Letter PDF Template
 * Mirrors CreativeModernCoverLetter.tsx: thick accent stripe on left edge,
 * large bold name with accent underline bar, body content.
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

export const CreativeModernCoverLetterPDF: React.FC<CoverLetterPDFProps> = ({
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
          flexDirection: "row",
        }}
      >
        {/* ── Vertical accent stripe ───────────────────────── */}
        <View
          style={{ width: 8, backgroundColor: s.accentColor, flexShrink: 0 }}
        />

        {/* ── Main content ─────────────────────────────────── */}
        <View style={{ flex: 1, padding: s.marginPt }}>
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
