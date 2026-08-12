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
    category: "sans",
  },
  Montserrat: {
    pkg: "montserrat",
    name: "montserrat",
    weights: [300, 400, 600, 700],
    category: "sans",
  },
  Roboto: {
    pkg: "roboto",
    name: "roboto",
    weights: [300, 400, 700],
    category: "sans",
  },
  "Open Sans": {
    pkg: "open-sans",
    name: "open-sans",
    weights: [300, 400, 600, 700],
    category: "sans",
  },
  // Fontsource still ships this as "source-sans-pro"; Google renamed the
  // upstream family to Source Sans 3, but the package/label stay as-is so
  // previously-persisted customizations keep resolving.
  "Source Sans Pro": {
    pkg: "source-sans-pro",
    name: "source-sans-pro",
    weights: [300, 400, 600, 700],
    category: "sans",
  },
  Raleway: {
    pkg: "raleway",
    name: "raleway",
    weights: [300, 400, 600, 700],
    category: "sans",
  },
  Ubuntu: {
    pkg: "ubuntu",
    name: "ubuntu",
    weights: [300, 400, 700],
    category: "sans",
  },
  Nunito: {
    pkg: "nunito",
    name: "nunito",
    weights: [300, 400, 600, 700],
    category: "sans",
  },
  "IBM Plex Sans": {
    pkg: "ibm-plex-sans",
    name: "ibm-plex-sans",
    weights: [300, 400, 500, 600, 700],
    category: "sans",
  },
  "Work Sans": {
    pkg: "work-sans",
    name: "work-sans",
    weights: [300, 400, 500, 600, 700],
    category: "sans",
  },
  Lora: {
    pkg: "lora",
    name: "lora",
    weights: [400, 600, 700],
    category: "serif",
  },
  "Playfair Display": {
    pkg: "playfair-display",
    name: "playfair-display",
    weights: [400, 600, 700],
    category: "serif",
  },
  Merriweather: {
    pkg: "merriweather",
    name: "merriweather",
    weights: [300, 400, 700],
    italicWeights: [400, 700],
    category: "serif",
  },
  "EB Garamond": {
    pkg: "eb-garamond",
    name: "eb-garamond",
    weights: [400, 500, 600, 700],
    category: "serif",
  },
  "Cormorant Garamond": {
    pkg: "cormorant-garamond",
    name: "cormorant-garamond",
    weights: [400, 500, 600, 700],
    category: "serif",
  },
  "Libre Baskerville": {
    pkg: "libre-baskerville",
    name: "libre-baskerville",
    weights: [400, 700],
    category: "serif",
  },
  "IBM Plex Serif": {
    pkg: "ibm-plex-serif",
    name: "ibm-plex-serif",
    weights: [300, 400, 500, 600, 700],
    category: "serif",
  },
};

// OS-provided fonts — no fetch needed, just a fallback stack.
export const SYSTEM_FONTS: Record<string, string> = {
  Georgia: 'Georgia, "Times New Roman", serif',
  Arial: "Arial, sans-serif",
  "Times New Roman": '"Times New Roman", serif',
  Helvetica: "Helvetica, Arial, sans-serif",
  Verdana: "Verdana, sans-serif",
  "Trebuchet MS": '"Trebuchet MS", sans-serif',
  Garamond: "Garamond, serif",
  "Courier New": '"Courier New", monospace',
};

const SYSTEM_CATEGORY: Record<string, FontCategory> = {
  Georgia: "serif",
  Arial: "sans",
  "Times New Roman": "serif",
  Helvetica: "sans",
  Verdana: "sans",
  "Trebuchet MS": "sans",
  Garamond: "serif",
  "Courier New": "mono",
};

export const ALL_FONT_NAMES = [
  ...Object.keys(GOOGLE_FONT_SPECS),
  ...Object.keys(SYSTEM_FONTS),
];

export function isSystemFont(name: string): boolean {
  return name in SYSTEM_FONTS;
}

export function fontCategory(name: string): FontCategory {
  return GOOGLE_FONT_SPECS[name]?.category ?? SYSTEM_CATEGORY[name] ?? "sans";
}

const GENERIC: Record<FontCategory, string> = {
  sans: "sans-serif",
  serif: "serif",
  mono: "monospace",
};

/** CSS `font-family` value for a persisted font name, with a sane fallback. */
export function fontFamilyCss(name: string | undefined): string {
  if (!name) return '"Inter", sans-serif';
  if (SYSTEM_FONTS[name]) return SYSTEM_FONTS[name];
  return `"${name}", ${GENERIC[fontCategory(name)]}`;
}
