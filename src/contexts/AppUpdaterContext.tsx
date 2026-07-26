"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useAppUpdater } from "@/hooks/useAppUpdater";

type AppUpdaterContextValue = ReturnType<typeof useAppUpdater>;

const AppUpdaterContext = createContext<AppUpdaterContextValue | null>(null);

export function AppUpdaterProvider({ children }: { children: ReactNode }) {
  const updater = useAppUpdater();
  return (
    <AppUpdaterContext.Provider value={updater}>
      {children}
    </AppUpdaterContext.Provider>
  );
}

export function useAppUpdaterContext(): AppUpdaterContextValue {
  const ctx = useContext(AppUpdaterContext);
  if (!ctx) {
    throw new Error(
      "useAppUpdaterContext must be used within an AppUpdaterProvider"
    );
  }
  return ctx;
}
