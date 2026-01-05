"use client";

import { useEffect } from "react";

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

  useEffect(() => {
    // Initialize cache on app load
    const initCache = async () => {
      logger.info("Initializing cache on app load");
      await initializeCache();
    };

    initCache();

    // Set up auto-refresh timer every 6 hours
    const timerId = setInterval(async () => {
      logger.info("Auto-refreshing model cache (6 hour interval)");
      await forceFetchModels();
    }, CACHE_DURATION_MS);

    // Store timer ID in store for cleanup
    setCacheTimer(timerId);

    // Cleanup timer on unmount
    return () => {
      clearCacheTimer();
    };
  }, [initializeCache, setCacheTimer, clearCacheTimer, forceFetchModels]);

  // This component doesn't render anything
  return null;
}
