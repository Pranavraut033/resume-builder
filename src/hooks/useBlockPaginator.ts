"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { groupBlocksIntoPages } from "@/lib/paginator";

type RefCallback = (el: HTMLElement | null) => void;

interface UseBlockPaginatorOptions {
  /** Number of blocks to paginate. Changing this resets measurement. */
  count: number;
  /** Available content height per page in px (page height minus margins). */
  pageContentHeight: number;
  /** Height already reserved on page 1 by the header. Defaults to 0. */
  firstPageReserved?: number;
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
}

/**
 * Measures the height of `count` DOM blocks via ResizeObserver and groups them
 * into pages using greedy bin-packing (no block is ever split across pages).
 */
export function useBlockPaginator({
  count,
  pageContentHeight,
  firstPageReserved = 0,
}: UseBlockPaginatorOptions): UseBlockPaginatorResult {
  const elemsRef = useRef<(HTMLElement | null)[]>(
    Array.from({ length: count }, () => null)
  );
  const heightsRef = useRef<number[]>(Array.from({ length: count }, () => 0));
  const observersRef = useRef<ResizeObserver[]>([]);

  // Store dimensions in refs so recompute() can stay stable (no deps).
  const pageContentHeightRef = useRef(pageContentHeight);
  const firstPageReservedRef = useRef(firstPageReserved);
  pageContentHeightRef.current = pageContentHeight;
  firstPageReservedRef.current = firstPageReserved;

  const [pageGroups, setPageGroups] = useState<number[][]>(() => [
    Array.from({ length: count }, (_, i) => i),
  ]);
  const [measured, setMeasured] = useState(false);

  // Stable recompute — reads dimensions from refs so its identity never changes.
  const recompute = useCallback(() => {
    const heights = heightsRef.current;
    // Only paginate once every block has a non-zero height.
    if (heights.some((h) => h === 0)) return;
    const groups = groupBlocksIntoPages(
      heights,
      pageContentHeightRef.current,
      firstPageReservedRef.current
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
  }, []); // stable — no deps

  // Reset when count changes.
  useEffect(() => {
    observersRef.current.forEach((obs) => obs.disconnect());
    observersRef.current = [];

    elemsRef.current = Array.from({ length: count }, () => null);
    heightsRef.current = Array.from({ length: count }, () => 0);
    setMeasured(false);
    setPageGroups([Array.from({ length: count }, (_, i) => i)]);
  }, [count]);

  // Re-paginate when page dimensions change (after measurement).
  useEffect(() => {
    if (measured) recompute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageContentHeight, firstPageReserved]);

  // setRef is stable because recompute is stable.
  const setRef = useCallback(
    (index: number): RefCallback =>
      (el: HTMLElement | null) => {
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
          if (heightsRef.current[index] !== h) {
            heightsRef.current[index] = h;
            recompute();
          }
        });
        observer.observe(el);
        observersRef.current[index] = observer;
        heightsRef.current[index] = el.getBoundingClientRect().height;
        recompute();
      },
    [recompute]
  );

  return { setRef, pageGroups, measured };
}
