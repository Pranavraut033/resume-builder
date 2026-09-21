"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import {
  disconnectGoogleAccount,
  getEmailSyncStatus,
} from "@/actions/emailSync";
import { useToast } from "@/components/ui/ToastProvider";
import { connectGmail } from "@/lib/email/connectGmail";
import {
  clearGoogleAuthTokens,
  getValidAccessToken,
} from "@/lib/email/gmailClient";
import { runEmailSync, startEmailSync } from "@/lib/email/runEmailSync";
import {
  describeSyncProgress,
  useEmailSyncStore,
} from "@/store/emailSyncStore";

/**
 * Connection facts only (DB status + client-side token check). Safe to call
 * from any number of components — react-query shares one fetch per key.
 */
export function useEmailSyncStatus() {
  const {
    data: status,
    isLoading: isStatusLoading,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ["emailSyncStatus"],
    queryFn: () => getEmailSyncStatus(),
    staleTime: 60 * 1000,
  });

  // Whether a usable token exists is client-side state (keyStorage), so it's
  // a separate query from the DB-backed `status` above.
  const { data: hasToken } = useQuery({
    queryKey: ["gmailHasToken"],
    queryFn: async () => {
      try {
        return Boolean(await getValidAccessToken());
      } catch {
        return false;
      }
    },
    staleTime: 60 * 1000,
    enabled: Boolean(status?.hasAccount),
  });

  return {
    status,
    isStatusLoading,
    refetchStatus,
    isConnected: Boolean(status?.hasAccount && hasToken),
  };
}

/**
 * Everything a component needs to show and drive email sync. Holds no state
 * of its own: `isSyncing`/`isConnecting` come from `useEmailSyncStore`, so any
 * number of components stay in agreement. The launch check and the 12-hour
 * timer are NOT here — they run once, in `EmailSyncScheduler`.
 */
export function useEmailSync() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const isSyncing = useEmailSyncStore((s) => s.isSyncing);
  const isConnecting = useEmailSyncStore((s) => s.isConnecting);
  const progress = useEmailSyncStore((s) => s.progress);
  const statusInfo = useEmailSyncStatus();

  // A click while a sync is running joins it (runEmailSync dedupes) — the
  // shared isSyncing already disables every Sync button.
  const syncNow = useCallback(() => runEmailSync(true), []);

  const connect = useCallback(async () => {
    // One sign-in at a time, app-wide: a second click (or a second mounted
    // Connect button) must not open a second browser flow.
    if (useEmailSyncStore.getState().isConnecting) return;
    useEmailSyncStore.setState({ isConnecting: true });
    try {
      const { email } = await connectGmail();
      pushToast({
        title: "Gmail connected",
        description: `Connected account ${email}`,
        variant: "success",
      });
      await queryClient.refetchQueries({ queryKey: ["emailSyncStatus"] });
      void queryClient.invalidateQueries({ queryKey: ["gmailHasToken"] });
      startEmailSync(false);
    } catch (err) {
      pushToast({
        title: "Connection failed",
        description:
          err instanceof Error ? err.message : "Failed to connect Gmail",
        variant: "error",
      });
    } finally {
      useEmailSyncStore.setState({ isConnecting: false });
    }
  }, [pushToast, queryClient]);

  const disconnect = useCallback(async () => {
    try {
      await clearGoogleAuthTokens();
      await disconnectGoogleAccount();
      queryClient.invalidateQueries({ queryKey: ["emailSyncStatus"] });
      queryClient.invalidateQueries({ queryKey: ["gmailHasToken"] });
      pushToast({ title: "Account disconnected", variant: "info" });
    } catch (err) {
      pushToast({
        title: "Disconnect failed",
        description: String(err),
        variant: "error",
      });
    }
  }, [pushToast, queryClient]);

  return {
    ...statusInfo,
    isSyncing,
    /** e.g. "Classifying 3/12" while a sync runs, else null. */
    progressLabel: progress ? describeSyncProgress(progress) : null,
    isConnecting,
    syncNow,
    connect,
    disconnect,
  };
}
