import type { BulletStyle } from "@/types/customization";

/**
 * One glyph table shared by the DOM and PDF section builders so bullet lists
 * render identically in both — see photoFrame.ts for the same pattern
 * applied to profile-photo shapes/frames. Rendered as a literal glyph prefix
 * rather than CSS `list-style-type` so `sections.tsx` (DOM, contenteditable)
 * and `pdf/sections.tsx` (react-pdf, no list-style support) share one source
 * of truth.
 */
// "dot" uses a middle dot (·, U+00B7) rather than a black circle (●, U+25CF)
// — the latter falls outside the glyph set react-pdf's font paths reliably
// support and rendered as mangled mojibake ("Ï") in exported PDFs instead of
// a bullet. U+00B7 is in the Latin-1 range every font here supports, and
// still reads visually distinct from the bullet ("•") used by "disc".
const BULLET_GLYPH: Record<BulletStyle, string> = {
  disc: "•",
  dot: "·",
  dash: "–",
};

export function bulletGlyph(style: BulletStyle | undefined): string {
  return BULLET_GLYPH[style ?? "disc"];
}
