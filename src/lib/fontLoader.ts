/**
 * Loads Google fonts into the document via the Font Loading API
 * (`document.fonts.add`) instead of injecting a `<link>`/`@font-face`
 * stylesheet pointed at fonts.googleapis.com.
 *
 * Why: the app's CSP (src/proxy.ts) is `style-src 'self' 'unsafe-inline'` and
 * `font-src 'self' data:` — a stylesheet link to Google Fonts is blocked
 * outright, so every "Google font" silently fell back to the browser
 * default. Fetching the font bytes ourselves only needs `connect-src`,
 * which already allows `https:`, and handing the bytes straight to
 * `FontFace` never triggers a font-src/style-src check at all since no
 * further network request or stylesheet is involved.
 *
 * Font metadata (which package/weights) lives in src/lib/fonts/registry.ts,
 * shared with the PDF export font loader (src/lib/pdf/fonts.ts).
 */
import { FontSpec, GOOGLE_FONT_SPECS } from "@/lib/fonts/registry";

// Pinned to v4 of the fontsource packages — same CDN/version PDF export
// uses, so a font that works in the picker also works in the exported PDF.
const CDN = "https://cdn.jsdelivr.net/npm/@fontsource";
const FONTSOURCE_V4 = "@4";

const loadedWeights = new Set<string>();
const pending = new Map<string, Promise<void>>();

async function loadWeight(
  name: string,
  spec: FontSpec,
  weight: number
): Promise<void> {
  const key = `${name}:${weight}`;
  if (loadedWeights.has(key)) return;

  const existing = pending.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const url = `${CDN}/${spec.pkg}${FONTSOURCE_V4}/files/${spec.name}-latin-${weight}-normal.woff`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Font fetch failed (${res.status}): ${url}`);
    const bytes = await res.arrayBuffer();
    const face = new FontFace(name, bytes, { weight: String(weight) });
    await face.load();
    document.fonts.add(face);
    loadedWeights.add(key);
  })()
    .catch((err) => {
      console.warn(`Failed to load font "${name}" @ ${weight}`, err);
    })
    .finally(() => {
      pending.delete(key);
    });

  pending.set(key, promise);
  return promise;
}

/**
 * Load a Google font. By default only fetches a single representative
 * weight (cheap, good enough for a preview); pass `full: true` to fetch
 * every weight the family ships, needed once a font is actually applied to
 * a resume that may use bold headings etc.
 * No-op for system fonts or unrecognized names.
 */
export function loadGoogleFont(
  name: string,
  { full = false }: { full?: boolean } = {}
): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();

  const spec = GOOGLE_FONT_SPECS[name];
  if (!spec) return Promise.resolve();

  const weights = full
    ? spec.weights
    : [spec.weights.includes(400) ? 400 : spec.weights[0]];

  return Promise.all(weights.map((w) => loadWeight(name, spec, w))).then(
    () => undefined
  );
}

export function loadGoogleFonts(names: string[]): void {
  names.forEach((name) => loadGoogleFont(name));
}
