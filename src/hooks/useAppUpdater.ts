"use client";

import { invoke } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { useCallback, useEffect, useState } from "react";

import { isTauriContext } from "@/lib/keyStorage";

export type UpdaterState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; update: Update }
  | { status: "downloading"; progress: number }
  | { status: "ready" }
  | { status: "error"; message: string };

export function useAppUpdater() {
  const [state, setState] = useState<UpdaterState>({ status: "idle" });

  const checkForUpdates = useCallback(async () => {
    setState({ status: "checking" });
    try {
      const update = await check();
      if (update) {
        setState({ status: "available", update });
      } else {
        setState({ status: "idle" });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to check for updates";
      setState({ status: "error", message });
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (state.status !== "available") return;
    const { update } = state;

    let downloaded = 0;
    let total = 0;

    try {
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            total = event.data.contentLength ?? 0;
            setState({ status: "downloading", progress: 0 });
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            setState({
              status: "downloading",
              progress: total > 0 ? Math.round((downloaded / total) * 100) : 0,
            });
            break;
          case "Finished":
            setState({ status: "ready" });
            break;
        }
      });

      // The extracted bundle inherits com.apple.quarantine from this process,
      // and its ad-hoc signature has no Gatekeeper approval — without this the
      // updated app launches as "damaged" and has to be reinstalled by hand.
      await invoke("clear_quarantine").catch(() => {});
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to install update";
      setState({ status: "error", message });
    }
  }, [state]);

  const dismiss = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  // Auto-check once on mount (only in Tauri context)
  useEffect(() => {
    if (!isTauriContext()) return;

    const timer = setTimeout(() => {
      checkForUpdates();
    }, 5000); // delay to avoid blocking initial load

    return () => clearTimeout(timer);
  }, [checkForUpdates]);

  return { state, checkForUpdates, downloadAndInstall, dismiss };
}
