/**
 * Tech Sidebar – Cover Letter PDF Template
 * Mirrors TechSidebarCoverLetter.tsx: colored header bar + two-column layout
 * (contact sidebar on left, body on right).
 */

import { Document, Page, Text, View } from "@react-pdf/renderer";
import React from "react";

import { ResumeJSON } from "@/types/resume";

import { htmlToPdfNodes } from "../htmlToPdf";
import { ResolvedPDFStyles, withAlpha } from "../resolveStyles";

export interface CoverLetterPDFProps {
  coverLetter: string;
  resume: ResumeJSON;
  styles: ResolvedPDFStyles;
}

export const TechSidebarCoverLetterPDF: React.FC<CoverLetterPDFProps> = ({
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

  const sidebarBg = withAlpha(s.secondaryColor, "1a"); // ~10% opacity

  const contactItems = [
    h.email && { label: "Email", value: h.email },
    h.phone && { label: "Phone", value: h.phone },
    h.location && { label: "Location", value: h.location },
    h.linkedin && { label: "LinkedIn", value: h.linkedin },
    h.github && { label: "GitHub", value: h.github },
    h.website && { label: "Website", value: h.website },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <Document>
      <Page
        size={s.pageFormat}
        style={{
          fontFamily: s.fontFamily,
          fontSize: s.fontSize,
          color: s.textColor,
          backgroundColor: s.backgroundColor,
          flexDirection: "column",
        }}
      >
        {/* ── Coloured header bar ───────────────────────────── */}
        <View
          style={{
            backgroundColor: s.primaryColor,
            paddingHorizontal: s.marginPt,
            paddingVertical: s.marginPt * 0.6,
          }}
        >
          <Text
            style={{
              fontSize: s.nameFontSize,
              fontWeight: 700,
              color: "#ffffff",
              marginBottom: 2,
            }}
          >
            {h.name}
          </Text>
          {h.headline ? (
            <Text
              style={{ fontSize: s.fontSize, color: "rgba(255,255,255,0.85)" }}
            >
              {h.headline}
            </Text>
          ) : null}
        </View>

        {/* ── Two-column body ───────────────────────────────── */}
        <View style={{ flexDirection: "row", flex: 1 }}>
          {/* Sidebar – 35% */}
          <View
            style={{
              width: "35%",
              backgroundColor: sidebarBg,
              padding: s.marginPt * 0.6,
            }}
          >
            <Text
              style={{
                fontSize: s.fontSize,
                fontWeight: 700,
                color: s.primaryColor,
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              Contact
            </Text>
            {contactItems.map((item, i) => (
              <View key={i} style={{ marginBottom: 6 }}>
                <Text
                  style={{
                    fontSize: s.smallFontSize,
                    fontWeight: 700,
                    color: s.accentColor,
                  }}
                >
                  {item.label}
                </Text>
                <Text
                  style={{
                    fontSize: s.smallFontSize,
                    color: s.textColor,
                  }}
                >
                  {item.value}
                </Text>
              </View>
            ))}

            {/* Date in sidebar */}
            <View style={{ marginTop: 16 }}>
              <Text
                style={{
                  fontSize: s.smallFontSize,
                  fontWeight: 700,
                  color: s.accentColor,
                }}
              >
                Date
              </Text>
              <Text style={{ fontSize: s.smallFontSize, color: s.textColor }}>
                {today}
              </Text>
            </View>
          </View>

          {/* Main content – 65% */}
          <View
            style={{
              width: "65%",
              padding: s.marginPt * 0.75,
            }}
          >
            {htmlToPdfNodes(coverLetter, s)}
          </View>
        </View>
      </Page>
    </Document>
  );
};
