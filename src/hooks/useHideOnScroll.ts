"use client";

import { RefObject, useEffect, useRef, useState } from "react";

/**
 * Tracks scroll direction on any scrollable descendant of `containerRef`.
 * Listens in the capture phase since native `scroll` events don't bubble,
 * so this works regardless of which inner element actually scrolls.
 *
 * Returns true once the user scrolls down past `threshold`, false again as
 * soon as they scroll back up. `resetKey` clears the hidden state and scroll
 * baseline when it changes (e.g. switching tabs resets the inner scroll top).
 */
export function useHideOnScroll(
  containerRef: RefObject<HTMLElement | null>,
  resetKey?: unknown,
  threshold = 40
) {
  const [hidden, setHidden] = useState(false);
  const lastScrollTop = useRef(0);

  // Reset `hidden` when `resetKey` changes (e.g. switching tabs), following
  // React's "adjust state during render" pattern instead of an extra effect.
  // Refs can't be touched during render, so the scroll baseline is reset
  // separately below — the first scroll event after a reset always computes
  // a large delta anyway, so a stale baseline for one tick is harmless.
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setHidden(false);
  }

  useEffect(() => {
    lastScrollTop.current = 0;
  }, [resetKey]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = (e: Event) => {
      const scrollTop = (e.target as HTMLElement).scrollTop;
      const delta = scrollTop - lastScrollTop.current;
      if (Math.abs(delta) < 4) return;
      setHidden(delta > 0 && scrollTop > threshold);
      lastScrollTop.current = scrollTop;
    };

    el.addEventListener("scroll", handleScroll, true);
    return () => el.removeEventListener("scroll", handleScroll, true);
  }, [containerRef, threshold]);

  return hidden;
}
