import {
  FontSize,
  Leading,
  MarginSize,
  SanitizedCustomization,
} from "@/types/customization";

/**
 * A single "Size" control that fans out to the three legacy scalar fields
 * (fontSize/marginSize/lineHeight — unchanged, still validated and persisted
 * as before) plus a spacing multiplier applied to every gap/margin/padding
 * *between* elements, on both the DOM (`spaceClass` → Tailwind `--spacing`)
 * and PDF (`spaceScale` → `resolveStyles.ts`'s `sp()`) engines.
 */
export type DocumentSize =
  | "compact"
  | "snug"
  | "normal"
  | "relaxed"
  | "spacious";

export const DOCUMENT_SIZES: DocumentSize[] = [
  "compact",
  "snug",
  "normal",
  "relaxed",
  "spacious",
];

interface SizeConfig {
  fontSize: FontSize;
  marginSize: MarginSize;
  lineHeight: Leading;
  /** Tailwind `--spacing` override (rem) for the DOM engine's doc-size-* class. */
  spacingRem: number;
  /** PDF spacing multiplier fed into resolveStyles.ts's `sp()`. 1 = today's literals. */
  spaceScale: number;
}

export const DOCUMENT_SIZE_CONFIG: Record<DocumentSize, SizeConfig> = {
  compact: {
    fontSize: "small",
    marginSize: "narrow",
    lineHeight: "small",
    spacingRem: 0.17,
    spaceScale: 0.7,
  },
  snug: {
    fontSize: "small",
    marginSize: "normal",
    lineHeight: "medium",
    spacingRem: 0.21,
    spaceScale: 0.85,
  },
  normal: {
    fontSize: "medium",
    marginSize: "normal",
    lineHeight: "medium",
    spacingRem: 0.25,
    spaceScale: 1,
  },
  relaxed: {
    fontSize: "medium",
    marginSize: "wide",
    lineHeight: "large",
    spacingRem: 0.3,
    spaceScale: 1.2,
  },
  spacious: {
    fontSize: "large",
    marginSize: "wide",
    lineHeight: "large",
    spacingRem: 0.34,
    spaceScale: 1.4,
  },
};

/** The stock/default preset — used as a fallback when nothing matches. */
export const DEFAULT_DOCUMENT_SIZE: DocumentSize = "normal";

/**
 * Reverse lookup: does this customization's (fontSize, marginSize, lineHeight)
 * triple exactly match one of the presets? Returns null for a hand-mixed
 * ("Custom") combination — e.g. after an Advanced-panel override.
 */
export function documentSizeOf(
  customization: Pick<
    SanitizedCustomization,
    "fontSize" | "marginSize" | "lineHeight"
  >
): DocumentSize | null {
  for (const size of DOCUMENT_SIZES) {
    const cfg = DOCUMENT_SIZE_CONFIG[size];
    if (
      customization.fontSize === cfg.fontSize &&
      customization.marginSize === cfg.marginSize &&
      customization.lineHeight === cfg.lineHeight
    ) {
      return size;
    }
  }
  return null;
}

const NEAREST_BY_FONT_SIZE: Record<FontSize, DocumentSize> = {
  small: "snug",
  medium: "normal",
  large: "relaxed",
};

/**
 * The preset to actually render spacing with — the exact match, or (for a
 * hand-mixed "Custom" triple from the Advanced overrides) the preset nearest
 * the current fontSize, so spacing still tracks font density reasonably
 * instead of jumping to "normal".
 */
export function effectiveDocumentSize(
  customization: Pick<
    SanitizedCustomization,
    "fontSize" | "marginSize" | "lineHeight"
  >
): DocumentSize {
  return (
    documentSizeOf(customization) ??
    NEAREST_BY_FONT_SIZE[customization.fontSize as FontSize] ??
    DEFAULT_DOCUMENT_SIZE
  );
}

/** The full spacing config to render with — see `effectiveDocumentSize`. */
export function sizeConfigOf(
  customization: Pick<
    SanitizedCustomization,
    "fontSize" | "marginSize" | "lineHeight"
  >
): SizeConfig {
  return DOCUMENT_SIZE_CONFIG[effectiveDocumentSize(customization)];
}
