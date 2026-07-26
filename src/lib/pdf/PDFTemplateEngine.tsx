import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import React, { memo } from "react";

import { buildSections } from "@/components/job-v2/engine/buildSections";
import { photoRadius } from "@/components/job-v2/engine/photoFrame";
import { TemplateConfig } from "@/components/job-v2/engine/types";
import BackgroundPdf from "@/lib/backgrounds/BackgroundPdf";
import { ResumeJSON, getSectionLayout } from "@/types/resume";

import { ResolvedPDFStyles } from "./resolveStyles";
import { PDF_SECTION_REGISTRY } from "./sections";
import { PDFTemplateProps } from "./templates/ModernMinimalPDF";
import { SectionGroup } from "./templates/shared/SectionGroup";

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
  smallCaps,
}: {
  title: string;
  s: ResolvedPDFStyles;
  headingStyle: "uppercase" | "underline" | "bar" | "serif";
  isSidebar?: boolean;
  smallCaps?: boolean;
}) {
  const {
    primaryColor,
    secondaryColor,
    fontFamily,
    headingFontSize,
    fontSize,
  } = s;

  const isUppercase = headingStyle === "uppercase";
  const isBar = headingStyle === "bar";
  const isSerif = headingStyle === "serif";
  // ponytail: @react-pdf has no reliable fontVariant: small-caps support, so
  // approximate it with an uppercase title at a slightly reduced size.
  const displayTitle = smallCaps ? title.toUpperCase() : title;

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
            fontSize: smallCaps ? headingFontSize - 1 : headingFontSize,
            fontWeight: 700,
            fontStyle: "italic",
            letterSpacing: smallCaps ? 1 : 0,
            color: primaryColor,
          }}
        >
          {displayTitle}
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
    secondaryColor,
    accentColor,
    textColor,
    backgroundColor,
    fontFamily,
    fontSize,
    smallFontSize,
    nameFontSize,
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
  const headerStyle = config.header ?? "underline";
  const contactLine = buildContactLine(resume.header);
  const photoSizePt = 60;
  const photoShape = config.photoShape ?? "circle";
  const photoFrameStyle = config.photoFrame ?? "ring";
  // ponytail: react-pdf has no box-shadow support, so "shadow" frames
  // approximate elevation with a soft neutral border instead of a real shadow.
  const photoFrameBorder =
    photoFrameStyle === "none"
      ? {}
      : photoFrameStyle === "shadow"
        ? { borderWidth: 3, borderColor: "#d1d5db" }
        : { borderWidth: 2, borderColor: s.primaryColor };
  const photoImage = resume.header.photoDataUrl ? (
    // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image (not next/image's), no alt prop
    <Image
      src={resume.header.photoDataUrl}
      style={{
        width: photoSizePt,
        height: photoSizePt,
        borderRadius: photoRadius(photoShape, photoSizePt),
        ...photoFrameBorder,
      }}
    />
  ) : null;

  const bandContent = (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: nameFontSize,
          fontWeight: 700,
          color: backgroundColor,
          marginBottom: 3,
        }}
      >
        {resume.header.name}
      </Text>
      {resume.header.headline ? (
        <Text style={{ fontSize, color: backgroundColor, marginBottom: 3 }}>
          {resume.header.headline}
        </Text>
      ) : null}
      <Text style={{ fontSize: smallFontSize, color: backgroundColor }}>
        {contactLine}
      </Text>
    </View>
  );

  const leftAccentContent = (
    <View style={{ flex: 1 }}>
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
        {contactLine}
      </Text>
    </View>
  );

  const minimalContent = (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: nameFontSize,
          fontWeight: 700,
          color: textColor,
          marginBottom: 2,
        }}
      >
        {resume.header.name}
        {resume.header.headline ? (
          <Text style={{ fontSize, fontWeight: 400, color: accentColor }}>
            {"  •  "}
            {resume.header.headline}
          </Text>
        ) : null}
      </Text>
      <Text style={{ fontSize: smallFontSize, color: "#6b7280" }}>
        {contactLine}
      </Text>
    </View>
  );

  const underlineContent = (
    <View style={{ flex: 1 }}>
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
        {contactLine}
      </Text>
    </View>
  );

  const headerNode = headerHidden ? null : headerStyle === "band" ? (
    <View
      style={{
        marginBottom: 14,
        backgroundColor: s.primaryColor,
        padding: marginPt * 0.6,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      {bandContent}
      {photoImage}
    </View>
  ) : headerStyle === "left-accent" ? (
    <View
      style={{
        marginBottom: 14,
        paddingLeft: 10,
        borderLeftWidth: 4,
        borderLeftColor: s.accentColor,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      {leftAccentContent}
      {photoImage}
    </View>
  ) : headerStyle === "centered" ? (
    <View style={{ marginBottom: 14, alignItems: "center" }}>
      {photoImage ? (
        <View style={{ marginBottom: 6 }}>{photoImage}</View>
      ) : null}
      <Text
        style={{
          fontSize: nameFontSize,
          fontWeight: 700,
          color: textColor,
          marginBottom: 3,
          textAlign: "center",
        }}
      >
        {resume.header.name}
      </Text>
      {resume.header.headline ? (
        <Text
          style={{
            fontSize,
            color: accentColor,
            marginBottom: 3,
            textAlign: "center",
          }}
        >
          {resume.header.headline}
        </Text>
      ) : null}
      <Text
        style={{
          fontSize: smallFontSize,
          color: "#6b7280",
          textAlign: "center",
        }}
      >
        {contactLine}
      </Text>
    </View>
  ) : headerStyle === "minimal" ? (
    <View
      style={{
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      {minimalContent}
      {photoImage}
    </View>
  ) : (
    <View
      style={{
        marginBottom: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      {underlineContent}
      {photoImage}
    </View>
  );

  // ── Helper: Render section with heading ──────────────────────────────────
  const renderSection = (
    instance: { id: string; type: string; title: string },
    isSidebar = false
  ) => {
    const builder = PDF_SECTION_REGISTRY[instance.type];
    if (!builder) return null;

    const content = builder({
      resume,
      instance,
      styles: s,
      entryStyle: config.entryStyle,
    });

    if (!content) return null;

    const heading = (
      <SectionHeading
        title={instance.title}
        s={s}
        headingStyle={config.heading}
        isSidebar={isSidebar}
        smallCaps={config.headingSmallCaps}
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
          <BackgroundPdf styles={s} offset={marginPt} />
          {headerNode}
          {sections}
        </Page>
      </Document>
    );
  }

  // Two-column layout
  const [ratio0, ratio1] = config.columnRatio ?? [0.35, 0.65];
  const sidebarBg = secondaryColor + "10";

  const col0Sections = col0Instances.map((instance) =>
    renderSection(instance, true)
  );
  const col1Sections = col1Instances.map((instance) =>
    renderSection(instance, false)
  );

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

          {/* Main column (column 1) — extra left padding forms the gutter
              against the sidebar, since react-pdf Views have no column gap. */}
          <View
            style={{
              width: `${ratio1 * 100}%`,
              paddingTop: marginPt * 0.7,
              paddingRight: marginPt * 0.7,
              paddingBottom: marginPt * 0.7,
              paddingLeft: marginPt,
            }}
          >
            {col1Sections}
          </View>
        </View>
      </Page>
    </Document>
  );
};
