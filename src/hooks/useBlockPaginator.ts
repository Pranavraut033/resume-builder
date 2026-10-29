"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { groupBlocksIntoPages, pageUsedHeights } from "@/lib/paginator";

type RefCallback = (el: HTMLElement | null) => void;

const marginBottomOf = (el: HTMLElement) =>
  parseFloat(getComputedStyle(el).marginBottom) || 0;

interface UseBlockPaginatorOptions {
  /** Number of blocks to paginate. Changing this resets measurement. */
  count: number;
  /** Available content height per page in px (page height minus margins). */
  pageContentHeight: number;
  /** Height already reserved on page 1 by the header. Defaults to 0. */
  firstPageReserved?: number;
  /**
   * Extra vertical gap in px between consecutive blocks, ADDED to each
   * block's measured `margin-bottom` (which is read from the DOM, so a block
   * wrapper's own `mb-*` class needs no mirroring here). Not applied before
   * the first block on a page. Defaults to 0.
   */
  gapPx?: number;
}

interface UseBlockPaginatorResult {
  /**
   * Call with a block index to get a ref-callback to attach to that block's
   * DOM element.  e.g. `<div ref={setRef(i)}>…</div>`
   */
  setRef: (index: number) => RefCallback;
  /**
   * Pages as arrays of block indices.  Available once all blocks are measured.
   * Before measurement completes this is `[[0, 1, …, count-1]]` (all on one
   * page) so templates can render a sensible initial state.
   */
  pageGroups: number[][];
  /** True once all block heights have been observed. */
  measured: boolean;
  /**
   * Sum of every block's measured height plus the `gapPx` gaps between them
   * (i.e. the column's total natural content height, ignoring pagination).
   * 0 until `measured` is true. Used by "fit to one page" to compute a zoom
   * scale from the un-paginated content height.
   */
  totalHeight: number;
  /** Height in px used on the last page (incl. the header reserve when it is page 0). 0 until measured. */
  lastPageHeight: number;
}

/**
 * Measures the height of `count` DOM blocks via ResizeObserver and groups them
 * into pages using greedy bin-packing (no block is ever split across pages).
 */
export function useBlockPaginator({
  count,
  pageContentHeight,
  firstPageReserved = 0,
  gapPx = 0,
}: UseBlockPaginatorOptions): UseBlockPaginatorResult {
  const elemsRef = useRef<(HTMLElement | null)[]>(
    Array.from({ length: count }, () => null)
  );
  const heightsRef = useRef<number[]>(Array.from({ length: count }, () => 0));
  // Measured `margin-bottom` of each block's element — the real gap rendered
  // below it, which varies per block (section→section vs entry→entry).
  const marginsRef = useRef<number[]>(Array.from({ length: count }, () => 0));
  const observersRef = useRef<ResizeObserver[]>([]);
  // Cached per-index callbacks — prevents React from seeing a new function
  // reference on every render (which would cycle the ref: null → element →
  // recompute → setState → re-render → repeat).
  const refCallbacksRef = useRef<RefCallback[]>([]);

  // Store dimensions in refs so recompute() can stay stable (no deps).
  const pageContentHeightRef = useRef(pageContentHeight);
  const firstPageReservedRef = useRef(firstPageReserved);
  const gapPxRef = useRef(gapPx);
  pageContentHeightRef.current = pageContentHeight;
  firstPageReservedRef.current = firstPageReserved;
  gapPxRef.current = gapPx;

  const [pageGroups, setPageGroups] = useState<number[][]>(() => [
    Array.from({ length: count }, (_, i) => i),
  ]);
  // Nothing to measure when there are no blocks — start "measured" so
  // callers gating on `measured` (e.g. fit-to-page's scale computation)
  // aren't blocked forever by an empty column.
  const [measured, setMeasured] = useState(count === 0);
  const [totalHeight, setTotalHeight] = useState(0);
  const [lastPageHeight, setLastPageHeight] = useState(0);

  // Stable recompute — reads dimensions from refs so its identity never changes.
  const recompute = useCallback(() => {
    const heights = heightsRef.current;
    // Only paginate once every block has a non-zero height.
    if (heights.some((h) => h === 0)) return;
    const gaps = heights.map(
      (_, i) => marginsRef.current[i] + gapPxRef.current
    );
    const groups = groupBlocksIntoPages(
      heights,
      pageContentHeightRef.current,
      firstPageReservedRef.current,
      gaps
    );
    setPageGroups((prev) => {
      // Avoid setState if the result is identical (same page structure).
      if (
        prev.length === groups.length &&
        prev.every(
          (pg, i) =>
            pg.length === groups[i].length &&
            pg.every((v, j) => v === groups[i][j])
        )
      )
        return prev;
      return groups;
    });
    setMeasured(true);
    const sum =
      heights.reduce((acc, h) => acc + h, 0) +
      gaps.slice(0, -1).reduce((acc, g) => acc + g, 0);
    setTotalHeight((prev) => (prev === sum ? prev : sum));
    const last =
      pageUsedHeights(groups, heights, firstPageReservedRef.current, gaps).at(
        -1
      ) ?? 0;
    setLastPageHeight((prev) => (prev === last ? prev : last));
  }, []); // stable — no deps

  // Reset when count changes.
  useEffect(() => {
    observersRef.current.forEach((obs) => obs.disconnect());
    observersRef.current = [];
    refCallbacksRef.current = []; // invalidate cached callbacks for new count

    elemsRef.current = Array.from({ length: count }, () => null);
    heightsRef.current = Array.from({ length: count }, () => 0);
    marginsRef.current = Array.from({ length: count }, () => 0);
    setMeasured(count === 0);
    setTotalHeight(0);
    setLastPageHeight(0);
    setPageGroups([Array.from({ length: count }, (_, i) => i)]);
  }, [count]);

  // Re-paginate when page dimensions change (after measurement).
  useEffect(() => {
    if (measured) recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageContentHeight, firstPageReserved, gapPx]);

  // A block's margin-bottom can change without its own height changing (e.g.
  // the next block moves to another section), and ResizeObserver doesn't see
  // margins — so re-read them after every render and re-paginate on change.
  useEffect(() => {
    let changed = false;
    elemsRef.current.forEach((el, i) => {
      if (!el) return;
      const m = marginBottomOf(el);
      if (marginsRef.current[i] !== m) {
        marginsRef.current[i] = m;
        changed = true;
      }
    });
    if (changed) recompute();
  });

  // setRef is stable. Each per-index callback is created once and cached so
  // React always receives the same function reference — avoiding the pattern
  // where a new function reference causes React to call the old callback with
  // null (zeroing the height) and the new callback with the element
  // (triggering recompute), which would produce a setState on every render.
  const setRef = useCallback(
    (index: number): RefCallback => {
      if (!refCallbacksRef.current[index]) {
        refCallbacksRef.current[index] = (el: HTMLElement | null) => {
          const prev = elemsRef.current[index];
          if (prev === el) return;

          if (observersRef.current[index]) {
            observersRef.current[index].disconnect();
          }

          elemsRef.current[index] = el;

          if (!el) {
            heightsRef.current[index] = 0;
            return;
          }

          const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const h = entry.contentRect.height;
            const m = marginBottomOf(el);
            if (
              heightsRef.current[index] !== h ||
              marginsRef.current[index] !== m
            ) {
              heightsRef.current[index] = h;
              marginsRef.current[index] = m;
              recompute();
            }
          });
          observer.observe(el);
          observersRef.current[index] = observer;
          // offsetHeight, not getBoundingClientRect: the document sits under
          // a CSS `scale()` transform (DocumentCanvas), which rect.height
          // would include; the observer corrects to the exact value anyway.
          heightsRef.current[index] = el.offsetHeight;
          marginsRef.current[index] = marginBottomOf(el);
          recompute();
        };
      }
      return refCallbacksRef.current[index];
    },
    [recompute]
  );

  return { setRef, pageGroups, measured, totalHeight, lastPageHeight };
}
