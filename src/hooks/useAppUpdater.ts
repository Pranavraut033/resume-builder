"use client";

import { invoke } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { useCallback, useEffect, useState } from "react";

import { isTauriContext } from "@/lib/keyStorage";
import { createLogger } from "@/lib/logger";

const log = createLogger("updater");

export type UpdaterState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; update: Update }
  | { status: "downloading"; progress: number }
  // Download finished, install (extract + swap the bundle on disk) is still
  // running — this is a distinct state from "ready" so the UI can't offer
  // Restart before the new bundle is actually in place. See
  // .claude/knowledge/desktop-tauri.md for why that distinction matters.
  | { status: "installing" }
  | { status: "ready" }
  | { status: "error"; message: string; version?: string };

export function useAppUpdater() {
  const [state, setState] = useState<UpdaterState>({ status: "idle" });

  const checkForUpdates = useCallback(async () => {
    setState({ status: "checking" });
    log.info("check started");
    try {
      const update = await check();
      if (update) {
        log.info("update available", {
          current: update.currentVersion,
          available: update.version,
        });
        setState({ status: "available", update });
      } else {
        log.info("already up to date");
        setState({ status: "idle" });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to check for updates";
      log.error("check failed", err);
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
            log.info("download started", { contentLength: total });
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
            // Only the download is done here — install (extract + swap the
            // app bundle on disk) still runs below, inside this same await.
            log.info("download finished, installing");
            setState({ status: "installing" });
            break;
        }
      });

      log.info("install finished");

      // The extracted bundle inherits com.apple.quarantine from this process,
      // and its ad-hoc signature has no Gatekeeper approval — without this the
      // updated app launches as "damaged" and has to be reinstalled by hand.
      try {
        await invoke("clear_quarantine");
        log.info("quarantine cleared");
      } catch (err) {
        // Non-fatal — the update did install, just log so a later "damaged
        // app" report can be traced back to this.
        log.warn("clear_quarantine failed", err);
      }

      setState({ status: "ready" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to install update";
      log.error("install failed", err);
      setState({ status: "error", message, version: update.version });
    }
  }, [state]);

  const dismiss = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  // Fallback path for when in-place install fails or the user would rather
  // do it by hand: download the platform installer to a temp dir, open it,
  // and quit so the old copy isn't still running (and holding port 3009)
  // when they replace it.
  const downloadInstaller = useCallback(async (version: string) => {
    log.info("downloading installer", { version });
    try {
      const path = await invoke<string>("download_installer", { version });
      log.info("installer downloaded", { path });
      const { exit } = await import("@tauri-apps/plugin-process");
      await exit(0);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to download installer";
      log.error("installer download failed", err);
      setState({ status: "error", message, version });
    }
  }, []);

  // Auto-check once on mount (only in Tauri context)
  useEffect(() => {
    if (!isTauriContext()) return;

    const timer = setTimeout(() => {
      checkForUpdates();
    }, 5000); // delay to avoid blocking initial load

    return () => clearTimeout(timer);
  }, [checkForUpdates]);

  return {
    state,
    checkForUpdates,
    downloadAndInstall,
    downloadInstaller,
    dismiss,
  };
}
