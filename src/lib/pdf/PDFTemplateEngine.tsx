import { Document, Page, Text, View } from "@react-pdf/renderer";
import React, { memo } from "react";

import { buildSections } from "@/components/job-v2/engine/buildSections";
import { TemplateConfig } from "@/components/job-v2/engine/types";
import BackgroundPdf from "@/lib/backgrounds/BackgroundPdf";
import { htmlToPlainText, isHtml } from "@/lib/htmlUtils";
import { ResumeJSON, getSectionLayout } from "@/types/resume";

import { ResolvedPDFStyles } from "./resolveStyles";
import { PDF_SECTION_REGISTRY } from "./sections";
import { SectionGroup } from "./templates/shared/SectionGroup";
import { PDFTemplateProps } from "./templates/ModernMinimalPDF";

const plain = (text: string | null | undefined): string => {
  if (!text) return "";
  return isHtml(text) ? htmlToPlainText(text) : text;
};

function buildContactLine(header: ResumeJSON["header"]): string {
  return [
    header.email,
    header.phone,
    header.location,
    header.linkedin ?? null,
    header.github ?? null,
    header.website ?? null,
  ]
    .filter(Boolean)
    .join("  •  ");
}

// ── Section Heading Components (styled per heading type) ────────────────────

const SectionHeading = memo(function SectionHeading({
  title,
  s,
  headingStyle,
  isSidebar,
}: {
  title: string;
  s: ResolvedPDFStyles;
  headingStyle: "uppercase" | "underline" | "bar" | "serif";
  isSidebar?: boolean;
}) {
  const { primaryColor, secondaryColor, fontFamily, headingFontSize, fontSize } = s;

  const isUppercase = headingStyle === "uppercase";
  const isBar = headingStyle === "bar";
  const isSerif = headingStyle === "serif";

  if (isUppercase) {
    return (
      <View
        style={{
          marginBottom: 5,
          marginTop: 10,
          borderBottomWidth: 1,
          borderBottomColor: primaryColor,
          paddingBottom: 2,
        }}
      >
        <Text
          style={{
            fontFamily,
            fontSize: isSidebar ? fontSize + 1 : headingFontSize,
            fontWeight: 700,
            color: primaryColor,
          }}
        >
          {title.toUpperCase()}
        </Text>
      </View>
    );
  }

  if (isBar) {
    return (
      <View
        style={{
          marginBottom: 5,
          marginTop: 10,
          borderLeftWidth: 4,
          borderLeftColor: primaryColor,
          paddingLeft: 8,
        }}
      >
        <Text
          style={{
            fontFamily,
            fontSize: headingFontSize,
            fontWeight: 700,
            color: primaryColor,
          }}
        >
          {title}
        </Text>
      </View>
    );
  }

  if (isSerif) {
    return (
      <View
        style={{
          marginBottom: 5,
          marginTop: 10,
          borderBottomWidth: 1,
          borderBottomColor: secondaryColor,
          paddingBottom: 2,
        }}
      >
        <Text
          style={{
            fontFamily: "Georgia",
            fontSize: headingFontSize,
            fontWeight: 700,
            fontStyle: "italic",
            color: primaryColor,
          }}
        >
          {title}
        </Text>
      </View>
    );
  }

  // default: underline
  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: secondaryColor,
        paddingBottom: 2,
        marginTop: 10,
        marginBottom: 5,
      }}
    >
      <Text
        style={{
          fontFamily,
          fontSize: headingFontSize,
          fontWeight: 700,
          color: primaryColor,
        }}
      >
        {title}
      </Text>
    </View>
  );
});

interface PDFTemplateEngineProps extends PDFTemplateProps {
  config: TemplateConfig;
}

/**
 * PDF Template Engine — mirrors TemplateEngine.tsx for DOM rendering.
 * Uses buildSections() to get ordered/hidden/custom-aware section list,
 * then renders each via PDF_SECTION_REGISTRY builders, laid out per config.
 */
export const PDFTemplateEngine: React.FC<PDFTemplateEngineProps> = ({
  resume,
  styles: s,
  config,
}) => {
  const {
    primaryColor,
    secondaryColor,
    accentColor,
    textColor,
    backgroundColor,
    fontFamily,
    fontSize,
    smallFontSize,
    nameFontSize,
    lineHeight,
    marginPt,
    pageFormat,
  } = s;

  const sectionLayout = getSectionLayout(resume);
  const headerHidden = sectionLayout.hidden.includes("header");

  // Use buildSections to get ordered, hidden-filtered sections
  const instances = buildSections(resume, config);
  const col0Instances = instances.filter((s) => s.column === 0);
  const col1Instances = instances.filter((s) => s.column === 1);

  // ── Header ──────────────────────────────────────────────────────────────
  const headerNode = headerHidden ? null : (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{
          fontSize: nameFontSize,
          fontWeight: 700,
          color: textColor,
          marginBottom: 3,
        }}
      >
        {resume.header.name}
      </Text>
      {resume.header.headline ? (
        <Text style={{ fontSize, color: accentColor, marginBottom: 3 }}>
          {resume.header.headline}
        </Text>
      ) : null}
      <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
        {buildContactLine(resume.header)}
      </Text>
    </View>
  );

  // ── Helper: Render section with heading ──────────────────────────────────
  const renderSection = (instance: { id: string; type: string; title: string }, isSidebar = false) => {
    const builder = PDF_SECTION_REGISTRY[instance.type];
    if (!builder) return null;

    const content = builder({
      resume,
      instance,
      styles: s,
    });

    if (!content) return null;

    const heading = (
      <SectionHeading
        title={instance.title}
        s={s}
        headingStyle={config.heading}
        isSidebar={isSidebar}
      />
    );

    return (
      <View key={instance.id}>
        <SectionGroup heading={heading}>{content}</SectionGroup>
      </View>
    );
  };

  // ── Render columns ──────────────────────────────────────────────────────
  if (config.columns === 1) {
    // Single-column layout
    const sections = col0Instances.map((instance) => renderSection(instance));

    return (
      <Document>
        <Page
          size={pageFormat}
          style={{
            fontFamily,
            fontSize,
            color: textColor,
            backgroundColor,
            padding: marginPt,
          }}
        >
          <BackgroundPdf styles={s} />
          {headerNode}
          {sections}
        </Page>
      </Document>
    );
  }

  // Two-column layout
  const [ratio0, ratio1] = config.columnRatio ?? [0.35, 0.65];
  const sidebarBg = secondaryColor + "10";

  const col0Sections = col0Instances.map((instance) => renderSection(instance, true));
  const col1Sections = col1Instances.map((instance) => renderSection(instance, false));

  return (
    <Document>
      <Page
        size={pageFormat}
        style={{
          fontFamily,
          fontSize,
          color: textColor,
          backgroundColor,
        }}
      >
        <BackgroundPdf styles={s} />

        {/* Header spans full width */}
        {headerNode && (
          <View style={{ padding: marginPt, paddingBottom: marginPt * 0.5 }}>
            {headerNode}
          </View>
        )}

        {/* Two-column body */}
        <View style={{ flexDirection: "row", alignItems: "stretch" }}>
          {/* Sidebar (column 0) */}
          <View
            style={{
              width: `${ratio0 * 100}%`,
              backgroundColor: sidebarBg,
              padding: marginPt * 0.7,
            }}
          >
            {col0Sections}
          </View>

          {/* Main column (column 1) */}
          <View
            style={{
              width: `${ratio1 * 100}%`,
              padding: marginPt * 0.7,
            }}
          >
            {col1Sections}
          </View>
        </View>
      </Page>
    </Document>
  );
};
