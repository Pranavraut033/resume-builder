import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import React, { memo } from "react";

import { buildSections } from "@/components/job-v2/engine/buildSections";
import { photoRadius } from "@/components/job-v2/engine/photoFrame";
import { resolveTemplateConfig } from "@/components/job-v2/engine/templates";
import {
  ResolvedTemplateConfig,
  TemplateConfig,
} from "@/components/job-v2/engine/types";
import BackgroundPdf from "@/lib/backgrounds/BackgroundPdf";
import { HeadingStyle } from "@/types/customization";
import { ResumeJSON, getSectionLayout } from "@/types/resume";

import { ResolvedPDFStyles, withAlpha } from "./resolveStyles";
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
  headingStyle: HeadingStyle;
  isSidebar?: boolean;
  smallCaps?: boolean;
}) {
  const {
    primaryColor,
    secondaryColor,
    accentColor,
    fontFamily,
    headingFontSize,
    fontSize,
  } = s;

  const isUppercase = headingStyle === "uppercase";
  const isBar = headingStyle === "bar";
  const isSerif = headingStyle === "serif";
  const isPlain = headingStyle === "plain";
  const isAccentRule = headingStyle === "accent-rule";
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

  if (isAccentRule) {
    return (
      <View
        style={{
          marginBottom: 5,
          marginTop: 10,
          borderBottomWidth: 2,
          borderBottomColor: accentColor,
          paddingBottom: 2,
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

  if (isPlain) {
    return (
      <View style={{ marginBottom: 5, marginTop: 10 }}>
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

const NAME_FONT_WEIGHT: Record<ResolvedTemplateConfig["nameWeight"], number> = {
  light: 300,
  normal: 400,
  bold: 700,
};

/**
 * PDF Template Engine — mirrors TemplateEngine.tsx for DOM rendering.
 * Uses buildSections() to get ordered/hidden/custom-aware section list,
 * then renders each via PDF_SECTION_REGISTRY builders, laid out per config.
 */
export const PDFTemplateEngine: React.FC<PDFTemplateEngineProps> = ({
  resume,
  styles: s,
  config: rawConfig,
}) => {
  const config = resolveTemplateConfig(rawConfig);
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
  const headerStyle = config.header;
  const isFilled = headerStyle === "band" || headerStyle === "gradient";
  const contactLine = buildContactLine(resume.header);
  const photoSizePt = 60;
  const photoShape = config.photoShape;
  const photoFrameStyle = config.photoFrame;
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

  const nameFontWeight = NAME_FONT_WEIGHT[config.nameWeight];

  const bandContent = (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: nameFontSize,
          fontWeight: nameFontWeight,
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

  const plainContent = (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: nameFontSize,
          fontWeight: nameFontWeight,
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
      <Text style={{ fontSize: smallFontSize, color: secondaryColor }}>
        {contactLine}
      </Text>
    </View>
  );

  const leftAccentContent = (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: nameFontSize,
          fontWeight: nameFontWeight,
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
      <Text style={{ fontSize: smallFontSize, color: secondaryColor }}>
        {contactLine}
      </Text>
    </View>
  );

  const minimalContent = (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: nameFontSize,
          fontWeight: nameFontWeight,
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
      <Text style={{ fontSize: smallFontSize, color: secondaryColor }}>
        {contactLine}
      </Text>
    </View>
  );

  const underlineContent = (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: nameFontSize,
          fontWeight: nameFontWeight,
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
      <Text style={{ fontSize: smallFontSize, color: secondaryColor }}>
        {contactLine}
      </Text>
    </View>
  );

  const filledBackground =
    headerStyle === "gradient"
      ? {
          background: `linear-gradient(135deg, ${s.primaryColor}, ${accentColor})`,
        }
      : { backgroundColor: s.primaryColor };

  const headerNode = headerHidden ? null : isFilled ? (
    <View
      style={{
        marginBottom: 14,
        padding: marginPt * 0.6,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        ...filledBackground,
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
          fontWeight: nameFontWeight,
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
          color: secondaryColor,
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
  ) : headerStyle === "plain" ? (
    <View
      style={{
        marginBottom: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      {plainContent}
      {photoImage}
    </View>
  ) : headerStyle === "boxed" ? (
    // Echoes entryStyle "table"'s bordered look (bjet-professional): a 1px
    // box around the whole header, name row separated from the contact row
    // by a bottom rule.
    <View
      style={{
        marginBottom: 14,
        borderWidth: 1,
        borderColor: withAlpha(secondaryColor, "40"),
        borderRadius: 3,
        padding: marginPt * 0.5,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: nameFontSize,
              fontWeight: nameFontWeight,
              color: textColor,
              marginBottom: 3,
            }}
          >
            {resume.header.name}
          </Text>
          {resume.header.headline ? (
            <Text style={{ fontSize, color: accentColor }}>
              {resume.header.headline}
            </Text>
          ) : null}
        </View>
        {photoImage}
      </View>
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: withAlpha(secondaryColor, "40"),
          marginTop: 6,
          paddingTop: 6,
        }}
      >
        <Text style={{ fontSize: smallFontSize, color: secondaryColor }}>
          {contactLine}
        </Text>
      </View>
    </View>
  ) : headerStyle === "split" ? (
    // two-tone: left ~60% solid primaryColor (name/headline in
    // backgroundColor), right ~40% tinted accentColor for the contact stack
    // + photo.
    <View
      style={{
        marginBottom: 14,
        flexDirection: "row",
        borderRadius: 3,
      }}
    >
      <View
        style={{
          width: "60%",
          backgroundColor: s.primaryColor,
          padding: marginPt * 0.5,
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: nameFontSize,
            fontWeight: nameFontWeight,
            color: backgroundColor,
            marginBottom: 3,
          }}
        >
          {resume.header.name}
        </Text>
        {resume.header.headline ? (
          <Text style={{ fontSize, color: backgroundColor }}>
            {resume.header.headline}
          </Text>
        ) : null}
      </View>
      <View
        style={{
          width: "40%",
          backgroundColor: withAlpha(accentColor, "1a"),
          padding: marginPt * 0.5,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Text
          style={{ fontSize: smallFontSize, color: secondaryColor, flex: 1 }}
        >
          {contactLine}
        </Text>
        {photoImage}
      </View>
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

  // A `sidebarFill: "solid"` sidebar (tech-sidebar) forces its heading/accent
  // colors to `backgroundColor` so they read light-on-dark instead of the
  // usual primary/secondary/accent colors. Substituting these fields on the
  // `styles` bag handed to both `SectionHeading` and the section builders
  // covers every color they draw from theme — everything except the couple
  // of hardcoded gray literals `pdf/sections.tsx` uses for plain body text,
  // which is Cluster 2's file and out of scope here.
  const isSolidSidebar = config.sidebarFill === "solid";
  const sidebarStyles: ResolvedPDFStyles = isSolidSidebar
    ? {
        ...s,
        primaryColor: backgroundColor,
        secondaryColor: backgroundColor,
        accentColor: backgroundColor,
      }
    : s;

  // ── Helper: Render section with heading ──────────────────────────────────
  const renderSection = (
    instance: { id: string; type: string; title: string },
    isSidebar = false
  ) => {
    const builder = PDF_SECTION_REGISTRY[instance.type];
    if (!builder) return null;

    const sectionStyles = isSidebar ? sidebarStyles : s;

    const content = builder({
      resume,
      instance,
      styles: sectionStyles,
      config,
    });

    if (!content) return null;

    const headingStyleForColumn =
      isSidebar && config.columns === 2
        ? config.headingSidebar
        : config.heading;

    const heading = (
      <SectionHeading
        title={instance.title}
        s={sectionStyles}
        headingStyle={headingStyleForColumn}
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
  const sidebarBg =
    config.sidebarFill === "solid"
      ? s.primaryColor
      : config.sidebarFill === "tint"
        ? withAlpha(secondaryColor, "1a")
        : undefined;
  // `sidebarSide: "right"` swaps which physical side the sidebar renders on
  // (creative-modern); `headerSpan: "main"` renders the header inside the
  // main column instead of full page width, so a `sidebarFill: "solid"`
  // sidebar (tech-sidebar) can stretch the full column height uninterrupted
  // by it — `alignItems: "stretch"` on the row below makes the sidebar's
  // background match whichever column (header + content, or content alone)
  // ends up taller.
  const sidebarRight = config.sidebarSide === "right";
  const headerSpansMain = config.headerSpan === "main";

  const col0Sections = col0Instances.map((instance) =>
    renderSection(instance, true)
  );
  const col1Sections = col1Instances.map((instance) =>
    renderSection(instance, false)
  );

  const sidebarView = (
    <View
      key="sidebar"
      style={{
        width: `${ratio0 * 100}%`,
        backgroundColor: sidebarBg,
        padding: marginPt * 0.7,
      }}
    >
      {col0Sections}
    </View>
  );

  // Extra padding on the side adjacent to the sidebar forms the gutter
  // against it, since react-pdf Views have no column gap.
  const mainView = (
    <View
      key="main"
      style={{
        width: `${ratio1 * 100}%`,
        paddingTop: marginPt * 0.7,
        paddingBottom: marginPt * 0.7,
        paddingLeft: sidebarRight ? marginPt * 0.7 : marginPt,
        paddingRight: sidebarRight ? marginPt : marginPt * 0.7,
      }}
    >
      {headerSpansMain && headerNode && (
        <View style={{ marginBottom: marginPt * 0.5 }}>{headerNode}</View>
      )}
      {col1Sections}
    </View>
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

        {/* Header spans full width, unless headerSpan: "main" renders it
            inside the main column instead (see mainView above). */}
        {!headerSpansMain && headerNode && (
          <View style={{ padding: marginPt, paddingBottom: marginPt * 0.5 }}>
            {headerNode}
          </View>
        )}

        {/* Two-column body */}
        <View style={{ flexDirection: "row", alignItems: "stretch" }}>
          {sidebarRight ? [mainView, sidebarView] : [sidebarView, mainView]}
        </View>
      </Page>
    </Document>
  );
};
