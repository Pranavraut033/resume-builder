import { SanitizedCustomization } from "@/types/customization";

import { registerPDFFont } from "./fonts";

const FONT_SIZE_PT: Record<string, number> = {
  small: 9,
  medium: 10,
  large: 12,
};
const SMALL_SIZE_PT: Record<string, number> = {
  small: 8,
  medium: 9,
  large: 10,
};
const HEADING_SIZE_PT: Record<string, number> = {
  small: 13,
  medium: 15,
  large: 18,
};
const NAME_SIZE_PT: Record<string, number> = {
  small: 20,
  medium: 24,
  large: 28,
};
const MARGIN_PT: Record<string, number> = { narrow: 24, normal: 36, wide: 48 };
const LINE_HEIGHT: Record<string, number> = {
  small: 1.3,
  medium: 1.5,
  large: 1.7,
};

export interface ResolvedPDFStyles {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  backgroundColor: string;
  fontFamily: string;
  fontSize: number;
  smallFontSize: number;
  headingFontSize: number;
  nameFontSize: number;
  lineHeight: number;
  marginPt: number;
  pageFormat: "A4" | "LETTER";
}

/**
 * Converts a hex color (#RRGGBB) + a 2-digit hex alpha suffix into an
 * rgba() string suitable for use with react-pdf / PDFKit.
 * Example: withAlpha('#8b5cf6', '33') → 'rgba(139,92,246,0.200)'
 */
export function withAlpha(hex: string, alphaHex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const a = (parseInt(alphaHex, 16) / 255).toFixed(3);
  return `rgba(${r},${g},${b},${a})`;
}

export function resolvePDFCustomization(
  customization: SanitizedCustomization
): ResolvedPDFStyles {
  const parts = (
    customization.colors ?? "#3b82f6,#64748b,#8b5cf6,#1f2937,#ffffff"
  ).split(",");

  const [
    primaryColor = "#3b82f6",
    secondaryColor = "#64748b",
    accentColor = "#8b5cf6",
    textColor = "#1f2937",
    backgroundColor = "#ffffff",
  ] = parts;

  const fontFamily = registerPDFFont(customization.fontFamily ?? "Inter");
  const sizeKey = (customization.fontSize as string) ?? "medium";
  const marginKey = (customization.marginSize as string) ?? "normal";
  const lineHeightKey = (customization.lineHeight as string) ?? "medium";

  return {
    primaryColor,
    secondaryColor,
    accentColor,
    textColor,
    backgroundColor,
    fontFamily,
    fontSize: FONT_SIZE_PT[sizeKey] ?? 10,
    smallFontSize: SMALL_SIZE_PT[sizeKey] ?? 9,
    headingFontSize: HEADING_SIZE_PT[sizeKey] ?? 15,
    nameFontSize: NAME_SIZE_PT[sizeKey] ?? 24,
    lineHeight: LINE_HEIGHT[lineHeightKey] ?? 1.5,
    marginPt: MARGIN_PT[marginKey] ?? 36,
    pageFormat: customization.pageFormat === "letter" ? "LETTER" : "A4",
  };
}
