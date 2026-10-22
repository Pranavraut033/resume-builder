import { BackgroundId, isBackgroundId } from "@/lib/backgrounds/types";
import { DateFormat, VALID_DATE_FORMATS } from "@/lib/date";
import { effectiveDocumentSize } from "@/lib/documentSize";
import { fontFamilyCss } from "@/lib/fonts/registry";
import {
  FontSize,
  Leading,
  MarginSize,
  SanitizedCustomization,
  ThemeColors,
} from "@/types/customization";

// Sizes are `@theme` tokens in global.css (px = pt / 0.75) so the DOM preview
// matches the PDF engine's pt sizes.
const fontSizeMap: Record<FontSize, string> = {
  small: "text-doc-body-sm",
  medium: "text-doc-body-md",
  large: "text-doc-body-lg",
};

const metaSizeMap: Record<FontSize, string> = {
  small: "text-doc-meta-sm",
  medium: "text-doc-meta-md",
  large: "text-doc-meta-lg",
};

const headingSizeMap: Record<FontSize, string> = {
  small: "text-doc-heading-sm",
  medium: "text-doc-heading-md",
  large: "text-doc-heading-lg",
};

// Fixed-px page margins (24/36/48 pt) — never scaled by the Size preset's
// `--spacing` override.
const marginSizeMap: Record<MarginSize, string> = {
  narrow: "p-page-narrow",
  normal: "p-page-normal",
  wide: "p-page-wide",
};

const lineHeightMap: Record<Leading, string> = {
  small: "leading-snug",
  medium: "leading-normal",
  large: "leading-relaxed",
};

const nameSizeMap: Record<FontSize, string> = {
  small: "text-doc-name-sm",
  medium: "text-doc-name-md",
  large: "text-doc-name-lg",
};

export default function useResolveCustomization(
  customization: SanitizedCustomization
) {
  const { colors, fontSize, fontFamily, lineHeight, marginSize } =
    customization;

  const rawDateFormat = customization.dateFormat as DateFormat | undefined;
  const dateFormat: DateFormat = VALID_DATE_FORMATS.includes(
    rawDateFormat as DateFormat
  )
    ? (rawDateFormat as DateFormat)
    : "locale";

  const textSize = fontSizeMap[fontSize as FontSize] || fontSizeMap.medium;
  const marginClass =
    marginSizeMap[marginSize as MarginSize] || marginSizeMap.normal;

  const colorsTuple = colors.split(",") as ThemeColors;
  const [
    primaryColor,
    secondaryColor,
    accentColor,
    textColor,
    backgroundColor,
  ] = colorsTuple;

  const rawBackground = (customization as { background?: string }).background;
  const background: BackgroundId =
    rawBackground && isBackgroundId(rawBackground) ? rawBackground : "none";

  const metaSize = metaSizeMap[fontSize as FontSize] || metaSizeMap.medium;
  const headingSize =
    headingSizeMap[fontSize as FontSize] || headingSizeMap.medium;
  return {
    primaryColor,
    secondaryColor,
    accentColor,
    textColor,
    backgroundColor,
    colorsTuple,
    background,
    textSize,
    metaSize,
    fontFamily: fontFamilyCss(fontFamily),
    lineHeight: lineHeightMap[lineHeight as Leading] || lineHeightMap.medium,
    marginClass,
    headingSize,
    nameSize: nameSizeMap[fontSize as FontSize] || nameSizeMap.medium,
    dateFormat,
    // Overrides Tailwind's `--spacing` for the DOM engine's measurement +
    // page containers, so every gap-*/mb-*/p-*/space-y-* utility used inside
    // them scales with the Size preset (documentSize.ts) without touching
    // each call site individually.
    spaceClass: `doc-size-${effectiveDocumentSize(customization)}`,
  };
}
