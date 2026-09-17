"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  disconnectGoogleAccount,
  getEmailSyncStatus,
  wipeLegacyPlaintextTokens,
} from "@/actions/emailSync";
import { useToast } from "@/components/ui/ToastProvider";
import { connectGmail } from "@/lib/email/connectGmail";
import {
  clearGoogleAuthTokens,
  getValidAccessToken,
} from "@/lib/email/gmailClient";
import { runEmailSync } from "@/lib/email/runEmailSync";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export function useEmailSync() {
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const launchCheckedRef = useRef(false);
  const wipeCheckedRef = useRef(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // One-time cleanup for installs that connected on an older build, when
  // tokens were (incorrectly) written to SQLite. See
  // wipeLegacyPlaintextTokens's doc comment.
  useEffect(() => {
    if (wipeCheckedRef.current) return;
    wipeCheckedRef.current = true;
    void wipeLegacyPlaintextTokens();
  }, []);

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

  const isConnected = Boolean(status?.hasAccount && hasToken);

  const syncMutation = useMutation({
    mutationFn: (isManual: boolean) => runEmailSync(isManual),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailSyncStatus"] });
      queryClient.invalidateQueries({ queryKey: ["gmailHasToken"] });
    },
  });

  const syncNow = useCallback(
    () => syncMutation.mutateAsync(true),
    [syncMutation]
  );

  // Check on launch: if not synced for > 6 hours, trigger background sync
  useEffect(() => {
    if (launchCheckedRef.current || !isConnected || isStatusLoading) {
      return;
    }

    launchCheckedRef.current = true;

    const lastSyncTime = status?.lastSyncedAt
      ? new Date(status.lastSyncedAt).getTime()
      : 0;
    const now = Date.now();

    if (!lastSyncTime || now - lastSyncTime > SIX_HOURS_MS) {
      syncMutation.mutate(false);
    }
  }, [isConnected, status, isStatusLoading, syncMutation]);

  // Twice-a-day background sync interval (12 hours) while app is open
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      syncMutation.mutate(false);
    }, TWELVE_HOURS_MS);

    return () => clearInterval(interval);
  }, [isConnected, syncMutation]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const { email } = await connectGmail();
      pushToast({
        title: "Gmail connected",
        description: `Connected account ${email}`,
        variant: "success",
      });
      await refetchStatus();
      queryClient.invalidateQueries({ queryKey: ["gmailHasToken"] });
      syncMutation.mutate(false);
    } catch (err) {
      pushToast({
        title: "Connection failed",
        description:
          err instanceof Error ? err.message : "Failed to connect Gmail",
        variant: "error",
      });
    } finally {
      setIsConnecting(false);
    }
  }, [pushToast, queryClient, refetchStatus, syncMutation]);

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
    status,
    isConnected,
    isStatusLoading,
    isSyncing: syncMutation.isPending,
    isConnecting,
    syncNow,
    connect,
    disconnect,
    refetchStatus,
  };
}
