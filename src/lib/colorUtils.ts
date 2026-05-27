/**
 * Utility functions for color conversion between CSV and ResumeColors object
 * Order: primary, secondary, accent, text, background
 */

// TODO: the file is not being used right now, but will be used in the future when we add color customization features

import { ThemeColors } from "@/types/customization";

/**
 * Convert ResumeColors object to CSV string
 * @param colors ResumeColors object
 * @returns CSV string in format: primary,secondary,accent,text,background
 */
export function colorsToCSV(colors: ThemeColors): string {
  return colors.join(",");
}

/**
 * Parse CSV string to ResumeColors object
 * @param csv CSV string in format: primary,secondary,accent,text,background
 * @returns ResumeColors object
 */
export function colorsFromCSV(csv: string): ThemeColors {
  const parts = csv.split(",").map((s) => s.trim());

  if (parts.length !== 5) {
    throw new Error(
      `Invalid color CSV format. Expected 5 values, got ${parts.length}`
    );
  }

  return parts as ThemeColors;
}

/**
 * Get default colors as CSV
 */
export const DEFAULT_COLORS_CSV = "#3b82f6,#64748b,#8b5cf6,#1f2937,#ffffff";
