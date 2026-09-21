/**
 * App-wide email sync/connect state — the one source of truth.
 *
 * Sync can be started from Settings, /emails, /opportunities, the home table
 * and the background scheduler. Each used to keep its own `isSyncing` (a
 * per-component mutation), so a sync started in one place looked idle in the
 * others and every mounted copy ran its own launch check and timer. Now the
 * flags live here; `runEmailSync` (the only writer for `isSyncing`) flips them
 * around the single in-flight run, so every reader agrees.
 */

import { create } from "zustand";

export type SyncPhase = "fetching" | "classifying" | "saving";

export interface SyncProgress {
  phase: SyncPhase;
  /** Items finished in this phase; `total` 0 means the count isn't known yet. */
  done: number;
  total: number;
}

/** Short human text for a button label or notification line. */
export function describeSyncProgress(p: SyncProgress): string {
  switch (p.phase) {
    case "fetching":
      return p.total > 0
        ? `Fetching emails ${p.done}/${p.total}`
        : "Checking Gmail…";
    case "classifying":
      return `Classifying ${p.done}/${p.total}`;
    case "saving":
      return "Saving…";
  }
}

interface EmailSyncState {
  /** A sync run is in flight (from any caller, manual or background). */
  isSyncing: boolean;
  /** Where the in-flight run is; null when idle. Cleared together with `isSyncing`. */
  progress: SyncProgress | null;
  /** A Gmail sign-in is waiting on the user's browser. */
  isConnecting: boolean;
}

export const useEmailSyncStore = create<EmailSyncState>()(() => ({
  isSyncing: false,
  progress: null,
  isConnecting: false,
}));
