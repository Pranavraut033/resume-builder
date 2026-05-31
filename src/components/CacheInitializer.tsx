"use client";

import { isTauri } from "@tauri-apps/api/core";
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

    // On every app launch / page refresh, evict any child webviews that
    // survived from a previous JS context (the OS keeps them alive even when
    // the main webview reloads).  We close everything except the primary
    // "main" webview that hosts the Next.js app itself.
    if (isTauri()) {
      import("@tauri-apps/api/webview")
        .then(({ getAllWebviews }) => {
          const views = getAllWebviews();
          console.log(views);
          return views;
        })
        .then((views) =>
          Promise.all(
            views
              .filter((v) => v.label !== "main")
              .map((v) => v.close().catch(() => {}))
          )
        )
        .catch((err) => logger.error("Failed to sweep stale webviews", err));
    }

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
