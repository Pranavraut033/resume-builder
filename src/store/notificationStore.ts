/**
 * Zustand store for the app-wide notification system.
 *
 * This is the headless model+controller layer: it holds notification
 * history in memory (no persistence — a fresh process starts clean) and
 * exposes plain selector functions so any number of views (toast stack,
 * bell popover, future tray notification, etc.) can render the same data
 * without duplicating logic.
 *
 * "dismiss" hides a notification from live views (toast stack, unread
 * badge sources that check `!dismissed`) but keeps it in history; "remove"
 * actually deletes it from history. This lets the toast stack auto-hide
 * after a few seconds while the bell's history panel still shows the full
 * log until the user explicitly clears it.
 */

import { create } from "zustand";

export type NotificationStatus = "info" | "success" | "error" | "progress";

export interface Notification {
  id: string;
  title: string;
  description?: string;
  status: NotificationStatus;
  createdAt: number;
  read: boolean;
  transient: boolean; // true => toast view auto-hides it
  meta?: Record<string, unknown>;
  dismissed: boolean;
}

const MAX_HISTORY = 100;

const generateId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

interface NotificationState {
  notifications: Notification[];

  notify: (
    input: Omit<Notification, "id" | "createdAt" | "read" | "dismissed">
  ) => string;
  update: (
    id: string,
    patch: Partial<
      Pick<Notification, "title" | "description" | "status" | "meta">
    >
  ) => void;
  dismiss: (id: string) => void;
  remove: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],

  notify: (input) => {
    const id = generateId();
    const notification: Notification = {
      ...input,
      id,
      createdAt: Date.now(),
      read: false,
      dismissed: false,
    };

    set((state) => ({
      notifications: [notification, ...state.notifications].slice(
        0,
        MAX_HISTORY
      ),
    }));

    return id;
  },

  update: (id, patch) => {
    set((state) => ({
      notifications: state.notifications.map((notification) => {
        if (notification.id !== id) return notification;

        const statusChanged =
          patch.status !== undefined && patch.status !== notification.status;

        return {
          ...notification,
          ...patch,
          // A progress notification transitioning to success/error is a new
          // event worth surfacing again even if the live view had already
          // dismissed the in-flight "progress" entry.
          dismissed:
            statusChanged &&
            (patch.status === "success" || patch.status === "error")
              ? false
              : notification.dismissed,
        };
      }),
    }));
  },

  dismiss: (id) => {
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === id
          ? { ...notification, dismissed: true }
          : notification
      ),
    }));
  },

  remove: (id) => {
    set((state) => ({
      notifications: state.notifications.filter(
        (notification) => notification.id !== id
      ),
    }));
  },

  markRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      ),
    }));
  },

  markAllRead: () => {
    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        read: true,
      })),
    }));
  },

  clear: () => {
    set({ notifications: [] });
  },
}));

// Plain selector functions, composable outside of React via
// `useNotificationStore.getState()`. `selectLive` allocates a new array on
// every call — in a component, subscribe via
// `useNotificationStore(useShallow(selectLive))` (zustand/react/shallow),
// not a bare selector, or React's useSyncExternalStore will see a "changed"
// snapshot on every render and loop.
export const selectLive = (state: NotificationState): Notification[] =>
  state.notifications.filter((notification) => !notification.dismissed);

export const selectHistory = (state: NotificationState): Notification[] =>
  state.notifications;

export const selectUnreadCount = (state: NotificationState): number =>
  state.notifications.filter((notification) => !notification.read).length;
