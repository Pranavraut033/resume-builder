/**
 * Single source of truth for every resume font: the Google fonts fetched at
 * runtime for both the DOM (src/lib/fontLoader.ts) and PDF export
 * (src/lib/pdf/fonts.ts) share this spec map instead of keeping two
 * out-of-sync copies. `src/types/customization.ts`'s `AVAILABLE_FONTS`
 * derives from this file too, so a font can't be listed without also being
 * loadable.
 */

export type FontCategory = "sans" | "serif" | "mono";

export interface FontSpec {
  /** fontsource npm package, e.g. "playfair-display". */
  pkg: string;
  /** File-name segment fontsource uses, usually same as pkg. */
  name: string;
  weights: number[];
  italicWeights?: number[];
  category: FontCategory;
}

// Google-hosted fonts, fetched from the fontsource CDN. Pinned to v4 (see
// src/lib/pdf/fonts.ts) because v5+ only ships subsetted .woff2 files.
// Every spec except Inter lists an italic 400 face: react-pdf throws on
// <em> text when the family has no italic registered. Inter's v4 package
// ships no italic file, so src/lib/pdf/fonts.ts reuses its upright 400.
export const GOOGLE_FONT_SPECS: Record<string, FontSpec> = {
  Inter: {
    pkg: "inter",
    name: "inter",
    weights: [300, 400, 600, 700],
    category: "sans",
  },
  Poppins: {
    pkg: "poppins",
    name: "poppins",
    weights: [300, 400, 600, 700],
    italicWeights: [400],
    category: "sans",
  },
  Montserrat: {
    pkg: "montserrat",
    name: "montserrat",
    weights: [300, 400, 600, 700],
    italicWeights: [400],
    category: "sans",
  },
  Roboto: {
    pkg: "roboto",
    name: "roboto",
    weights: [300, 400, 700],
    italicWeights: [400],
    category: "sans",
  },
  "Open Sans": {
    pkg: "open-sans",
    name: "open-sans",
    weights: [300, 400, 600, 700],
    italicWeights: [400],
    category: "sans",
  },
  // Fontsource still ships this as "source-sans-pro"; Google renamed the
  // upstream family to Source Sans 3, but the package/label stay as-is so
  // previously-persisted customizations keep resolving.
  "Source Sans Pro": {
    pkg: "source-sans-pro",
    name: "source-sans-pro",
    weights: [300, 400, 600, 700],
    italicWeights: [400],
    category: "sans",
  },
  Raleway: {
    pkg: "raleway",
    name: "raleway",
    weights: [300, 400, 600, 700],
    italicWeights: [400],
    category: "sans",
  },
  Ubuntu: {
    pkg: "ubuntu",
    name: "ubuntu",
    weights: [300, 400, 700],
    italicWeights: [400],
    category: "sans",
  },
  Nunito: {
    pkg: "nunito",
    name: "nunito",
    weights: [300, 400, 600, 700],
    italicWeights: [400],
    category: "sans",
  },
  "IBM Plex Sans": {
    pkg: "ibm-plex-sans",
    name: "ibm-plex-sans",
    weights: [300, 400, 500, 600, 700],
    italicWeights: [400],
    category: "sans",
  },
  "Work Sans": {
    pkg: "work-sans",
    name: "work-sans",
    weights: [300, 400, 500, 600, 700],
    italicWeights: [400],
    category: "sans",
  },
  Lora: {
    pkg: "lora",
    name: "lora",
    weights: [400, 600, 700],
    italicWeights: [400],
    category: "serif",
  },
  "Playfair Display": {
    pkg: "playfair-display",
    name: "playfair-display",
    weights: [400, 600, 700],
    italicWeights: [400],
    category: "serif",
  },
  Merriweather: {
    pkg: "merriweather",
    name: "merriweather",
    weights: [300, 400, 700],
    italicWeights: [400, 700],
    category: "serif",
  },
  // Georgia-metric substitute (see LEGACY_FONT_MAP).
  Gelasio: {
    pkg: "gelasio",
    name: "gelasio",
    weights: [400, 700],
    italicWeights: [400],
    category: "serif",
  },
  "EB Garamond": {
    pkg: "eb-garamond",
    name: "eb-garamond",
    weights: [400, 500, 600, 700],
    italicWeights: [400],
    category: "serif",
  },
  "Cormorant Garamond": {
    pkg: "cormorant-garamond",
    name: "cormorant-garamond",
    weights: [400, 500, 600, 700],
    italicWeights: [400],
    category: "serif",
  },
  "Libre Baskerville": {
    pkg: "libre-baskerville",
    name: "libre-baskerville",
    weights: [400, 700],
    italicWeights: [400],
    category: "serif",
  },
  "IBM Plex Serif": {
    pkg: "ibm-plex-serif",
    name: "ibm-plex-serif",
    weights: [300, 400, 500, 600, 700],
    italicWeights: [400],
    category: "serif",
  },
};

// OS-provided fonts — no fetch needed, just a fallback stack.
export const SYSTEM_FONTS: Record<string, string> = {
  Arial: "Arial, sans-serif",
  "Times New Roman": '"Times New Roman", serif',
  Helvetica: "Helvetica, Arial, sans-serif",
  "Courier New": '"Courier New", monospace',
};

const SYSTEM_CATEGORY: Record<string, FontCategory> = {
  Arial: "sans",
  "Times New Roman": "serif",
  Helvetica: "sans",
  "Courier New": "mono",
};

/**
 * Fonts that used to be offered as OS fonts, which never matched between
 * preview and PDF. Old rows keep validating and render as the mapped
 * embedded font in both engines (resolved by `fontFamilyCss` and
 * `registerPDFFont`).
 */
export const LEGACY_FONT_MAP: Record<string, string> = {
  Georgia: "Gelasio",
  Garamond: "EB Garamond",
  Verdana: "Open Sans",
  "Trebuchet MS": "Open Sans",
};

/** Maps a legacy persisted font name to its current replacement. */
export function resolveFontName(name: string): string {
  return LEGACY_FONT_MAP[name] ?? name;
}

export const ALL_FONT_NAMES = [
  ...Object.keys(GOOGLE_FONT_SPECS),
  ...Object.keys(SYSTEM_FONTS),
];

export function isSystemFont(name: string): boolean {
  return name in SYSTEM_FONTS;
}

export function fontCategory(name: string): FontCategory {
  const resolved = resolveFontName(name);
  return (
    GOOGLE_FONT_SPECS[resolved]?.category ?? SYSTEM_CATEGORY[resolved] ?? "sans"
  );
}

const GENERIC: Record<FontCategory, string> = {
  sans: "sans-serif",
  serif: "serif",
  mono: "monospace",
};

/** CSS `font-family` value for a persisted font name, with a sane fallback. */
export function fontFamilyCss(name: string | undefined): string {
  if (!name) return '"Inter", sans-serif';
  const resolved = resolveFontName(name);
  if (SYSTEM_FONTS[resolved]) return SYSTEM_FONTS[resolved];
  return `"${resolved}", ${GENERIC[fontCategory(resolved)]}`;
}
