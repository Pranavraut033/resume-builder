"use client";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useEmailSync } from "@/hooks/useEmailSync";

/**
 * The Sync Now button. Reads the shared sync state, so a sync started
 * anywhere (another page's button, the scheduler) shows here too and can't be
 * double-fired.
 */
export function EmailSyncButton({
  variant = "secondary",
  size = "sm",
  label = "Sync now",
}: {
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  label?: string;
}) {
  const { isConnected, isSyncing, progressLabel, syncNow } = useEmailSync();
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => void syncNow()}
      disabled={!isConnected || isSyncing}
      aria-busy={isSyncing}
      icon={
        <Icon
          name={isSyncing ? "spinner" : "refreshCw"}
          className={isSyncing ? `${iconSize} animate-spin` : iconSize}
        />
      }
    >
      {isSyncing ? (progressLabel ?? "Syncing…") : label}
    </Button>
  );
}
