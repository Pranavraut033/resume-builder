"use client";

import { useEffect, useState } from "react";

import { entriesSince } from "@/lib/releaseNotes";
import { RELEASE_NOTES } from "@/lib/releaseNotes.generated";
import { hasSeenForVersion, markSeenForVersion } from "@/lib/versionFlag";

import { WhatsNewModal } from "./WhatsNewModal";

import type { ReleaseNoteEntry } from "@/lib/releaseNotes.generated";

const WHATS_NEW_SEEN_VERSION_KEY = "whatsNew.seenVersion";

/**
 * Shows the What's New modal once per app version, the first time the app
 * launches after an update. Mounted once in the app shell, next to
 * `UpdatePrompt` — this is the counterpart that fires *after* an update
 * lands, rather than before it.
 *
 * The "have we shown this version" flag is stamped immediately on mount
 * (not on close) so a crash or force-quit mid-read doesn't re-show the same
 * notes forever — same tradeoff `KeychainNoticeGate` makes.
 */
export function WhatsNewGate() {
  // Lazy initializer: a pure read of localStorage, computed once on mount
  // rather than in an effect + setState (which would trigger an avoidable
  // extra render for what's really just initial state).
  const [entries] = useState<ReleaseNoteEntry[]>(() => {
    if (typeof window === "undefined") return [];
    if (hasSeenForVersion(WHATS_NEW_SEEN_VERSION_KEY)) return [];
    const lastSeenVersion = localStorage.getItem(WHATS_NEW_SEEN_VERSION_KEY);
    return entriesSince(RELEASE_NOTES, lastSeenVersion);
  });
  const [dismissed, setDismissed] = useState(false);

  // The actual write is a side effect, kept separate from the state read
  // above — stamped once on mount regardless of whether there's anything to
  // show, so a fresh install (nothing to catch up on) still records the
  // version and a crash mid-read doesn't re-show the same notes forever.
  useEffect(() => {
    markSeenForVersion(WHATS_NEW_SEEN_VERSION_KEY);
  }, []);

  if (entries.length === 0 || dismissed) return null;

  return (
    <WhatsNewModal
      isOpen
      onClose={() => setDismissed(true)}
      entries={entries}
    />
  );
}
