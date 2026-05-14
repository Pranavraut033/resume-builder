"use client";

import { useEffect, useRef } from "react";

import { createLogger } from "@/lib/logger";
import { useModelStore } from "@/store/modelStore";

const logger = createLogger("CacheInitializer");

// Cache duration: 6 hours in milliseconds
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000;

/**
 * CacheInitializer Component
 *
 * Handles cache initialization and auto-refresh on app load.
 * - Initializes model cache on mount
 * - Sets up auto-refresh timer every 6 hours
 * - Clears timer on unmount to prevent memory leaks
 */
export function CacheInitializer() {
  const { initializeCache, setCacheTimer, clearCacheTimer, forceFetchModels } =
    useModelStore();

  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    void initializeCache();

    const timerId = setInterval(() => {
      void forceFetchModels().catch((err) => {
        logger.error("Cache refresh failed", err);
      });
    }, CACHE_DURATION_MS);

    // Store timer ID in store for cleanup
    setCacheTimer(timerId);

    // Cleanup timer on unmount
    return () => {
      clearInterval(timerId);
      clearCacheTimer();
    };
  }, [initializeCache, setCacheTimer, clearCacheTimer, forceFetchModels]);

  // This component doesn't render anything
  return null;
}
