"use client";

import { useEffect, useState } from "react";

/**
 * Creeps toward `ceiling`% every 200ms while `loading` is true and resets to
 * 0 when it flips false. Real duration is unknown (LLM structured calls
 * aren't streamed), so this never claims 100% on its own — it's a "still
 * working" signal for a progress-bar fill, not a real percentage.
 */
export function useFakeProgress(loading: boolean, ceiling = 92) {
  const [percent, setPercent] = useState(0);
  const [trackedLoading, setTrackedLoading] = useState(loading);

  if (loading !== trackedLoading) {
    setTrackedLoading(loading);
    setPercent(0);
  }

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      setPercent((prev) => prev + (ceiling - prev) * 0.08);
    }, 200);
    return () => clearInterval(id);
  }, [loading, ceiling]);

  return loading ? percent : 0;
}
