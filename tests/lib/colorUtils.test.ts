import { describe, it, expect } from "vitest";

import { colorsToCSV, colorsFromCSV, DEFAULT_COLORS_CSV } from "@/lib/colorUtils";
import { ThemeColors } from "@/types/resume";

describe("colorUtils", () => {
  const sampleColors: ThemeColors = {
    primary: "#3b82f6",
    secondary: "#64748b",
    accent: "#8b5cf6",
    text: "#1f2937",
    background: "#ffffff",
  };

  describe("colorsToCSV", () => {
    it("should convert ResumeColors to CSV string", () => {
      const csv = colorsToCSV(sampleColors);
      expect(csv).toBe("#3b82f6,#64748b,#8b5cf6,#1f2937,#ffffff");
    });

    it("should match default colors CSV constant", () => {
      const csv = colorsToCSV(sampleColors);
      expect(csv).toBe(DEFAULT_COLORS_CSV);
    });
  });

  describe("colorsFromCSV", () => {
    it("should parse CSV string to ResumeColors", () => {
      const csv = "#3b82f6,#64748b,#8b5cf6,#1f2937,#ffffff";
      const colors = colorsFromCSV(csv);
      expect(colors).toEqual(sampleColors);
    });

    it("should handle CSV with spaces", () => {
      const csv = "#3b82f6, #64748b, #8b5cf6, #1f2937, #ffffff";
      const colors = colorsFromCSV(csv);
      expect(colors).toEqual(sampleColors);
    });

    it("should throw error for invalid CSV format", () => {
      expect(() => colorsFromCSV("#3b82f6,#64748b,#8b5cf6")).toThrow(
        "Invalid color CSV format. Expected 5 values, got 3"
      );
    });

    it("should throw error for too many values", () => {
      expect(() =>
        colorsFromCSV("#3b82f6,#64748b,#8b5cf6,#1f2937,#ffffff,#extra")
      ).toThrow("Invalid color CSV format. Expected 5 values, got 6");
    });
  });

  describe("round-trip conversion", () => {
    it("should preserve colors through CSV conversion", () => {
      const csv = colorsToCSV(sampleColors);
      const parsed = colorsFromCSV(csv);
      expect(parsed).toEqual(sampleColors);
    });

    it("should work with custom colors", () => {
      const customColors: ThemeColors = {
        primary: "#ff0000",
        secondary: "#00ff00",
        accent: "#0000ff",
        text: "#000000",
        background: "#ffffff",
      };
      const csv = colorsToCSV(customColors);
      const parsed = colorsFromCSV(csv);
      expect(parsed).toEqual(customColors);
    });
  });
});
