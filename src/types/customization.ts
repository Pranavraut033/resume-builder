import { Customization } from "@prisma/client";

import { BackgroundId, VALID_BACKGROUND_IDS } from "@/lib/backgrounds/types";
import { DateFormat, VALID_DATE_FORMATS } from "@/lib/date";
import { ALL_FONT_NAMES } from "@/lib/fonts/registry";

export type { DateFormat } from "@/lib/date";

/**
 * Adapted from Resumify (https://github.com/Afif718/Resumify)
 * Copyright (c) 2025 M. H. A. Afif
 * Licensed under MIT License
 */
export type TemplateType =
  | "tech-sidebar"
  | "business-professional"
  | "modern-minimal"
  | "elegant-timeline"
  | "creative-modern"
  | "bjet-professional"
  | "compact-modern"
  | "two-tone"
  | "academic-serif"
  | "euro-sidebar"
  | "european-modern"
  | "europass-classic"
  | "french-elegant";

/**
 * Cover-letter templates, independent of `TemplateType` (the resume's
 * template). Only the 9 ids with a dedicated cover-letter component (see
 * CoverLetterRenderer.tsx's import list) — notably excludes "euro-sidebar"
 * and the three newer resume-only templates, none of which have one.
 */
export type CoverLetterTemplateType =
  | "modern-minimal"
  | "tech-sidebar"
  | "business-professional"
  | "elegant-timeline"
  | "creative-modern"
  | "bjet-professional"
  | "compact-modern"
  | "two-tone"
  | "academic-serif";

export type PageFormat = "letter" | "a4";
export type FontSize = "small" | "medium" | "large";
export type MarginSize = "narrow" | "normal" | "wide";
export type Leading = "small" | "medium" | "large";

export type ThemeColors = [
  primaryColor: string,
  secondaryColor: string,
  accentColor: string,
  textColor: string,
  backgroundColor: string,
];

export const DEFAULT_COLORS: ThemeColors = [
  "#1d4ed8",
  "#475569",
  "#6d28d9",
  "#1f2937",
  "#ffffff",
];
type PartiallyOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type SanitizedCustomization = PartiallyOptional<
  Customization,
  "id" | "createdAt" | "updatedAt"
>;

export const DEFAULT_CUSTOMIZATION: SanitizedCustomization = {
  template: "modern-minimal",
  pageFormat: "letter",
  fontSize: "medium",
  fontFamily: "Inter",
  lineHeight: "medium",
  colors: DEFAULT_COLORS.join(","),
  marginSize: "normal",
  background: "none",
  dateFormat: "locale",
  themeJson: null,
  fitToPage: false,
  coverLetterTemplate: null,
};

export type Template = {
  id: TemplateType;
  name: string;
  description: string;
  fontFamily: string;
  features: string[];
  bestFor: string;
  colors?: ThemeColors;
  /** Page background pattern applied when this template is selected. */
  background?: BackgroundId;
};

export const AVAILABLE_TEMPLATES: Array<Template> = [
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description:
      "Borderless two-column layout with skill chips and pill-style date badges",
    fontFamily: "Poppins",
    features: ["Two-column layout", "Skill chips", "Pill date badges"],
    bestFor: "Creative professionals, designers, modern companies",
    colors: ["#1d4ed8", "#475569", "#6d28d9", "#1f2937", "#ffffff"],
  },
  {
    id: "tech-sidebar",
    name: "Tech Sidebar",
    description:
      "Full-height dark sidebar rail with a plain bullet skills list",
    fontFamily: "Inter",
    features: [
      "Full-height dark sidebar",
      "Uppercase headings",
      "Plain skills list",
    ],
    bestFor: "Software developers, engineers, technical roles",
    colors: ["#0ea5e9", "#64748b", "#22d3ee", "#0f172a", "#ffffff"],
  },
  {
    id: "creative-modern",
    name: "Creative Modern",
    description:
      "Diagonal gradient header over a right-hand accent sidebar with dot-marker entries",
    fontFamily: "Montserrat",
    features: ["Gradient header", "Right sidebar", "Dot-marker timeline"],
    bestFor: "Creative roles, startups, design-focused companies",
    colors: ["#7c3aed", "#64748b", "#ec4899", "#1f2937", "#ffffff"],
  },
  {
    id: "two-tone",
    name: "Two-Tone",
    description: "Split colour-block header with a tinted two-column body",
    fontFamily: "Poppins",
    features: ["Split colour-block header", "Tinted sidebar", "Skill chips"],
    bestFor: "Marketing, sales, and design-forward roles",
    colors: ["#0f766e", "#57534e", "#f59e0b", "#1c1917", "#ffffff"],
  },
  {
    id: "business-professional",
    name: "Business Professional",
    description:
      "Left-aligned header with a right-side photo, uppercase rules, and justified body text",
    fontFamily: "Georgia",
    features: [
      "Left-aligned header",
      "Justified text",
      "Traditional structure",
    ],
    bestFor: "Corporate positions, management roles, traditional industries",
    colors: ["#334155", "#64748b", "#334155", "#1e293b", "#ffffff"],
  },
  {
    id: "academic-serif",
    name: "Academic",
    description:
      "Centered small-caps serif headings, justified text, and rules between sections",
    fontFamily: "Merriweather",
    features: ["Serif typography", "Small-caps headings", "Section dividers"],
    bestFor: "Academics, researchers, education, legal roles",
    colors: ["#7c2d12", "#57534e", "#7c2d12", "#292524", "#ffffff"],
  },
  {
    id: "elegant-timeline",
    name: "Elegant Timeline",
    description:
      "Fully centered layout with a light-weight name and a connecting timeline rail",
    fontFamily: "Lora",
    features: ["Centered layout", "Timeline rail", "Light-weight name"],
    bestFor: "Experienced professionals, career changers",
    colors: ["#831843", "#78716c", "#831843", "#292524", "#ffffff"],
  },
  {
    id: "bjet-professional",
    name: "BJet Professional",
    description:
      "Boxed header over bordered label/value entry tables, CV-style",
    fontFamily: "Playfair Display",
    features: ["Bordered entry tables", "Boxed header", "Structured CV format"],
    bestFor: "Senior positions, executive roles, premium applications",
    colors: ["#1e3a5f", "#4b5563", "#1e3a5f", "#111827", "#ffffff"],
  },
  {
    id: "compact-modern",
    name: "Compact",
    description: "Dense single-column layout with tight one-line entries",
    fontFamily: "Inter",
    features: ["Compact entries", "Space-efficient", "ATS-friendly"],
    bestFor: "Experienced candidates with lots to fit, ATS submissions",
    colors: ["#1f2937", "#4b5563", "#1f2937", "#111827", "#ffffff"],
  },
  {
    id: "euro-sidebar",
    name: "Euro Sidebar",
    description:
      "Full-height solid sidebar with a banded name header, circular photo, and a stacked skills/languages list — European CV format",
    fontFamily: "Inter",
    features: [
      "Full-height solid sidebar",
      "Banded name header",
      "Stacked skills & languages",
    ],
    bestFor:
      "European/German-style CVs, roles expecting a photo, multilingual candidates",
    colors: ["#2c5f8a", "#5b6b79", "#2c5f8a", "#26303a", "#ffffff"],
  },
  {
    id: "european-modern",
    name: "European Modern",
    description:
      "Light-tint sidebar with a circular photo and summary up top, a small overline headline above a light-weight name, and a dotted date-rail for experience and education entries",
    fontFamily: "Inter",
    features: [
      "Overline headline over light-weight name",
      "Tinted sidebar with photo & summary",
      "Dotted date-rail entries",
    ],
    bestFor:
      "European-format CVs, candidates who want a photo with a soft, modern look",
    colors: ["#1855a0", "#66717b", "#3f6d9c", "#30353a", "#ffffff"],
    background: "corner-dots",
  },
  {
    id: "europass-classic",
    name: "Europass Classic",
    description:
      "Single-column official Europass CV layout — bold small-caps section headings, a right-aligned label column ('Dates', 'Employer', 'Position') against a single divider, and a square framed photo",
    fontFamily: "Arial",
    features: [
      "Official Europass-style layout",
      "Label/value column entries",
      "Small-caps section headings",
    ],
    bestFor:
      "EU institution and government applications, roles expecting the standard Europass format",
    colors: ["#111111", "#555555", "#111111", "#111111", "#ffffff"],
  },
  {
    id: "french-elegant",
    name: "French Elegant",
    description:
      "Minimalist taupe sidebar with a serif-accented centered header, boxed section headings, and a plain date-rail for experience entries — a Parisian, editorial CV look",
    fontFamily: "Cormorant Garamond",
    features: [
      "Centered serif header",
      "Boxed section headings",
      "Taupe sidebar with skills & interests",
    ],
    bestFor:
      "Design, communications, and creative-industry roles wanting an elegant, minimalist CV",
    colors: ["#3a3a3a", "#8a8a8a", "#6b5b4f", "#2b2b2b", "#ffffff"],
  },
];

const COVER_LETTER_TEMPLATE_IDS: CoverLetterTemplateType[] = [
  "modern-minimal",
  "tech-sidebar",
  "business-professional",
  "elegant-timeline",
  "creative-modern",
  "bjet-professional",
  "compact-modern",
  "two-tone",
  "academic-serif",
];

export const AVAILABLE_COVER_LETTER_TEMPLATES: Array<{
  id: CoverLetterTemplateType;
  name: string;
}> = COVER_LETTER_TEMPLATE_IDS.map((id) => ({
  id,
  name: AVAILABLE_TEMPLATES.find((t) => t.id === id)!.name,
}));

export const VALID_COVER_LETTER_TEMPLATE_IDS = new Set(
  AVAILABLE_COVER_LETTER_TEMPLATES.map((t) => t.id)
);

export const AVAILABLE_FONTS = ALL_FONT_NAMES;

const VALID_TEMPLATE_IDS = new Set(
  AVAILABLE_TEMPLATES.map((template) => template.id)
);
export const VALID_FONT_FAMILIES = new Set(AVAILABLE_FONTS);
export const VALID_PAGE_FORMATS: PageFormat[] = ["letter", "a4"];
export const VALID_FONT_SIZES: FontSize[] = ["small", "medium", "large"];
export const VALID_MARGIN_SIZES: MarginSize[] = ["narrow", "normal", "wide"];
export const VALID_LETTER_SPACINGS: Leading[] = ["small", "medium", "large"];

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function validateColors(colors: ThemeColors) {
  if (colors.length !== 5) {
    throw new Error(
      `Invalid number of color values provided. Expected 5 but got ${colors.length}.`
    );
  }

  const hasInvalid = colors.some((color) => !HEX_COLOR_REGEX.test(color));

  if (hasInvalid) {
    throw new Error(
      "Invalid color format detected. Colors must be in hex format (e.g., #RRGGBB)."
    );
  }
}

export function validateCustomization({
  template,
  fontSize,
  pageFormat,
  fontFamily,
  colors,
  marginSize,
  lineHeight,
  background,
  dateFormat,
  themeJson,
  fitToPage,
  coverLetterTemplate,
}: SanitizedCustomization) {
  if (template && !VALID_TEMPLATE_IDS.has(template as TemplateType)) {
    throw new Error("Invalid template selected.");
  }

  if (
    coverLetterTemplate &&
    !VALID_COVER_LETTER_TEMPLATE_IDS.has(
      coverLetterTemplate as CoverLetterTemplateType
    )
  ) {
    throw new Error("Invalid cover letter template selected.");
  }

  if (fontSize && !VALID_FONT_SIZES.includes(fontSize as FontSize)) {
    throw new Error("Invalid font size selected.");
  }

  if (pageFormat && !VALID_PAGE_FORMATS.includes(pageFormat as PageFormat)) {
    throw new Error("Invalid page format selected.");
  }

  if (fontFamily && !VALID_FONT_FAMILIES.has(fontFamily)) {
    throw new Error("Invalid font family selected.");
  }

  if (marginSize && !VALID_MARGIN_SIZES.includes(marginSize as MarginSize)) {
    throw new Error("Invalid margin size selected.");
  }

  if (lineHeight && !VALID_LETTER_SPACINGS.includes(lineHeight as Leading)) {
    throw new Error("Invalid line height selected.");
  }

  if (colors) {
    const colorsSplit = colors.split(",");
    void validateColors(colorsSplit as ThemeColors);
  }

  if (background && !VALID_BACKGROUND_IDS.has(background as BackgroundId)) {
    throw new Error("Invalid background selected.");
  }

  if (dateFormat && !VALID_DATE_FORMATS.includes(dateFormat as DateFormat)) {
    throw new Error("Invalid date format selected.");
  }

  if (fitToPage !== undefined && typeof fitToPage !== "boolean") {
    throw new Error("Invalid fitToPage value.");
  }

  if (themeJson) {
    let theme: ThemeConfig;
    try {
      theme = JSON.parse(themeJson);
    } catch {
      throw new Error("Invalid themeJson: not valid JSON.");
    }
    validateThemeConfig(theme);
  }
}

export const COLOR_PRESETS: Array<{
  name: string;
  hex: string;
  colors: ThemeColors;
}> = [
  {
    name: "Blue",
    hex: "#2563eb",
    colors: ["#1d4ed8", "#475569", "#6d28d9", "#1f2937", "#ffffff"],
  },
  {
    name: "Navy",
    hex: "#1e3a8a",
    colors: ["#1e40af", "#1e3a8a", "#3730a3", "#1f2937", "#ffffff"],
  },
  {
    name: "Green",
    hex: "#15803d",
    colors: ["#15803d", "#166534", "#065f46", "#1f2937", "#ffffff"],
  },
  {
    name: "Purple",
    hex: "#7c3aed",
    colors: ["#7c3aed", "#5b21b6", "#4c1d95", "#1f2937", "#ffffff"],
  },
  {
    name: "Rose",
    hex: "#be123c",
    colors: ["#be123c", "#9f1239", "#881337", "#1f2937", "#ffffff"],
  },
  {
    name: "Teal",
    hex: "#0f766e",
    colors: ["#0f766e", "#134e4a", "#115e59", "#1f2937", "#ffffff"],
  },
  {
    name: "Orange",
    hex: "#c2410c",
    colors: ["#c2410c", "#9a3412", "#7c2d12", "#1f2937", "#ffffff"],
  },
  {
    name: "Charcoal",
    hex: "#374151",
    colors: ["#374151", "#4b5563", "#6b7280", "#1f2937", "#ffffff"],
  },
  {
    name: "Crimson",
    hex: "#dc2626",
    colors: ["#dc2626", "#991b1b", "#7f1d1d", "#1f2937", "#ffffff"],
  },
  {
    name: "Amber",
    hex: "#d97706",
    colors: ["#d97706", "#b45309", "#92400e", "#1f2937", "#ffffff"],
  },
  {
    name: "Emerald",
    hex: "#059669",
    colors: ["#059669", "#047857", "#065f46", "#1f2937", "#ffffff"],
  },
  {
    name: "Cyan",
    hex: "#0891b2",
    colors: ["#0891b2", "#0e7490", "#155e75", "#1f2937", "#ffffff"],
  },
  {
    name: "Indigo",
    hex: "#4f46e5",
    colors: ["#4f46e5", "#4338ca", "#3730a3", "#1f2937", "#ffffff"],
  },
  {
    name: "Fuchsia",
    hex: "#c026d3",
    colors: ["#c026d3", "#a21caf", "#86198f", "#1f2937", "#ffffff"],
  },
  {
    name: "Slate",
    hex: "#475569",
    colors: ["#475569", "#334155", "#1e293b", "#1f2937", "#ffffff"],
  },
  {
    name: "Brown",
    hex: "#78350f",
    colors: ["#78350f", "#5c2a0c", "#451a03", "#1f2937", "#ffffff"],
  },
];

// ── Theme engine ──────────────────────────────────────────────────────────
// Presentation (fonts/spacing/per-section overrides) lives here, persisted
// as Customization.themeJson. Structure (section order/hidden/custom) lives
// on Resume.contentJson.sectionLayout — see src/types/resume.ts.
//
// themeJson is null for every pre-engine row; legacyToTheme() (see
// src/lib/theme/legacyToTheme.ts) derives an equivalent ThemeConfig from the
// legacy scalar columns (fontSize/colors/marginSize/lineHeight/fontFamily)
// so old rows render identically until the user edits and it gets persisted.

export type HeadingStyle =
  | "uppercase"
  | "underline"
  | "bar"
  | "serif"
  | "plain"
  | "accent-rule"
  | "rule-above"
  | "boxed";

/** Header block layout — how name/headline/contacts are arranged. */
export type HeaderStyle =
  | "underline"
  | "centered"
  | "band"
  | "left-accent"
  | "minimal"
  | "plain"
  | "gradient"
  | "boxed"
  | "split"
  | "overline";

/** How dated entries (experience/education/projects/volunteer) render. */
export type EntryStyle =
  | "standard"
  | "timeline"
  | "compact"
  | "marker"
  | "table"
  | "date-column"
  | "label-column";

/** Profile photo corner treatment. */
export type PhotoShape = "circle" | "squircle" | "square";

/** Profile photo border/elevation treatment. */
export type PhotoFrame = "none" | "ring" | "shadow";

/** How the skills section renders: flat text, tag chips, a labeled list, a
 * bordered label/value row (bjet-professional), a 2-column accent-ruled
 * grid, or borderless label/value columns (the light-weight cousin of `table`). */
export type SkillStyle =
  | "inline"
  | "chips"
  | "list"
  | "table"
  | "grid"
  | "columns";

/** Whether dated-entry date ranges render as plain text or a tinted pill badge. */
export type DateStyle = "plain" | "badge";

/** Glyph used for achievement/custom-section bullet points. */
export type BulletStyle = "disc" | "dot" | "dash";

export type PerSectionOverride = Partial<{
  color: string;
  headingStyle: HeadingStyle;
  gap: Leading;
  hidden: boolean;
}>;

export type ThemeConfig = {
  colors: ThemeColors;
  fonts: {
    family: string;
    baseSize: FontSize;
    lineHeight: Leading;
    headingSize: FontSize;
    nameSize: FontSize;
  };
  spacing: {
    margin: MarginSize;
    sectionGap: Leading;
    itemGap: Leading;
  };
  /** Keyed by section id (built-in or custom-section uuid). */
  perSection?: Record<string, PerSectionOverride>;
};

export function defaultThemeFromScalars(
  customization: SanitizedCustomization
): ThemeConfig {
  return {
    colors: customization.colors.split(",") as ThemeColors,
    fonts: {
      family: customization.fontFamily,
      baseSize: customization.fontSize as FontSize,
      lineHeight: customization.lineHeight as Leading,
      headingSize: customization.fontSize as FontSize,
      nameSize: customization.fontSize as FontSize,
    },
    spacing: {
      margin: customization.marginSize as MarginSize,
      sectionGap: "medium",
      itemGap: "medium",
    },
  };
}

function validateThemeConfig(theme: ThemeConfig) {
  validateColors(theme.colors);
  if (!VALID_FONT_FAMILIES.has(theme.fonts.family)) {
    throw new Error("Invalid theme font family.");
  }
  if (!VALID_FONT_SIZES.includes(theme.fonts.baseSize)) {
    throw new Error("Invalid theme base font size.");
  }
  if (!VALID_MARGIN_SIZES.includes(theme.spacing.margin)) {
    throw new Error("Invalid theme margin size.");
  }
}

// ── V2 Inline Editor extensions ──────────────────────────────────────────────
// Deprecated: order/hidden moved to Resume.contentJson.sectionLayout (see
// src/types/resume.ts BUILTIN_SECTION_IDS / SectionLayoutSchema), which
// covers all 11 sections instead of this set's 7 and actually persists.
// V2Customization is kept only as an alias for the theme-extended shape.
export type V2Customization = SanitizedCustomization & { themeJson?: string };
