import { Customization } from "@prisma/client";

import { BackgroundId, VALID_BACKGROUND_IDS } from "@/lib/backgrounds/types";

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
  themeJson: null,
};

export type Template = {
  id: TemplateType;
  name: string;
  description: string;
  fontFamily: string;
  features: string[];
  bestFor: string;
};

export const AVAILABLE_TEMPLATES: Array<Template> = [
  {
    id: "tech-sidebar",
    name: "Tech Sidebar",
    description: "Perfect for developers and engineers with sidebar layout",
    fontFamily: "Inter",
    features: [
      "Two-column layout",
      "Tech-focused design",
      "Profile photo support",
    ],
    bestFor: "Software developers, engineers, technical roles",
  },
  {
    id: "business-professional",
    name: "Business Professional",
    description: "Clean and formal design for corporate roles",
    fontFamily: "Georgia",
    features: ["Single column", "Professional typography", "Minimal design"],
    bestFor: "Corporate positions, management roles, traditional industries",
  },
  {
    id: "modern-minimal",
    name: "Modern Minimal",
    description: "Balanced design for creative and technical roles",
    fontFamily: "Poppins",
    features: ["Two-column layout", "Clean typography", "Modern aesthetics"],
    bestFor: "Creative professionals, designers, modern companies",
  },
  {
    id: "elegant-timeline",
    name: "Elegant Timeline",
    description: "Timeline-based layout emphasizing career progression",
    fontFamily: "Lora",
    features: ["Timeline visualization", "Elegant typography", "Career focus"],
    bestFor: "Experienced professionals, career changers",
  },
  {
    id: "creative-modern",
    name: "Creative Modern",
    description: "Bold and creative design for standout applications",
    fontFamily: "Montserrat",
    features: ["Creative layout", "Bold colors", "Visual hierarchy"],
    bestFor: "Creative roles, startups, design-focused companies",
  },
  {
    id: "bjet-professional",
    name: "BJet Professional",
    description: "Executive-level professional template",
    fontFamily: "Playfair Display",
    features: ["Executive style", "Premium look", "Professional layout"],
    bestFor: "Senior positions, executive roles, premium applications",
  },
  {
    id: "compact-modern",
    name: "Compact",
    description: "Dense single-column layout that fits more on every page",
    fontFamily: "Inter",
    features: ["Single column", "Space-efficient", "ATS-friendly"],
    bestFor: "Experienced candidates with lots to fit, ATS submissions",
  },
  {
    id: "two-tone",
    name: "Two-Tone",
    description: "Bold colour-block header with a clean, contemporary body",
    fontFamily: "Montserrat",
    features: ["Colour-block header", "Strong contrast", "Modern aesthetics"],
    bestFor: "Marketing, sales, and design-forward roles",
  },
  {
    id: "academic-serif",
    name: "Academic",
    description: "Traditional serif layout for academic and research profiles",
    fontFamily: "Merriweather",
    features: ["Serif typography", "Small-caps headings", "Formal structure"],
    bestFor: "Academics, researchers, education, legal roles",
  },
];

export const AVAILABLE_FONTS = [
  "Inter",
  "Georgia",
  "Poppins",
  "Lora",
  "Montserrat",
  "Playfair Display",
  "Roboto",
  "Open Sans",
  "Arial",
  "Times New Roman",
  "Helvetica",
  "Verdana",
  "Trebuchet MS",
  "Garamond",
  "Courier New",
  "Source Sans Pro",
  "Merriweather",
  "Raleway",
  "Ubuntu",
  "Nunito",
];

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
  themeJson,
}: SanitizedCustomization) {
  if (template && !VALID_TEMPLATE_IDS.has(template as TemplateType)) {
    throw new Error("Invalid template selected.");
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

export type HeadingStyle = "uppercase" | "underline" | "bar" | "serif";

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
