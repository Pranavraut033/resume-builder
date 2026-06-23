import { Font } from "@react-pdf/renderer";

// System font → react-pdf built-in font aliases (no registration required)
export const SYSTEM_FONT_MAP: Record<string, string> = {
  Arial: "Helvetica",
  Helvetica: "Helvetica",
  Verdana: "Helvetica",
  "Trebuchet MS": "Helvetica",
  "Times New Roman": "Times-Roman",
  Georgia: "Times-Roman",
  Garamond: "Times-Roman",
  "Courier New": "Courier",
};

// Pin to v4 of the fontsource packages.  v4 ships both .woff and .woff2
// files; v5+ dropped .woff and only provides subsetted .woff2 files that
// fontkit cannot re-subset cleanly for PDF embedding (produces "Cannot extract
// embedded font" errors in Acrobat).  WOFF v1 is essentially a zip-wrapped
// TTF/OTF which fontkit handles reliably for PDF generation.
const CDN = "https://cdn.jsdelivr.net/npm/@fontsource";
const FONTSOURCE_V4 = "@4";

type FontSpec = {
  pkg: string;
  name: string;
  weights: number[];
  italicWeights?: number[];
};

const GOOGLE_FONTS: Record<string, FontSpec> = {
  Inter: {
    pkg: "inter",
    name: "inter",
    weights: [300, 400, 600, 700],
  },
  Poppins: {
    pkg: "poppins",
    name: "poppins",
    weights: [300, 400, 600, 700],
  },
  Roboto: {
    pkg: "roboto",
    name: "roboto",
    weights: [300, 400, 700],
  },
  Montserrat: {
    pkg: "montserrat",
    name: "montserrat",
    weights: [300, 400, 600, 700],
  },
  Lora: {
    pkg: "lora",
    name: "lora",
    weights: [400, 600, 700],
  },
  "Open Sans": {
    pkg: "open-sans",
    name: "open-sans",
    weights: [300, 400, 600, 700],
  },
  "Source Sans Pro": {
    pkg: "source-sans-pro",
    name: "source-sans-pro",
    weights: [300, 400, 600, 700],
  },
  Merriweather: {
    pkg: "merriweather",
    name: "merriweather",
    weights: [300, 400, 700],
    italicWeights: [400, 700],
  },
  Raleway: {
    pkg: "raleway",
    name: "raleway",
    weights: [300, 400, 600, 700],
  },
  Ubuntu: {
    pkg: "ubuntu",
    name: "ubuntu",
    weights: [300, 400, 700],
  },
  Nunito: {
    pkg: "nunito",
    name: "nunito",
    weights: [300, 400, 600, 700],
  },
  "Playfair Display": {
    pkg: "playfair-display",
    name: "playfair-display",
    weights: [400, 600, 700],
  },
};

const registered = new Set<string>();

/**
 * Registers a Google Font family with react-pdf via the fontsource CDN.
 * Returns the resolved font family name to use in styles (maps system fonts to
 * their react-pdf built-in equivalents).
 */
export function registerPDFFont(fontFamily: string): string {
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
      ...(spec.italicWeights ?? []).map((weight) => ({
        src: `${CDN}/${spec.pkg}${FONTSOURCE_V4}/files/${spec.name}-latin-${weight}-italic.woff`,
        fontWeight: weight,
        fontStyle: "italic" as const,
      })),
    ],
  });

  registered.add(fontFamily);
  return fontFamily;
}

// Always register Inter as the safe default
registerPDFFont("Inter");
