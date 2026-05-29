/**
 * Module-level store for the selected profile ID.
 * Persists to localStorage and syncs across all components via useSyncExternalStore.
 */

import { useSyncExternalStore, useCallback } from "react";

const STORAGE_KEY = "selected-profile-id";

let listeners: Array<() => void> = [];
let cachedId: number | null | undefined = undefined;

function readStorage(): number | null {
  const val = localStorage.getItem(STORAGE_KEY);
  if (!val) return null;
  const parsed = parseInt(val, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function subscribe(callback: () => void): () => void {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

function getSnapshot(): number | null {
  if (cachedId === undefined) cachedId = readStorage();
  return cachedId;
}

export function setSelectedProfileId(id: number): void {
  localStorage.setItem(STORAGE_KEY, String(id));
  cachedId = id;
  listeners.forEach((l) => l());
}

export function clearProfileSelection(): void {
  localStorage.removeItem(STORAGE_KEY);
  cachedId = null;
  listeners.forEach((l) => l());
}

export function useProfileSelection() {
  const selectedProfileId = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => null // server snapshot (SSR-safe)
  );

  const setProfile = useCallback((id: number) => setSelectedProfileId(id), []);
  const clearProfile = useCallback(() => clearProfileSelection(), []);

  return {
    selectedProfileId,
    setSelectedProfileId: setProfile,
    clearProfileSelection: clearProfile,
  };
}
