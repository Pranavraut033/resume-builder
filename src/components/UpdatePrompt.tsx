"use client";

import { relaunch } from "@tauri-apps/plugin-process";
import { useEffect } from "react";

import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { useAppUpdaterContext } from "@/contexts/AppUpdaterContext";

export function UpdatePrompt() {
  const { state, downloadAndInstall, dismiss } = useAppUpdaterContext();
  const { pushToast } = useToast();

  useEffect(() => {
    if (state.status !== "error") return;

    pushToast({
      title: "Update check failed",
      description: state.message || "Failed to check for updates",
      variant: "error",
    });

    dismiss();
  }, [dismiss, pushToast, state]);

  if (
    state.status === "idle" ||
    state.status === "checking" ||
    state.status === "error"
  ) {
    return null;
  }

  const title =
    state.status === "available"
      ? "Update available"
      : state.status === "downloading"
        ? "Downloading update"
        : "Update ready";

  return (
    <Modal
      isOpen
      onClose={dismiss}
      title={title}
      cancelLabel={state.status === "downloading" ? "Hide" : "Later"}
      primaryAction={
        state.status === "available"
          ? downloadAndInstall
          : state.status === "ready"
            ? () => relaunch()
            : undefined
      }
      primaryActionLabel={
        state.status === "available" ? "Update now" : "Restart now"
      }
      primaryActionButtonType={
        state.status === "ready" ? "secondary" : "primary"
      }
      size="sm"
    >
      {state.status === "available" && (
        <p className="text-agent-on-surface-variant text-sm">
          Version {state.update.version} is available. Update now to install the
          latest improvements.
        </p>
      )}

      {state.status === "downloading" && (
        <div className="space-y-3">
          <p className="text-agent-on-surface-variant text-sm">
            Downloading update
            {state.progress > 0 ? ` (${state.progress}%)` : "..."}
          </p>
          <div className="bg-agent-surface-low h-2 w-full overflow-hidden rounded-full">
            <div
              className="bg-agent-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
      )}

      {state.status === "ready" && (
        <p className="text-agent-on-surface-variant text-sm">
          The update has been downloaded and is ready to install. Restart now to
          apply it.
        </p>
      )}
    </Modal>
  );
}
