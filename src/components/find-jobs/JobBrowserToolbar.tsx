"use client";

interface JobBrowserToolbarProps {
  onWebviewBack: () => void;
  onMainBack: () => void;
  onRefresh: () => void;
  currentUrl: string;
  onAddToTracker: () => void;
  isAddingToTracker: boolean;
}

export default function JobBrowserToolbar({
  onWebviewBack,
  onMainBack,
  onRefresh,
  currentUrl,
  onAddToTracker,
  isAddingToTracker,
}: JobBrowserToolbarProps) {
  return (
    <div
      className="flex shrink-0 items-center gap-2 border-b px-3 py-2"
      style={{
        background: "var(--color-agent-surface-lowest)",
        borderColor: "var(--color-agent-outline-variant)",
      }}
    >
      {/* Back to search */}
      <button
        type="button"
        onClick={onMainBack}
        title="Back to search"
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-(--color-agent-surface-container)"
        style={{ color: "var(--color-agent-on-surface-variant)" }}
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
        >
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Search
      </button>

      <div
        className="h-4 w-px shrink-0"
        style={{ background: "var(--color-agent-outline-variant)" }}
      />

      {/* Webview back */}
      <button
        type="button"
        onClick={onWebviewBack}
        title="Go back"
        className="rounded-lg p-1.5 transition-colors hover:bg-(--color-agent-surface-container)"
        style={{ color: "var(--color-agent-on-surface-variant)" }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Refresh */}
      <button
        type="button"
        onClick={onRefresh}
        title="Refresh"
        className="rounded-lg p-1.5 transition-colors hover:bg-(--color-agent-surface-container)"
        style={{ color: "var(--color-agent-on-surface-variant)" }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      </button>

      {/* URL display */}
      <div
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-1.5 text-xs"
        style={{
          background: "var(--color-agent-surface-container)",
          color: "var(--color-agent-on-surface-variant)",
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 opacity-60"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <span className="truncate">{currentUrl || "Loading…"}</span>
      </div>

      {/* Add to Tracker */}
      <button
        type="button"
        onClick={onAddToTracker}
        disabled={isAddingToTracker}
        className="flex shrink-0 items-center gap-2 rounded-xl px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        style={{ background: "var(--color-agent-primary)" }}
      >
        {isAddingToTracker ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Analyzing…
          </>
        ) : (
          <>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add to Tracker
          </>
        )}
      </button>
    </div>
  );
}
