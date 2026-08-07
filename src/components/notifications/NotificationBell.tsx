"use client";

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { useShallow } from "zustand/react/shallow";

import {
  useNotificationStore,
  selectHistory,
  selectUnreadCount,
  type NotificationStatus,
} from "@/store/notificationStore";

import { Icon } from "../ui/Icon";

const STATUS_DOT_STYLES: Record<NotificationStatus, string> = {
  success: "bg-emerald-500",
  error: "bg-red-500",
  info: "bg-blocky-500",
  progress: "bg-amber-500",
};

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Bell icon + unread badge that opens a popover panel over notification
 * history. Purely presentational — all state lives in `notificationStore`.
 *
 * Exported only: a different cluster mounts this into Nav.tsx.
 */
export function NotificationBell() {
  const history = useNotificationStore(useShallow(selectHistory));
  const unreadCount = useNotificationStore(selectUnreadCount);
  const remove = useNotificationStore((state) => state.remove);
  const clear = useNotificationStore((state) => state.clear);
  const markAllRead = useNotificationStore((state) => state.markAllRead);

  return (
    <Popover className="relative">
      {/* PopoverButton is a toggle, so this fires on both open and close —
          markAllRead is idempotent so that's fine; simpler than wiring a
          separate "just opened" transition via PopoverPanel's render-prop. */}
      <PopoverButton
        onClick={() => markAllRead()}
        className="text-agent-inverse-on-surface hover:bg-agent-surface-lowest hover:text-agent-on-surface relative flex items-center justify-center rounded-xl p-2.5 transition-colors focus:outline-none"
        aria-label="Notifications"
      >
        <Icon name="bell" size={17} />
        {unreadCount > 0 && (
          <span className="bg-agent-error absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </PopoverButton>

      <PopoverPanel
        anchor="bottom end"
        className="border-agent-outline-variant bg-agent-surface-high shadow-agent-card z-50 mt-2 w-80 origin-top-right overflow-hidden rounded-xl border ring-1 ring-black/5 focus:outline-none"
      >
        <div className="border-agent-outline-variant flex items-center justify-between border-b px-4 py-2.5">
          <span className="text-agent-on-surface text-sm font-semibold">
            Notifications
          </span>
          <button
            type="button"
            onClick={() => clear()}
            className="text-agent-outline hover:text-agent-on-surface text-xs font-medium transition-colors"
          >
            Clear all
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {history.length === 0 ? (
            <p className="text-agent-outline px-4 py-6 text-center text-sm">
              No notifications yet
            </p>
          ) : (
            history.map((notification) => (
              <div
                key={notification.id}
                className={`border-agent-outline-variant flex items-start gap-2.5 border-b px-4 py-3 last:border-b-0 ${
                  notification.read ? "" : "bg-agent-primary-fixed/20"
                }`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT_STYLES[notification.status]}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-agent-on-surface text-sm leading-tight font-medium">
                    {notification.title}
                  </p>
                  {notification.description && (
                    <p className="text-agent-outline mt-0.5 text-xs leading-snug">
                      {notification.description}
                    </p>
                  )}
                  <p className="text-agent-outline mt-1 text-[11px]">
                    {formatRelativeTime(notification.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(notification.id)}
                  className="text-agent-outline hover:text-agent-on-surface shrink-0 transition-colors"
                  aria-label="Remove notification"
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </PopoverPanel>
    </Popover>
  );
}
