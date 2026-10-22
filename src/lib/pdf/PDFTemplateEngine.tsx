import {
  Defs,
  Document,
  Image,
  LinearGradient,
  Link,
  Page,
  Rect,
  Stop,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
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

import { registerPDFFont } from "./fonts";
import {
  borderTint,
  fitLabel,
  getPagePt,
  ResolvedPDFStyles,
  withAlpha,
} from "./resolveStyles";
import { PDF_SECTION_REGISTRY } from "./sections";
import { PDFTemplateProps } from "./templates/ModernMinimalPDF";
import { SectionGroup } from "./templates/shared/SectionGroup";

// "Georgia" resolves to the embedded, Georgia-metric Gelasio (registry.ts
// `LEGACY_FONT_MAP`), the same face the DOM's serif headings get. Never pass
// the literal "Georgia" as a fontFamily: it isn't registered with react-pdf.
const SERIF_HEADING_FONT_FAMILY = registerPDFFont("Georgia");

const stripProtocol = (url: string) =>
  url.replace(/^https?:\/\//i, "").replace(/^www\./i, "");

const withProtocol = (url: string) =>
  /^https?:\/\//i.test(url) ? url : `https://${url}`;

/**
 * Contact items as separate wrapping `Text`/`Link` children (separated by
 * " • ") so long URLs wrap inside narrow boxes instead of overflowing.
 */
function ContactLine({
  header,
  color,
  fontSize,
  centered,
  width,
}: {
  header: ResumeJSON["header"];
  color: string;
  fontSize: number;
  centered?: boolean;
  /** Available width in pt; URL labels longer than this are shortened. */
  width: number;
}) {
  const items: { label: string; href?: string }[] = [
    header.email
      ? { label: header.email, href: `mailto:${header.email}` }
      : null,
    header.phone ? { label: header.phone } : null,
    header.location ? { label: header.location } : null,
    header.linkedin
      ? {
          label: stripProtocol(header.linkedin),
          href: withProtocol(header.linkedin),
        }
      : null,
    header.github
      ? {
          label: stripProtocol(header.github),
          href: withProtocol(header.github),
        }
      : null,
    header.website
      ? {
          label: stripProtocol(header.website),
          href: withProtocol(header.website),
        }
      : null,
    header.workAuthorization ? { label: header.workAuthorization } : null,
    header.nationality ? { label: header.nationality } : null,
    header.dateOfBirth ? { label: header.dateOfBirth } : null,
  ].filter((i): i is { label: string; href?: string } => i !== null);

  const textStyle = { fontSize, color, maxWidth: "100%" } as const;
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        // Full width even inside an `alignItems: "center"` parent: a
        // shrink-to-fit wrapping row is laid out at its unwrapped width,
        // which overflows and breaks react-pdf's page-fit maths (pushed
        // elegant-timeline's whole first section to page 2).
        alignSelf: "stretch",
        justifyContent: centered ? "center" : "flex-start",
      }}
    >
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 ? (
            <Text style={{ ...textStyle, marginHorizontal: fontSize * 0.4 }}>
              •
            </Text>
          ) : null}
          {item.href ? (
            <Link
              src={item.href}
              style={{ ...textStyle, textDecoration: "none" }}
            >
              {fitLabel(item.label, width, fontSize)}
            </Link>
          ) : (
            <Text style={textStyle}>{item.label}</Text>
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

// ── Section Heading Components (styled per heading type) ────────────────────

const SectionHeading = memo(function SectionHeading({
  title,
  s,
  headingStyle,
  isSidebar,
  isSolidSidebar,
  smallCaps,
  centered,
}: {
  title: string;
  s: ResolvedPDFStyles;
  headingStyle: HeadingStyle;
  isSidebar?: boolean;
  isSolidSidebar?: boolean;
  smallCaps?: boolean;
  centered?: boolean;
}) {
  const {
    primaryColor,
    secondaryColor,
    accentColor,
    backgroundColor,
    fontFamily,
    headingFontSize,
  } = s;
  // Spec: heading margin-top 0, margin-bottom 4.5pt; centered headings are
  // centered for every style (DOM: `justify-center text-center`).
  const textAlign = centered ? ("center" as const) : undefined;

  // A `sidebarFill: "solid"` sidebar remaps primary/secondary/accent to
  // `backgroundColor` (light-on-dark text) — a heading border in that same
  // flat color is invisible against the text, so it needs a translucent
  // variant instead. Mirrors DOM's `theme.backgroundColor + "60"` override
  // for `isSolidSidebarColumn` (TemplateEngine.tsx:173-174), which applies
  // regardless of heading style, not just "accent-rule". `borderTint`, not
  // `withAlpha` — this feeds `borderColor`/`border*Color` props, and an
  // `rgba(...)` string there gets misparsed by react-pdf/pdfkit into a
  // wildly wrong (often red- or green-dominant) color. See borderTint's
  // doc comment in resolveStyles.ts.
  const sidebarBorderColor =
    isSidebar && isSolidSidebar ? borderTint(backgroundColor, "60") : undefined;

  const isUppercase = headingStyle === "uppercase";
  const isBar = headingStyle === "bar";
  const isSerif = headingStyle === "serif";
  const isPlain = headingStyle === "plain";
  const isAccentRule = headingStyle === "accent-rule";
  const isRuleAbove = headingStyle === "rule-above";
  const isBoxed = headingStyle === "boxed";
  // ponytail: @react-pdf has no reliable fontVariant: small-caps support, so
  // approximate it with an uppercase title at a slightly reduced size.
  const displayTitle = smallCaps ? title.toUpperCase() : title;

  // Spec: `uppercase` and `serif` draw no rule (DOM wins).
  if (isUppercase) {
    return (
      <View style={{ marginTop: 0, marginBottom: s.sp(4.5) }}>
        <Text
          style={{
            fontFamily,
            fontSize: headingFontSize,
            fontWeight: 600,
            letterSpacing: 0.5,
            textAlign,
            color: primaryColor,
          }}
        >
          {title.toUpperCase()}
        </Text>
      </View>
    );
  }

  // Spec: bar is primaryColor, 3pt, unscaled.
  if (isBar) {
    return (
      <View
        style={{
          marginTop: 0,
          marginBottom: s.sp(4.5),
          borderLeftWidth: 3,
          borderLeftColor: sidebarBorderColor ?? primaryColor,
          paddingLeft: s.sp(6),
        }}
      >
        <Text
          style={{
            fontFamily,
            fontSize: headingFontSize,
            fontWeight: 600,
            textAlign,
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
      <View style={{ marginTop: 0, marginBottom: s.sp(4.5) }}>
        <Text
          style={{
            fontFamily: SERIF_HEADING_FONT_FAMILY,
            fontSize: smallCaps ? headingFontSize - 1 : headingFontSize,
            fontWeight: 600,
            fontStyle: "italic",
            letterSpacing: smallCaps ? 1 : 0,
            textAlign,
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
          marginTop: 0,
          marginBottom: s.sp(4.5),
          borderBottomWidth: 2,
          borderBottomColor: sidebarBorderColor ?? accentColor,
          paddingBottom: s.sp(3),
        }}
      >
        <Text
          style={{
            fontFamily,
            fontSize: headingFontSize,
            fontWeight: 600,
            textAlign,
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
      <View style={{ marginTop: 0, marginBottom: s.sp(4.5) }}>
        <Text
          style={{
            fontFamily,
            fontSize: headingFontSize,
            fontWeight: 600,
            textAlign,
            color: primaryColor,
          }}
        >
          {title}
        </Text>
      </View>
    );
  }

  if (isRuleAbove) {
    return (
      <View
        style={{
          marginTop: 0,
          marginBottom: s.sp(4.5),
          borderTopWidth: 1,
          borderTopColor:
            sidebarBorderColor ?? borderTint(secondaryColor, "60"),
          paddingTop: s.sp(6),
        }}
      >
        <Text
          style={{
            fontFamily,
            fontSize: headingFontSize,
            fontWeight: 600,
            letterSpacing: 1.5,
            textAlign,
            color: primaryColor,
          }}
        >
          {title.toUpperCase()}
        </Text>
      </View>
    );
  }

  if (isBoxed) {
    return (
      <View
        style={{
          marginTop: 0,
          marginBottom: s.sp(4.5),
          borderWidth: 1,
          borderColor: sidebarBorderColor ?? borderTint(secondaryColor, "60"),
          paddingVertical: s.sp(3),
          paddingHorizontal: s.sp(6),
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily,
            fontSize: headingFontSize,
            fontWeight: 600,
            letterSpacing: 1,
            textAlign: "center",
            color: primaryColor,
          }}
        >
          {title.toUpperCase()}
        </Text>
      </View>
    );
  }

  // default: underline
  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: sidebarBorderColor ?? secondaryColor,
        paddingBottom: s.sp(3),
        marginTop: 0,
        marginBottom: s.sp(4.5),
      }}
    >
      <Text
        style={{
          fontFamily,
          fontSize: headingFontSize,
          fontWeight: 600,
          textAlign,
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
    primaryColor,
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
  const contentWidthPt = getPagePt(pageFormat).w - 2 * marginPt;
  const contactNode = (
    color: string,
    centered?: boolean,
    width = contentWidthPt
  ) => (
    <ContactLine
      header={resume.header}
      color={color}
      fontSize={smallFontSize}
      centered={centered}
      width={width}
    />
  );
  const photoSizePt = s.sp(60);
  const photoShape = config.photoShape;
  const photoFrameStyle = config.photoFrame;
  // ponytail: react-pdf has no box-shadow support, so "shadow" frames
  // approximate elevation with a thin hairline border instead of a real shadow.
  const photoFrameBorder =
    photoFrameStyle === "none"
      ? {}
      : photoFrameStyle === "shadow"
        ? { borderWidth: 0.75, borderColor: borderTint(textColor, "33") }
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
          marginBottom: s.sp(3),
        }}
      >
        {resume.header.name}
      </Text>
      {resume.header.headline ? (
        <Text
          style={{ fontSize, color: backgroundColor, marginBottom: s.sp(3) }}
        >
          {resume.header.headline}
        </Text>
      ) : null}
      {contactNode(backgroundColor)}
    </View>
  );

  const plainContent = (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: nameFontSize,
          fontWeight: nameFontWeight,
          color: primaryColor,
          marginBottom: s.sp(3),
        }}
      >
        {resume.header.name}
      </Text>
      {resume.header.headline ? (
        <Text style={{ fontSize, color: accentColor, marginBottom: s.sp(3) }}>
          {resume.header.headline}
        </Text>
      ) : null}
      {contactNode(secondaryColor)}
    </View>
  );

  const leftAccentContent = (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: nameFontSize,
          fontWeight: nameFontWeight,
          color: primaryColor,
          marginBottom: s.sp(3),
        }}
      >
        {resume.header.name}
      </Text>
      {resume.header.headline ? (
        <Text style={{ fontSize, color: accentColor, marginBottom: s.sp(3) }}>
          {resume.header.headline}
        </Text>
      ) : null}
      {contactNode(secondaryColor)}
    </View>
  );

  const minimalContent = (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: nameFontSize,
          fontWeight: nameFontWeight,
          color: primaryColor,
          marginBottom: s.sp(2),
        }}
      >
        {resume.header.name}
      </Text>
      {/* Stacked under the name, like the DOM minimal header. */}
      {resume.header.headline ? (
        <Text style={{ fontSize, color: accentColor, marginBottom: s.sp(3) }}>
          {resume.header.headline}
        </Text>
      ) : null}
      {contactNode(secondaryColor)}
    </View>
  );

  const underlineContent = (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontSize: nameFontSize,
          fontWeight: nameFontWeight,
          color: primaryColor,
          marginBottom: s.sp(3),
        }}
      >
        {resume.header.name}
      </Text>
      {resume.header.headline ? (
        <Text style={{ fontSize, color: accentColor, marginBottom: s.sp(3) }}>
          {resume.header.headline}
        </Text>
      ) : null}
      {contactNode(secondaryColor)}
    </View>
  );

  // react-pdf/PDFKit has no CSS `background: linear-gradient(...)` shorthand
  // — a plain View style silently drops it and paints no fill at all, which
  // left "gradient" headers with an invisible box (white header text on a
  // transparent/white background). A real gradient needs an <Svg> layer with
  // <LinearGradient>/<Rect>, the same pattern BackgroundPdf.tsx already uses
  // for page backgrounds: absolutely positioned behind the header content,
  // sized via a 0–1 viewBox so it stretches to whatever the header's final
  // layout box turns out to be.
  const headerGradientFill =
    headerStyle === "gradient" ? (
      <Svg
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="headerGradient" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={s.primaryColor} />
            <Stop offset="100%" stopColor={accentColor} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={1} height={1} fill="url(#headerGradient)" />
      </Svg>
    ) : null;

  const headerNode = headerHidden ? null : isFilled ? (
    // DOM's equivalent fill (`px-6 pt-6 rounded-md` on the filled header,
    // see TemplateEngine.tsx) is asymmetric: top/side padding is double the
    // bottom padding (`pb-3` vs `pt-6`/implicit `px-6`). PDF previously used
    // a uniform `padding: marginPt * 0.6`, reading as extra bottom padding.
    <View
      style={{
        position: "relative",
        marginBottom: s.sp(18),
        borderRadius: 4,
        overflow: "hidden",
        paddingTop: marginPt * 0.6,
        paddingLeft: marginPt * 0.6,
        paddingRight: marginPt * 0.6,
        paddingBottom: marginPt * 0.3,
        flexDirection: "row",
        alignItems: "center",
        gap: s.sp(10),
        ...(headerStyle === "band" ? { backgroundColor: s.primaryColor } : {}),
      }}
    >
      {headerGradientFill}
      {bandContent}
      {photoImage}
    </View>
  ) : headerStyle === "left-accent" ? (
    <View
      style={{
        marginBottom: s.sp(18),
        paddingLeft: s.sp(10),
        borderLeftWidth: s.sp(4),
        borderLeftColor: s.accentColor,
        flexDirection: "row",
        alignItems: "center",
        gap: s.sp(10),
      }}
    >
      {leftAccentContent}
      {photoImage}
    </View>
  ) : headerStyle === "centered" ? (
    // academic-serif — DOM's `border-b-2` rule (TemplateEngine.tsx:348-364)
    // isn't excluded for "centered", so it gets the same bottom rule as the
    // default/underline fallback below; PDF was missing it.
    <View
      style={{
        marginBottom: s.sp(9),
        paddingBottom: s.sp(9),
        borderBottomWidth: 2,
        borderBottomColor: s.primaryColor,
        alignItems: "center",
      }}
    >
      {photoImage ? (
        <View style={{ marginBottom: s.sp(6) }}>{photoImage}</View>
      ) : null}
      <Text
        style={{
          fontSize: nameFontSize,
          fontWeight: nameFontWeight,
          color: primaryColor,
          marginBottom: s.sp(3),
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
            marginBottom: s.sp(3),
            textAlign: "center",
          }}
        >
          {resume.header.headline}
        </Text>
      ) : null}
      {contactNode(secondaryColor, true)}
    </View>
  ) : headerStyle === "minimal" ? (
    <View
      style={{
        marginBottom: s.sp(18),
        flexDirection: "row",
        alignItems: "center",
        gap: s.sp(10),
      }}
    >
      {minimalContent}
      {photoImage}
    </View>
  ) : headerStyle === "plain" ? (
    <View
      style={{
        marginBottom: s.sp(18),
        flexDirection: "row",
        alignItems: "center",
        gap: s.sp(10),
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
        marginBottom: s.sp(18),
        borderWidth: 1,
        borderColor: borderTint(secondaryColor, "40"),
        borderRadius: 3,
        padding: s.sp(12),
      }}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", gap: s.sp(10) }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: nameFontSize,
              fontWeight: nameFontWeight,
              color: primaryColor,
              marginBottom: s.sp(3),
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
          borderTopColor: borderTint(secondaryColor, "40"),
          marginTop: s.sp(6),
          paddingTop: s.sp(6),
        }}
      >
        {contactNode(secondaryColor)}
      </View>
    </View>
  ) : headerStyle === "split" ? (
    // two-tone: left ~60% solid primaryColor (name/headline in
    // backgroundColor), right ~40% tinted accentColor for the contact stack
    // + photo. DOM's wrapper additionally carries a `pb-3` *outside* both
    // filled blocks (the shared `mb-5 pb-3` base class, see
    // TemplateEngine.tsx's `headerWrapperClassName`) — PDF had no equivalent,
    // so the two filled blocks visually ran right up against
    // `marginBottom`. Spec: header → first section is exactly sp(18), so the
    // outer bottom gap is folded into `marginBottom`. `overflow: hidden` +
    // radius 4 clips the inner colored blocks to the rounded corners.
    <View
      style={{
        marginBottom: s.sp(18),
        flexDirection: "row",
        borderRadius: 4,
        overflow: "hidden",
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
            marginBottom: s.sp(3),
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
          gap: s.sp(8),
        }}
      >
        <View style={{ flex: 1 }}>
          {contactNode(
            secondaryColor,
            false,
            contentWidthPt * 0.4 -
              marginPt -
              (photoImage ? photoSizePt + s.sp(8) : 0)
          )}
        </View>
        {photoImage}
      </View>
    </View>
  ) : headerStyle === "overline" ? (
    // european-modern: small letterspaced headline above a light-weight
    // name — mirrors DOM's `isOverline` flip of `{headlineNode}{nameNode}`
    // (TemplateEngine.tsx).
    <View
      style={{
        marginBottom: s.sp(9),
        paddingBottom: s.sp(9),
        flexDirection: "row",
        alignItems: "center",
        gap: s.sp(10),
      }}
    >
      <View style={{ flex: 1 }}>
        {resume.header.headline ? (
          <Text
            style={{
              fontSize: smallFontSize,
              color: accentColor,
              marginBottom: s.sp(3),
              letterSpacing: 1.5,
              textTransform: "uppercase",
            }}
          >
            {resume.header.headline}
          </Text>
        ) : null}
        <Text
          style={{
            fontSize: nameFontSize,
            fontWeight: nameFontWeight,
            color: primaryColor,
            marginBottom: s.sp(3),
          }}
        >
          {resume.header.name}
        </Text>
        {contactNode(secondaryColor)}
      </View>
      {photoImage}
    </View>
  ) : (
    // Default/"underline" fallback (business-professional) — DOM's
    // `headerWrapperClassName` (TemplateEngine.tsx:348-363) adds `border-b-2`
    // to every header variant except filled/left-accent/plain/boxed/split,
    // so this fallback needs the same bottom rule the PDF was missing.
    <View
      style={{
        marginBottom: s.sp(9),
        paddingBottom: s.sp(9),
        borderBottomWidth: 2,
        borderBottomColor: s.primaryColor,
        flexDirection: "row",
        alignItems: "center",
        gap: s.sp(10),
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
  // covers every color they draw from theme, plus `textColor` (below) for
  // section body text — most section `Text`s set `color` explicitly (e.g.
  // `PdfTableRow`'s label in `pdf/sections.tsx`), so inheriting `color` from
  // the sidebar container alone isn't enough; `s.textColor` is the actual
  // remaining leak the old comment here (which referenced "Cluster 2" and a
  // nonexistent hardcoded-gray-literal issue) missed.
  //
  // Latent trap: this also remaps `accentColor`/`secondaryColor` to
  // `backgroundColor`, which feeds `withAlpha(accentColor, "1a")` (chips) and
  // `withAlpha(secondaryColor, "40")` (table) elsewhere — a near-invisible
  // white-on-primary tint if a solid sidebar ever uses those skill styles.
  // tech-sidebar uses `list` today so it isn't hit; left as a comment rather
  // than building tint-aware machinery for a case that doesn't occur yet.
  const isSolidSidebar = config.sidebarFill === "solid";
  const sidebarStyles: ResolvedPDFStyles = isSolidSidebar
    ? {
        ...s,
        primaryColor: backgroundColor,
        secondaryColor: backgroundColor,
        accentColor: backgroundColor,
        textColor: backgroundColor,
      }
    : s;

  // ── Helper: Render section with heading ──────────────────────────────────
  const renderSection = (
    instance: { id: string; type: string; title: string },
    isSidebar = false,
    showDivider = false,
    first = false
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
        isSolidSidebar={isSolidSidebar}
        smallCaps={config.headingSmallCaps}
        centered={config.headingAlign === "center"}
      />
    );

    // Mirrors DOM's `<hr className="mb-4">` (secondaryColor + "30") drawn
    // above each section heading except the first in its column.
    const divider = showDivider ? (
      <View
        style={{
          borderTopWidth: 0.75,
          borderTopColor: borderTint(secondaryColor, "30"),
          marginBottom: s.sp(12),
        }}
      />
    ) : null;

    return (
      // Gap as marginTop on every section but its column's first: react-pdf
      // counts a View's marginBottom when deciding whether to break before
      // it, so a section ending within `sectionGap` of the page bottom was
      // pushed whole onto the next page (elegant-timeline page 1 left empty).
      <View key={instance.id} style={{ marginTop: first ? 0 : s.sectionGap }}>
        {divider}
        <SectionGroup heading={heading}>{content}</SectionGroup>
      </View>
    );
  };

  // ── Render columns ──────────────────────────────────────────────────────
  if (config.columns === 1) {
    // Single-column layout
    const sections = col0Instances.map((instance, i) =>
      renderSection(instance, false, config.sectionDivider && i > 0, i === 0)
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

  const col0Sections = col0Instances.map((instance, i) =>
    renderSection(instance, true, config.sectionDivider && i > 0, i === 0)
  );
  const col1Sections = col1Instances.map((instance, i) =>
    renderSection(instance, false, config.sectionDivider && i > 0, i === 0)
  );

  // Horizontal insets mirror the DOM engine's geometry (TemplateEngine.tsx):
  // `outerPadX` (page edge → column text) is the full margin, `gutterX`
  // (between the two columns) is a fraction of it — PDF previously used a
  // uniform `marginPt * 0.7` for both, putting sidebar text ~11pt closer to
  // the page edge than the preview shows.
  const outerPadX = marginPt;
  const gutterX = marginPt * 0.6;
  // Vertical page margin (marginPt top/bottom on EVERY page) lives on the
  // `<Page>` itself, so the columns carry only horizontal padding.

  const sidebarView = (
    <View
      key="sidebar"
      style={{
        width: `${ratio0 * 100}%`,
        // No backgroundColor here — a "solid" fill is painted full page
        // height by the fixed `sidebarFillView` below instead (see its
        // comment). Text color still needs the contrast override.
        color: isSolidSidebar ? backgroundColor : undefined,
        paddingLeft: sidebarRight ? gutterX : outerPadX,
        paddingRight: sidebarRight ? outerPadX : gutterX,
      }}
    >
      {col0Sections}
    </View>
  );

  // Paints a "solid" or "tint" sidebar fill as a `fixed` full-page-height
  // layer behind the content, the same pattern as `BackgroundPdf` — instead
  // of relying on `alignItems: "stretch"` to match the taller column's
  // height, which left the fill short of the page bottom on short content
  // and didn't repeat per page on multi-page exports.
  const { w: pagePtW, h: pagePtH } = getPagePt(pageFormat);
  const sidebarFillView = sidebarBg && (
    <View
      key="sidebar-fill"
      fixed
      style={{
        position: "absolute",
        top: 0,
        left: sidebarRight ? undefined : 0,
        right: sidebarRight ? 0 : undefined,
        width: ratio0 * pagePtW,
        height: pagePtH,
        backgroundColor: sidebarBg,
      }}
    />
  );

  const mainView = (
    <View
      key="main"
      style={{
        width: `${ratio1 * 100}%`,
        paddingLeft: sidebarRight ? outerPadX : gutterX,
        paddingRight: sidebarRight ? gutterX : outerPadX,
      }}
    >
      {/* DOM renders `headerNode` bare here (TemplateEngine.tsx:814) — no
          extra wrapper margin, since `headerNode` already owns its own
          `marginBottom`. The removed wrapper View previously double-counted
          that gap on top of headerNode's own spacing. */}
      {headerSpansMain && headerNode}
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
          paddingTop: marginPt,
          paddingBottom: marginPt,
        }}
      >
        <BackgroundPdf styles={s} />
        {sidebarFillView}

        {/* Header spans full width, unless headerSpan: "main" renders it
            inside the main column instead (see mainView above).
            `paddingBottom: 0` — headerNode already carries its own
            `marginBottom`; the previous `marginPt * 0.5` here double-counted
            that gap (DOM's equivalent wrapper is `padding: marginPx,
            paddingBottom: 0`, see TemplateEngine.tsx:830). */}
        {!headerSpansMain && headerNode && (
          <View style={{ paddingHorizontal: marginPt }}>{headerNode}</View>
        )}

        {/* Two-column body. The sidebar's own background is now the fixed
            `sidebarFillView` layer above, so this row no longer needs
            `alignItems: "stretch"` to fake a full-height fill — which also
            used to fight react-pdf's per-page pagination on multi-page
            resumes (each `wrap={false}` entry paginates independently). */}
        <View style={{ flexDirection: "row" }}>
          {sidebarRight ? [mainView, sidebarView] : [sidebarView, mainView]}
        </View>
      </Page>
    </Document>
  );
};
