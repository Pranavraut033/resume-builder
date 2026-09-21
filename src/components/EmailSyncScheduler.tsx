"use client";

import { useEffect, useRef } from "react";

import { wipeLegacyPlaintextTokens } from "@/actions/emailSync";
import { useEmailSyncStatus } from "@/hooks/useEmailSync";
import { startEmailSync } from "@/lib/email/runEmailSync";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

/**
 * The one background email-sync driver, mounted once at the app root. It used
 * to live inside `useEmailSync`, so every mounted copy (Settings, /emails,
 * /opportunities, the home table) ran its own launch check and its own 12-hour
 * timer. Manual and background syncs still funnel through `runEmailSync`,
 * which joins an in-flight run instead of starting a second.
 */
export function EmailSyncScheduler() {
  const { status, isConnected, isStatusLoading } = useEmailSyncStatus();
  const wipedRef = useRef(false);
  const launchCheckedRef = useRef(false);

  // One-time cleanup for installs that connected on an older build, when
  // tokens were (incorrectly) written to SQLite. See wipeLegacyPlaintextTokens.
  useEffect(() => {
    if (wipedRef.current) return;
    wipedRef.current = true;
    void wipeLegacyPlaintextTokens();
  }, []);

  // On launch: if not synced for > 6 hours, sync in the background.
  useEffect(() => {
    if (launchCheckedRef.current || !isConnected || isStatusLoading) return;
    launchCheckedRef.current = true;

    const last = status?.lastSyncedAt
      ? new Date(status.lastSyncedAt).getTime()
      : 0;
    if (!last || Date.now() - last > SIX_HOURS_MS) startEmailSync(false);
  }, [isConnected, isStatusLoading, status?.lastSyncedAt]);

  // Twice a day while the app is open.
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => startEmailSync(false), TWELVE_HOURS_MS);
    return () => clearInterval(interval);
  }, [isConnected]);

  return null;
}
