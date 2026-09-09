"use client";

import { relaunch } from "@tauri-apps/plugin-process";

import { Modal } from "@/components/ui/Modal";
import { useAppUpdaterContext } from "@/contexts/AppUpdaterContext";

export function UpdatePrompt() {
  const { state, downloadAndInstall, downloadInstaller, dismiss } =
    useAppUpdaterContext();

  if (state.status === "idle" || state.status === "checking") {
    return null;
  }

  const title =
    state.status === "available"
      ? "Update available"
      : state.status === "downloading"
        ? "Downloading update"
        : state.status === "installing"
          ? "Installing update"
          : state.status === "ready"
            ? "Update ready"
            : "Update failed";

  return (
    <Modal
      isOpen
      onClose={dismiss}
      title={title}
      cancelLabel={
        state.status === "downloading" || state.status === "installing"
          ? "Hide"
          : "Later"
      }
      primaryAction={
        state.status === "available"
          ? downloadAndInstall
          : state.status === "ready"
            ? () => relaunch()
            : state.status === "error"
              ? state.version
                ? () => downloadInstaller(state.version!)
                : undefined
              : undefined
      }
      primaryActionLabel={
        state.status === "available"
          ? "Update now"
          : state.status === "error"
            ? "Download installer"
            : "Restart now"
      }
      primaryActionButtonType={
        state.status === "ready" ? "secondary" : "primary"
      }
      size="sm"
    >
      {state.status === "available" && (
        <div className="space-y-3">
          <p className="text-agent-on-surface-variant text-sm">
            Version {state.update.version} is available. Update now to install
            the latest improvements.
          </p>
          <button
            onClick={() => downloadInstaller(state.update.version)}
            className="text-agent-primary text-sm underline"
          >
            Or download the installer manually
          </button>
        </div>
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

      {state.status === "installing" && (
        <p className="text-agent-on-surface-variant text-sm">
          Installing the update — this can take a minute. Don&apos;t quit the
          app.
        </p>
      )}

      {state.status === "ready" && (
        <p className="text-agent-on-surface-variant text-sm">
          The update has been downloaded and is ready to install. Restart now to
          apply it.
        </p>
      )}

      {state.status === "error" && (
        <p className="text-agent-on-surface-variant text-sm">
          {state.message || "Failed to check for updates"}
          {state.version
            ? " You can download and run the installer manually instead."
            : ""}
        </p>
      )}
    </Modal>
  );
}
