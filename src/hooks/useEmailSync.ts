"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  getEmailSyncStatus,
  triggerEmailSync,
  disconnectGoogleAccount,
  getGoogleAuthUrl,
} from "@/actions/emailSync";
import { useToast } from "@/components/ui/ToastProvider";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export function useEmailSync() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const launchCheckedRef = useRef(false);

  const {
    data: status,
    isLoading: isStatusLoading,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ["emailSyncStatus"],
    queryFn: () => getEmailSyncStatus(),
    staleTime: 60 * 1000,
  });

  const syncMutation = useMutation({
    mutationFn: async (isManual: boolean = false) => {
      setIsSyncing(true);
      try {
        const result = await triggerEmailSync();
        if (result.success) {
          queryClient.invalidateQueries({ queryKey: ["emailSyncStatus"] });
          queryClient.invalidateQueries({ queryKey: ["jobs"] });
          queryClient.invalidateQueries({ queryKey: ["jobEmails"] });

          if (isManual) {
            pushToast({
              title: "Email sync completed",
              description: `Found ${result.newEmailsCount} new emails (${result.matchedJobsCount} linked to jobs)`,
              variant: "success",
            });
          }
        } else if (isManual && result.status !== "NOT_CONNECTED") {
          pushToast({
            title: "Email sync failed",
            description: result.error || "Failed to fetch messages",
            variant: "error",
          });
        }
        return result;
      } finally {
        setIsSyncing(false);
      }
    },
  });

  const syncNow = useCallback(() => {
    return syncMutation.mutateAsync(true);
  }, [syncMutation]);

  // Check on launch: if not synced for > 6 hours, trigger background sync
  useEffect(() => {
    if (launchCheckedRef.current || !status?.isConnected || isStatusLoading) {
      return;
    }

    launchCheckedRef.current = true;

    const lastSyncTime = status.lastSyncedAt
      ? new Date(status.lastSyncedAt).getTime()
      : 0;
    const now = Date.now();

    if (!lastSyncTime || now - lastSyncTime > SIX_HOURS_MS) {
      syncMutation.mutate(false);
    }
  }, [status, isStatusLoading, syncMutation]);

  // Twice-a-day background sync interval (12 hours) while app is open
  useEffect(() => {
    if (!status?.isConnected) return;

    const interval = setInterval(() => {
      syncMutation.mutate(false);
    }, TWELVE_HOURS_MS);

    return () => clearInterval(interval);
  }, [status?.isConnected, syncMutation]);

  // Connect Google account handler (opens popup, listens for success)
  const connect = useCallback(async () => {
    try {
      const origin = window.location.origin;
      const url = await getGoogleAuthUrl(origin);

      const width = 540;
      const height = 660;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        url,
        "GoogleAuthPopup",
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      );

      const messageHandler = (event: MessageEvent) => {
        if (event.data?.type === "GOOGLE_AUTH_SUCCESS") {
          window.removeEventListener("message", messageHandler);
          pushToast({
            title: "Gmail connected",
            description: `Connected account ${event.data.email || ""}`,
            variant: "success",
          });
          refetchStatus();
          syncNow();
        }
      };

      window.addEventListener("message", messageHandler);

      // Fallback: poll popup closure if postMessage is blocked
      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          window.removeEventListener("message", messageHandler);
          refetchStatus();
        }
      }, 1000);
    } catch (err) {
      pushToast({
        title: "Connection failed",
        description: err instanceof Error ? err.message : "Failed to open login",
        variant: "error",
      });
    }
  }, [pushToast, refetchStatus, syncNow]);

  const disconnect = useCallback(async () => {
    try {
      await disconnectGoogleAccount();
      queryClient.invalidateQueries({ queryKey: ["emailSyncStatus"] });
      pushToast({
        title: "Account disconnected",
        variant: "info",
      });
    } catch (err) {
      pushToast({
        title: "Disconnect failed",
        description: String(err),
        variant: "error",
      });
    }
  }, [pushToast, queryClient]);

  return {
    status,
    isStatusLoading,
    isSyncing: isSyncing || syncMutation.isPending,
    syncNow,
    connect,
    disconnect,
    refetchStatus,
  };
}
