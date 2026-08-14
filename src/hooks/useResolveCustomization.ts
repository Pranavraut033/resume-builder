import { BackgroundId, isBackgroundId } from "@/lib/backgrounds/types";
import { DateFormat, VALID_DATE_FORMATS } from "@/lib/date";
import { fontFamilyCss } from "@/lib/fonts/registry";
import {
  FontSize,
  Leading,
  MarginSize,
  SanitizedCustomization,
  ThemeColors,
} from "@/types/customization";

const fontSizeMap: Record<FontSize, string> = {
  small: "text-xs",
  medium: "text-sm",
  large: "text-base",
};

const marginSizeMap: Record<MarginSize, string> = {
  narrow: "p-8",
  normal: "p-12",
  wide: "p-16",
};

const lineHeightMap: Record<Leading, string> = {
  small: "leading-snug",
  medium: "leading-normal",
  large: "leading-relaxed",
};

const nameSizeMap: Record<FontSize, string> = {
  small: "text-2xl",
  medium: "text-3xl",
  large: "text-4xl",
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

  const headingSize =
    textSize === "text-xs"
      ? "text-base"
      : textSize === "text-sm"
        ? "text-lg"
        : "text-xl";
  return {
    primaryColor,
    secondaryColor,
    accentColor,
    textColor,
    backgroundColor,
    colorsTuple,
    background,
    textSize,
    fontFamily: fontFamilyCss(fontFamily),
    lineHeight: lineHeightMap[lineHeight as Leading] || lineHeightMap.medium,
    marginClass,
    headingSize,
    nameSize: nameSizeMap[fontSize as FontSize] || nameSizeMap.medium,
    dateFormat,
  };
}
