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
 * @returns Array of pages; each page is an array of block indices.
 */
export function groupBlocksIntoPages(
  heights: number[],
  pageContentHeight: number,
  firstPageReserved = 0
): number[][] {
  if (heights.length === 0) return [[]];

  const pages: number[][] = [[]];
  let currentPageHeight = firstPageReserved;
  let currentPageCapacity = pageContentHeight - firstPageReserved;

  for (let i = 0; i < heights.length; i++) {
    const h = heights[i];

    // A block taller than a full page gets its own page to avoid infinite loop.
    const fitsOnCurrent = h <= currentPageCapacity - currentPageHeight;

    if (fitsOnCurrent) {
      pages[pages.length - 1].push(i);
      currentPageHeight += h;
    } else {
      // Start a new page.
      pages.push([i]);
      currentPageCapacity = pageContentHeight;
      currentPageHeight = h;
    }
  }

  return pages;
}
