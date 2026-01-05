/**
 * Utility functions for color conversion between CSV and ResumeColors object
 * Order: primary, secondary, accent, text, background
 */

import { ThemeColors } from "@/types/resume";

/**
 * Convert ResumeColors object to CSV string
 * @param colors ResumeColors object
 * @returns CSV string in format: primary,secondary,accent,text,background
 */
export function colorsToCSV(colors: ThemeColors): string {
  return [
    colors.primary,
    colors.secondary,
    colors.accent,
    colors.text,
    colors.background,
  ].join(",");
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

  return {
    primary: parts[0],
    secondary: parts[1],
    accent: parts[2],
    text: parts[3],
    background: parts[4],
  };
}

/**
 * Get default colors as CSV
 */
export const DEFAULT_COLORS_CSV = "#3b82f6,#64748b,#8b5cf6,#1f2937,#ffffff";
