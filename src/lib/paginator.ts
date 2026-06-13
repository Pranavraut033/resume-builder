/**
 * Groups an ordered list of block heights into pages using greedy bin-packing.
 * A block is never split across pages — if it doesn't fit on the current page,
 * it starts a new page.
 *
 * @param heights           Height in px of each block (index-aligned).
 * @param pageContentHeight Available content height per page in px.
 * @param firstPageReserved Height already consumed on page 0 (e.g. by the
 *                          resume header). Reduces the capacity of the first
 *                          page only.
 * @param gapPx             Vertical gap in px rendered between consecutive
 *                          blocks on the same page (e.g. a `mb-4` margin).
 *                          Not applied before the first block on a page.
 * @returns Array of pages; each page is an array of block indices.
 */
export function groupBlocksIntoPages(
  heights: number[],
  pageContentHeight: number,
  firstPageReserved = 0,
  gapPx = 0
): number[][] {
  if (heights.length === 0) return [[]];

  const pages: number[][] = [[]];
  let usedHeight = firstPageReserved;

  for (let i = 0; i < heights.length; i++) {
    const h = heights[i];
    const currentPage = pages[pages.length - 1];
    const isFirstOnPage = currentPage.length === 0;
    const required = h + (isFirstOnPage ? 0 : gapPx);

    // A block taller than a full page still gets placed (own page) to avoid
    // an infinite loop — it will simply overflow that page.
    const fits = usedHeight + required <= pageContentHeight;

    if (fits || isFirstOnPage) {
      currentPage.push(i);
      usedHeight += required;
    } else {
      pages.push([i]);
      usedHeight = h;
    }
  }

  return pages;
}
