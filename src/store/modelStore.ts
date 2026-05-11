/**
 * Zustand store for managing LLM model state and cache.
 *
 * This store centralizes:
 * - Model cache (fetched models organized by provider)
 * - Selected model for each provider (single model)
 * - Current primary provider
 * - Cache refresh timer management
 *
 * Cache is loaded on app initialization and auto-refreshes every 6 hours.
 * Timer must be cleared when component unmounts (handle in layout).
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { EMPTY_MODELS_MAPS, fetchModels } from "@/lib/llm/clientLLM";
import { createLogger } from "@/lib/logger";
import { ProviderType } from "@/types/llm";

const logger = createLogger("ModelStore");

type ProviderModels = Record<ProviderType, string[]>;
type SelectedModelsArray = Partial<Record<ProviderType, string[]>>;
export type ModelProviderPair = [ProviderType, string]; // [provider, model]

// Cache duration: 6 hours in milliseconds
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000;

interface ModelState {
  // Cached models organized by provider
  modelsByProvider: ProviderModels;
  // Currently selected model (single selection across all providers);
  selectedModel: ModelProviderPair | null;

  // Selected models list by provider (for multi-select UIs)
  selectedModelsByProvider: SelectedModelsArray;

  // Cache timestamp for 6-hour refresh validation
  cacheTimestamp: number | null;

  // Loading state
  isLoading: boolean;

  // Error state
  error: string | null;

  // Auto-refresh timer ID
  cacheTimerId: NodeJS.Timeout | null;

  // Actions
  initializeCache: () => Promise<void>;
  forceFetchModels: (...providers: ProviderType[]) => Promise<void>;
  setSelectedModel: (provider: ProviderType, model: string) => void;
  setProviderModels: (provider: ProviderType, models: string[]) => void;
  clearError: () => void;
  setCacheTimer: (timerId: NodeJS.Timeout) => void;
  clearCacheTimer: () => void;

  // Getters
  getSelectedModel: () => string | null;
  getSelectedProvider: () => ProviderType | null;
  getSelectedModelsForProvider: (provider: ProviderType) => string[] | null;
  getAllSelectedModels: () => SelectedModelsArray;

  // Legacy aliases for UI pages
  loadModels: () => Promise<void>;
  refreshModels: (...providers: ProviderType[]) => Promise<void>;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      modelsByProvider: { ...EMPTY_MODELS_MAPS },
      selectedModelsByProvider: {},
      cacheTimestamp: null,
      selectedModel: null,
      isLoading: false,
      error: null,
      cacheTimerId: null,

      initializeCache: async () => {
        try {
          set({ isLoading: true, error: null });

          // Check if cache exists and is valid based on timestamp
          const { modelsByProvider, cacheTimestamp } = get();
          const now = Date.now();

          if (
            cacheTimestamp &&
            modelsByProvider &&
            Object.keys(modelsByProvider).length > 0 &&
            now - cacheTimestamp < CACHE_DURATION_MS
          ) {
            logger.info("Using existing cache", {
              cacheAge: now - cacheTimestamp,
            });
            set({ isLoading: false });
            return;
          }

          // Cache expired or not found, fetch fresh models
          logger.info("Cache expired or not found, fetching fresh models");
          await get().forceFetchModels();
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to initialize cache";
          logger.error("Error initializing cache", { error });
          set({
            isLoading: false,
            error: errorMessage,
          });
        }
      },

      forceFetchModels: async (...providers: ProviderType[]) => {
        set({ isLoading: true, error: null });

        try {
          // Fetch fresh models from providers
          logger.info("Force fetching models from providers");
          const data = await fetchModels(...providers);
          const now = Date.now();

          set({
            modelsByProvider: data as ProviderModels,
            cacheTimestamp: now,
            isLoading: false,
          });

          logger.info("Models fetched and cached successfully", {
            providers: Object.keys(data),
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to fetch models";
          logger.error("Error fetching models", { error });
          set({
            isLoading: false,
            error: errorMessage,
          });
        }
      },

      setSelectedModel: (provider: ProviderType, model: string) => {
        set({ selectedModel: [provider, model] });

        logger.info("Selected model updated", { provider, model });
      },

      setProviderModels: (provider: ProviderType, models: string[]) => {
        set((state) => ({
          selectedModelsByProvider: {
            ...state.selectedModelsByProvider,
            [provider]: models,
          },
        }));
      },

      clearError: () => {
        set({ error: null });
      },

      setCacheTimer: (timerId: NodeJS.Timeout) => {
        set({ cacheTimerId: timerId });
      },

      clearCacheTimer: () => {
        const { cacheTimerId } = get();
        if (cacheTimerId) {
          clearInterval(cacheTimerId);
          logger.info("Cache timer cleared");
        }
        set({ cacheTimerId: null });
      },

      getSelectedModel: (): string | null => {
        const { selectedModel } = get();
        return selectedModel ? selectedModel[1] : null;
      },

      getSelectedProvider: (): ProviderType | null => {
        const { selectedModel } = get();

        return selectedModel ? selectedModel[0] : null;
      },
      getSelectedModelsForProvider: (
        provider: ProviderType
      ): string[] | null => {
        const { selectedModelsByProvider } = get();
        return selectedModelsByProvider[provider] || null;
      },
      getAllSelectedModels: (): SelectedModelsArray => {
        const { selectedModelsByProvider } = get();
        return selectedModelsByProvider;
      },

      loadModels: async () => {
        await get().initializeCache();
      },

      refreshModels: async (...providers: ProviderType[]) => {
        await get().forceFetchModels(...providers);
      },
    }),
    {
      name: "model-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist selectedModel and selectedModelsByProvider, not modelsByProvider or cacheTimerId
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        selectedModelsByProvider: state.selectedModelsByProvider,
      }),
    }
  )
);
