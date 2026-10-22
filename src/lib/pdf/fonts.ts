import { Font } from "@react-pdf/renderer";

import { GOOGLE_FONT_SPECS, resolveFontName } from "@/lib/fonts/registry";

// System font → react-pdf built-in font aliases (no registration required)
export const SYSTEM_FONT_MAP: Record<string, string> = {
  Arial: "Helvetica",
  Helvetica: "Helvetica",
  "Times New Roman": "Times-Roman",
  "Courier New": "Courier",
};

// Pin to v4 of the fontsource packages.  v4 ships both .woff and .woff2
// files; v5+ dropped .woff and only provides subsetted .woff2 files that
// fontkit cannot re-subset cleanly for PDF embedding (produces "Cannot extract
// embedded font" errors in Acrobat).  WOFF v1 is essentially a zip-wrapped
// TTF/OTF which fontkit handles reliably for PDF generation.
const CDN = "https://cdn.jsdelivr.net/npm/@fontsource";
const FONTSOURCE_V4 = "@4";

// Google-hosted fonts share one spec (pkg/weights) with the DOM font loader
// (src/lib/fontLoader.ts) via src/lib/fonts/registry.ts.
const GOOGLE_FONTS = GOOGLE_FONT_SPECS;

const registered = new Set<string>();

/**
 * Registers a Google Font family with react-pdf via the fontsource CDN.
 * Returns the resolved font family name to use in styles (maps system fonts to
 * their react-pdf built-in equivalents).
 */
export function registerPDFFont(requestedFamily: string): string {
  // Legacy names (Georgia, Verdana, …) map to embedded fonts, same as the DOM.
  const fontFamily = resolveFontName(requestedFamily);
  const systemAlias = SYSTEM_FONT_MAP[fontFamily];
  if (systemAlias) return systemAlias;

  if (registered.has(fontFamily)) return fontFamily;

  const spec = GOOGLE_FONTS[fontFamily];
  if (!spec) return "Helvetica"; // unknown font – fall back to built-in

  Font.register({
    family: fontFamily,
    fonts: [
      ...spec.weights.map((weight) => ({
        src: `${CDN}/${spec.pkg}${FONTSOURCE_V4}/files/${spec.name}-latin-${weight}-normal.woff`,
        fontWeight: weight,
        fontStyle: "normal" as const,
      })),
      // No italic file (Inter's v4 package): reuse upright 400 so <em> text
      // doesn't throw in react-pdf (it renders upright rather than slanted).
      ...(spec.italicWeights ?? [400]).map((weight) => ({
        src: `${CDN}/${spec.pkg}${FONTSOURCE_V4}/files/${spec.name}-latin-${weight}-${spec.italicWeights ? "italic" : "normal"}.woff`,
        fontWeight: weight,
        fontStyle: "italic" as const,
      })),
    ],
  });

  registered.add(fontFamily);
  return fontFamily;
}

// Never split words with a hyphen ("Adminis-trator"); react-pdf's default
// hyphenation breaks words mid-syllable. Returning the whole word disables it.
Font.registerHyphenationCallback((word) => [word]);

// Always register Inter as the safe default
registerPDFFont("Inter");
