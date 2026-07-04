import { describe, expect, it } from "vitest";

import { legacyToTheme } from "@/lib/theme/legacyToTheme";
import { SanitizedCustomization } from "@/types/customization";

const baseCustomization = {
  template: "modern-minimal",
  pageFormat: "letter",
  fontSize: "medium",
  fontFamily: "Inter",
  lineHeight: "medium",
  colors: "#1d4ed8,#475569,#6d28d9,#1f2937,#ffffff",
  marginSize: "normal",
  background: "none",
  themeJson: null,
} as unknown as SanitizedCustomization;

describe("legacyToTheme", () => {
  it("parses and returns the stored themeJson when present", () => {
    const theme = {
      colors: ["#000000", "#111111", "#222222", "#333333", "#444444"],
      fonts: {
        family: "Roboto",
        baseSize: "large",
        lineHeight: "large",
        headingSize: "large",
        nameSize: "large",
      },
      spacing: { margin: "wide", sectionGap: "large", itemGap: "large" },
    };

    const result = legacyToTheme({
      ...baseCustomization,
      themeJson: JSON.stringify(theme),
    });

    expect(result).toEqual(theme);
  });

  it("derives a theme from legacy scalar columns when themeJson is null", () => {
    const result = legacyToTheme(baseCustomization);

    expect(result.colors).toEqual([
      "#1d4ed8",
      "#475569",
      "#6d28d9",
      "#1f2937",
      "#ffffff",
    ]);
    expect(result.fonts.family).toBe("Inter");
    expect(result.fonts.baseSize).toBe("medium");
    expect(result.spacing.margin).toBe("normal");
  });

  it("falls back to legacy derivation when themeJson is corrupt", () => {
    const result = legacyToTheme({
      ...baseCustomization,
      themeJson: "{not valid json",
    });

    expect(result.fonts.family).toBe("Inter");
    expect(result.colors).toEqual([
      "#1d4ed8",
      "#475569",
      "#6d28d9",
      "#1f2937",
      "#ffffff",
    ]);
  });
});
