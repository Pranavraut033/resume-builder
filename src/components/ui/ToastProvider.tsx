"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  ReactNode,
} from "react";
import { useShallow } from "zustand/react/shallow";

import {
  useNotificationStore,
  selectLive,
  type NotificationStatus,
} from "@/store/notificationStore";

import { Icon } from "./Icon";

// Lightweight toast system for inline success/error messaging.
// Internally this is now a thin subscriber over notificationStore — the
// toast stack renders live, transient notifications, and pushToast/
// dismissToast are wrappers around notify/dismiss so the ~18 existing call
// sites don't need to change.
export type ToastVariant = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  pushToast: (toast: Omit<ToastMessage, "id">) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const VARIANT_STYLES: Record<
  ToastVariant,
  { container: string; icon: string }
> = {
  success: {
    container: "bg-emerald-100 text-emerald-900 border-emerald-200",
    icon: "text-emerald-600",
  },
  error: {
    container: "bg-red-100 text-red-900 border-red-200",
    icon: "text-red-600",
  },
  info: {
    container: "bg-blocky-100 text-blocky-900 border-blocky-200",
    icon: "text-blocky-600",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const liveNotifications = useNotificationStore(useShallow(selectLive));
  const toasts = liveNotifications.filter(
    (notification) => notification.transient
  );

  const dismissToast = useCallback((id: string) => {
    useNotificationStore.getState().dismiss(id);
  }, []);

  const pushToast = useCallback(
    (toast: Omit<ToastMessage, "id">) => {
      const status: NotificationStatus = toast.variant ?? "info";
      const id = useNotificationStore.getState().notify({
        title: toast.title,
        description: toast.description,
        status,
        transient: true,
      });
      setTimeout(() => dismissToast(id), 4000);
    },
    [dismissToast]
  );

  const contextValue = useMemo(
    () => ({ pushToast, dismissToast }),
    [pushToast, dismissToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex min-w-[280px] flex-col gap-3">
        {toasts.map((toast) => {
          const variant = (toast.status as ToastVariant) ?? "info";
          const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.info;
          return (
            <div
              key={toast.id}
              role="status"
              className={`shadow-block flex items-start gap-3 rounded-2xl border px-4 py-3 ${styles.container}`}
            >
              <Icon
                name={
                  variant === "error"
                    ? "alert"
                    : variant === "success"
                      ? "check"
                      : "info"
                }
                size={18}
                className={styles.icon}
              />
              <div className="flex-1">
                <p className="text-sm leading-tight font-semibold">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="mt-1 text-xs leading-snug opacity-80">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-gray-500 transition-colors hover:text-gray-800"
                aria-label="Dismiss notification"
              >
                <Icon name="x" size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
