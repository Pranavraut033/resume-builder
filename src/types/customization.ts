import { Customization } from "@prisma/client";

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
  | "bjet-professional";

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
  "#3b82f6",
  "#64748b",
  "#8b5cf6",
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
}

export const COLOR_PRESETS: Array<{
  name: string;
  hex: string;
  colors: ThemeColors;
}> = [
  {
    name: "Blue",
    hex: "#3b82f6",
    colors: [
      "#3b82f6",
      DEFAULT_COLORS[1],
      "#8b5cf6",
      DEFAULT_COLORS[3],
      DEFAULT_COLORS[4],
    ],
  },
  {
    name: "Navy",
    hex: "#1e40af",
    colors: [
      "#1e40af",
      "#3b82f6",
      "#1e3a8a",
      DEFAULT_COLORS[3],
      DEFAULT_COLORS[4],
    ],
  },
  {
    name: "Green",
    hex: "#10b981",
    colors: [
      "#10b981",
      "#6ee7b7",
      "#059669",
      DEFAULT_COLORS[3],
      DEFAULT_COLORS[4],
    ],
  },
  {
    name: "Purple",
    hex: "#8b5cf6",
    colors: [
      "#8b5cf6",
      "#a78bfa",
      "#7c3aed",
      DEFAULT_COLORS[3],
      DEFAULT_COLORS[4],
    ],
  },
  {
    name: "Rose",
    hex: "#e11d48",
    colors: [
      "#e11d48",
      "#fb7185",
      "#be123c",
      DEFAULT_COLORS[3],
      DEFAULT_COLORS[4],
    ],
  },
  {
    name: "Teal",
    hex: "#14b8a6",
    colors: [
      "#14b8a6",
      "#5eead4",
      "#0d9488",
      DEFAULT_COLORS[3],
      DEFAULT_COLORS[4],
    ],
  },
  {
    name: "Orange",
    hex: "#f97316",
    colors: [
      "#f97316",
      "#fb923c",
      "#ea580c",
      DEFAULT_COLORS[3],
      DEFAULT_COLORS[4],
    ],
  },
  {
    name: "Gray",
    hex: "#6b7280",
    colors: [
      "#6b7280",
      "#9ca3af",
      "#374151",
      DEFAULT_COLORS[3],
      DEFAULT_COLORS[4],
    ],
  },
];
