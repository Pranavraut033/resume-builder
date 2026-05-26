const CSS_PIXELS_PER_MM = 96 / 25.4;

const PAGE_DIMENSIONS = {
  a4: { widthMm: 210, heightMm: 297 },
  letter: { widthMm: 215.9, heightMm: 279.4 },
} as const;

const MARGIN_SIZE_PX: Record<string, number> = {
  narrow: 32,
  normal: 48,
  wide: 64,
};

export interface PageDimensions {
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
  marginPx: number;
  /** Usable height per page (heightPx minus top and bottom margins). */
  contentHeightPx: number;
}

export function getPageDimensions(
  pageFormat: string,
  marginSize: string
): PageDimensions {
  const key = pageFormat === "letter" ? "letter" : "a4";
  const { widthMm, heightMm } = PAGE_DIMENSIONS[key];
  const marginPx = MARGIN_SIZE_PX[marginSize] ?? 48;
  const widthPx = widthMm * CSS_PIXELS_PER_MM;
  const heightPx = heightMm * CSS_PIXELS_PER_MM;
  return {
    widthMm,
    heightMm,
    widthPx,
    heightPx,
    marginPx,
    contentHeightPx: heightPx - 2 * marginPx,
  };
}
