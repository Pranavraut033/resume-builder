/**
 * Font Loader Utility
 * Dynamically loads Google Fonts and generates CSS font-family declarations.
 * Supports all fonts in AVAILABLE_FONTS list from resume types.
 *
 * USAGE:
 * - In components: import { loadGoogleFont } from '@/lib/fontLoader'
 * - When font changes: useEffect(() => { loadGoogleFont(fontName) }, [fontName])
 * - For PDF generation: Use generateFontStyleBlock() to include fonts in exported documents
 * - System fonts (Arial, etc.) require no loading and work out of the box
 * - Google Fonts are loaded dynamically via @import URL to document head
 *
 * FONT AVAILABILITY:
 * - Google Fonts: Inter, Poppins, Roboto, Montserrat, Lora, Open Sans, etc.
 * - System Fonts: Arial, Helvetica, Times New Roman, Georgia, Courier New, etc.
 *
 * PERFORMANCE:
 * - Fonts are cached after first load to avoid duplicate requests
 * - Only fonts actually used are loaded (lazy loading)
 * - Google Fonts uses display=swap for optimal performance
 */

// Map of font names to Google Fonts weight variants
const GOOGLE_FONTS_MAP: Record<string, { name: string; weights: number[] }> = {
  Inter: { name: "Inter", weights: [300, 400, 500, 600, 700] },
  Georgia: { name: "Georgia", weights: [400, 700] },
  Poppins: { name: "Poppins", weights: [300, 400, 500, 600, 700] },
  Lora: { name: "Lora", weights: [400, 500, 600, 700] },
  Montserrat: { name: "Montserrat", weights: [300, 400, 500, 600, 700] },
  "Playfair Display": {
    name: "Playfair+Display",
    weights: [400, 500, 600, 700],
  },
  Roboto: { name: "Roboto", weights: [300, 400, 500, 700] },
  "Open Sans": { name: "Open+Sans", weights: [300, 400, 500, 600, 700] },
  "Source Sans Pro": { name: "Source+Sans+Pro", weights: [300, 400, 600, 700] },
  Merriweather: { name: "Merriweather", weights: [300, 400, 700] },
  Raleway: { name: "Raleway", weights: [300, 400, 500, 600, 700] },
  Ubuntu: { name: "Ubuntu", weights: [300, 400, 500, 700] },
  Nunito: { name: "Nunito", weights: [300, 400, 600, 700] },
};

// System fonts that don't need loading
const SYSTEM_FONTS: Record<string, string> = {
  Arial: "Arial, sans-serif",
  "Times New Roman": '"Times New Roman", serif',
  Helvetica: "Helvetica, sans-serif",
  Verdana: "Verdana, sans-serif",
  "Trebuchet MS": '"Trebuchet MS", sans-serif',
  Garamond: "Garamond, serif",
  "Courier New": '"Courier New", monospace',
};

// Cache of loaded fonts to avoid duplicate loading
const loadedFonts = new Set<string>();

/**
 * Get the CSS font-family declaration for a given font name.
 * If it's a Google Font, the font name will be wrapped in appropriate quotes.
 * If it's a system font, the fallback chain is provided.
 */
export function getFontFamily(fontName: string): string {
  // Check if it's a system font
  if (SYSTEM_FONTS[fontName]) {
    return SYSTEM_FONTS[fontName];
  }

  // Check if it's a Google Font
  if (GOOGLE_FONTS_MAP[fontName]) {
    return `"${fontName}", sans-serif`;
  }

  // Fallback for unknown fonts
  return `"${fontName}", sans-serif`;
}

/**
 * Load a font from Google Fonts dynamically.
 * This function checks if the font is already loaded to avoid duplicate requests.
 */
export function loadGoogleFont(fontName: string): void {
  // If it's a system font, no need to load
  if (SYSTEM_FONTS[fontName]) {
    return;
  }

  // If font is already loaded, skip
  if (loadedFonts.has(fontName)) {
    return;
  }

  // If it's not in our Google Fonts map, skip loading
  if (!GOOGLE_FONTS_MAP[fontName]) {
    console.warn(`Font "${fontName}" not found in available fonts`);
    return;
  }

  const fontConfig = GOOGLE_FONTS_MAP[fontName];
  const weights = fontConfig.weights.join(";");
  const familyName = fontConfig.name;

  // Construct Google Fonts URL
  // Format: https://fonts.googleapis.com/css2?family=Font+Name:wght@weight1;weight2&display=swap
  const url = `https://fonts.googleapis.com/css2?family=${familyName}:wght@${weights}&display=swap`;

  // Create and append link element
  const link = document.createElement("link");
  link.href = url;
  link.rel = "stylesheet";
  document.head.appendChild(link);

  // Mark font as loaded
  loadedFonts.add(fontName);
}

/**
 * Load multiple fonts at once.
 * Useful for pre-loading fonts needed for templates or exports.
 */
export function loadGoogleFonts(fontNames: string[]): void {
  fontNames.forEach((fontName) => loadGoogleFont(fontName));
}

/**
 * Generate a CSS style block for fonts used in the resume.
 * Useful for inserting into iframes or document for PDF generation.
 */
export function generateFontStyleBlock(fontName: string): string {
  // If it's a system font, no additional CSS needed
  if (SYSTEM_FONTS[fontName]) {
    return "";
  }

  // If it's not in our Google Fonts map, return empty
  if (!GOOGLE_FONTS_MAP[fontName]) {
    return "";
  }

  const fontConfig = GOOGLE_FONTS_MAP[fontName];
  const weights = fontConfig.weights.join(";");
  const familyName = fontConfig.name;

  // Generate @import statement for fonts
  const url = `https://fonts.googleapis.com/css2?family=${familyName}:wght@${weights}&display=swap`;
  return `@import url('${url}');`;
}

/**
 * Check if a font is a Google Font.
 */
export function isGoogleFont(fontName: string): boolean {
  return GOOGLE_FONTS_MAP[fontName] !== undefined;
}

/**
 * Check if a font is a system font.
 */
export function isSystemFont(fontName: string): boolean {
  return SYSTEM_FONTS[fontName] !== undefined;
}

/**
 * Get all available font names.
 */
export function getAvailableFonts(): string[] {
  return Object.keys(GOOGLE_FONTS_MAP).concat(Object.keys(SYSTEM_FONTS));
}
