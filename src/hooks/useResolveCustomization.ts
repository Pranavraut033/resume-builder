import { Customization } from "@prisma/client";

import {
  FontSize,
  Leading,
  MarginSize,
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

const letterSpacingMap: Record<Leading, string> = {
  small: "tracking-tight",
  medium: "tracking-normal",
  large: "tracking-wide",
};

export default function useResolveCustomization(customization: Customization) {
  const { colors, fontSize, fontFamily, lineHeight, marginSize } =
    customization;

  const textSize = fontSizeMap[fontSize as FontSize] || fontSizeMap.medium;
  const marginClass =
    marginSizeMap[marginSize as MarginSize] || marginSizeMap.normal;

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const [
    primaryColor,
    secondaryColor,
    accentColor,
    textColor,
    backgroundColor,
  ] = colors.split(",") as ThemeColors;
  const headingSize =
    textSize === "small"
      ? "text-lg"
      : textSize === "medium"
        ? "text-xl"
        : "text-2xl";
  return {
    primaryColor,
    secondaryColor,
    accentColor,
    textColor,
    backgroundColor,
    textSize,
    fontFamily,
    today,
    lineHeight:
      letterSpacingMap[lineHeight as Leading] || letterSpacingMap.medium,
    marginClass,
    headingSize,
  };
}
