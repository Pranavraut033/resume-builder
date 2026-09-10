"use client";

import { Icon } from "@/components/ui/Icon";
import {
  BookmarkQueueItem,
  useBookmarkQueueStore,
} from "@/store/bookmarkQueueStore";

const QUEUE_STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  running: "Parsing…",
  error: "Failed",
};

export default function BookmarkQueueStrip({
  items,
}: {
  items: BookmarkQueueItem[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="border-agent-primary-fixed bg-agent-surface-low space-y-2 rounded-2xl border p-3">
      <p className="text-agent-primary px-1 text-[11px] font-semibold tracking-widest uppercase">
        Parsing in background
      </p>
      {items.map((item) => (
        <div
          key={item.id}
          className="border-agent-outline-variant bg-agent-surface-lowest flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <p className="text-agent-on-surface truncate text-xs">{item.url}</p>
            {item.status === "error" && item.error && (
              <p className="mt-0.5 text-[11px] text-red-500">{item.error}</p>
            )}
          </div>
          <span className="text-agent-on-surface-variant flex shrink-0 items-center gap-1.5 text-xs font-medium">
            {item.status === "running" && (
              <Icon name="spinner" size={12} className="animate-spin" />
            )}
            {QUEUE_STATUS_LABEL[item.status]}
          </span>
          {item.status === "error" && (
            <button
              type="button"
              onClick={() => useBookmarkQueueStore.getState().retry(item.id)}
              className="text-agent-primary shrink-0 text-xs font-semibold hover:opacity-80"
            >
              Retry
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
