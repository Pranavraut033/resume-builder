"use client";

import { relaunch } from "@tauri-apps/plugin-process";

import { useAppUpdater } from "@/hooks/useAppUpdater";
import { cn } from "@/lib/cn";

export function UpdatePrompt() {
  const { state, downloadAndInstall, dismiss } = useAppUpdater();

  if (state.status === "idle" || state.status === "checking") return null;

  if (state.status === "error") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm",
          "bg-agent-error-container text-agent-on-error-container"
        )}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className="flex-1">Update check failed: {state.message}</span>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 opacity-70 hover:opacity-100"
          aria-label="Dismiss"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    );
  }

  if (state.status === "available") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm",
          "bg-agent-primary-container text-agent-on-primary-container"
        )}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="16 16 12 12 8 16" />
          <line x1="12" y1="12" x2="12" y2="21" />
          <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
        </svg>
        <span className="flex-1">
          Update {state.update.version} is available
        </span>
        <button
          type="button"
          onClick={downloadAndInstall}
          className="shrink-0 rounded-md px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80"
          style={{
            background: "var(--color-agent-primary)",
            color: "var(--color-agent-on-primary)",
          }}
        >
          Update now
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 opacity-70 hover:opacity-100"
          aria-label="Dismiss"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    );
  }

  if (state.status === "downloading") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm",
          "bg-agent-primary-container text-agent-on-primary-container"
        )}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-spin"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span className="flex-1">
          Downloading update… {state.progress > 0 ? `${state.progress}%` : ""}
        </span>
        {state.progress > 0 && (
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-current/20">
            <div
              className="h-full rounded-full bg-current transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  if (state.status === "ready") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm",
          "bg-agent-secondary-container text-agent-on-secondary-container"
        )}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="flex-1">Update ready — restart to apply</span>
        <button
          type="button"
          onClick={() => relaunch()}
          className="shrink-0 rounded-md px-3 py-1 text-xs font-semibold transition-opacity hover:opacity-80"
          style={{
            background: "var(--color-agent-secondary)",
            color: "var(--color-agent-on-secondary)",
          }}
        >
          Restart now
        </button>
      </div>
    );
  }

  return null;
}
