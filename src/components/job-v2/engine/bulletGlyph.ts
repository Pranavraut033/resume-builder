import type { BulletStyle } from "@/types/customization";

/**
 * One glyph table shared by the DOM and PDF section builders so bullet lists
 * render identically in both — see photoFrame.ts for the same pattern
 * applied to profile-photo shapes/frames. Rendered as a literal glyph prefix
 * rather than CSS `list-style-type` so `sections.tsx` (DOM, contenteditable)
 * and `pdf/sections.tsx` (react-pdf, no list-style support) share one source
 * of truth.
 */
const BULLET_GLYPH: Record<BulletStyle, string> = {
  disc: "•",
  dot: "●",
  dash: "–",
};

export function bulletGlyph(style: BulletStyle | undefined): string {
  return BULLET_GLYPH[style ?? "disc"];
}
