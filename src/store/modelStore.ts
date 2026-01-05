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

import { fetchModels } from "@/lib/clientLLM";
import { createLogger } from "@/lib/logger";
import { ProviderType } from "@/types/llm";

const logger = createLogger("ModelStore");

type ProviderModels = Record<string, string[]>;
type SelectedModels = Record<string, string>; // Single model per provider
type SelectedModelsArray = Record<string, string[]>;

// Cache duration: 6 hours in milliseconds
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000;

interface ModelState {
  // Cached models organized by provider
  modelsByProvider: ProviderModels;

  // Selected models list by provider (for multi-select UIs)
  selectedModelsByProvider: SelectedModelsArray;

  // Cache timestamp for 6-hour refresh validation
  cacheTimestamp: number | null;

  // Currently selected model for each provider (single model)
  selectedModel: SelectedModels;

  // Current primary provider
  selectedProvider: string;

  // Loading state
  isLoading: boolean;

  // Error state
  error: string | null;

  // Auto-refresh timer ID
  cacheTimerId: NodeJS.Timeout | null;

  // Actions
  initializeCache: () => Promise<void>;
  forceFetchModels: () => Promise<void>;
  setSelectedModel: (provider: string, model: string) => void;
  setSelectedProvider: (provider: string) => void;
  setProviderModels: (provider: string, models: string[]) => void;
  clearError: () => void;
  setCacheTimer: (timerId: NodeJS.Timeout) => void;
  clearCacheTimer: () => void;

  // Getters
  getSelectedModel: (provider: string) => string;
  getSelectedProvider: () => string;
  getAllSelectedModels: () => string[];

  // Legacy aliases for UI pages
  loadModels: () => Promise<void>;
  refreshModels: () => Promise<void>;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      modelsByProvider: {},
      selectedModelsByProvider: {},
      cacheTimestamp: null,
      selectedModel: {},
      selectedProvider: "",
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
            error instanceof Error ? error.message : "Failed to initialize cache";
          logger.error("Error initializing cache", { error });
          set({
            isLoading: false,
            error: errorMessage,
          });
        }
      },

      forceFetchModels: async () => {
        set({ isLoading: true, error: null });

        try {
          // Fetch fresh models from providers
          logger.info("Force fetching models from providers");
          const data = await fetchModels();
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

      setSelectedModel: (provider: string, model: string) => {
        const { selectedModel, selectedModelsByProvider } = get();

        const updatedSelections = {
          ...selectedModel,
          [provider]: model,
        };

        const updatedLists: SelectedModelsArray = {
          ...selectedModelsByProvider,
          [provider]: model ? [model] : [],
        };

        set({
          selectedModel: updatedSelections,
          selectedModelsByProvider: updatedLists,
        });

        logger.info("Selected model updated", { provider, model });
      },

      setSelectedProvider: (provider: string) => {
        // Clear the selected model for the new provider to force explicit selection
        const { selectedModel, selectedModelsByProvider } = get();

        const updatedSelections = {
          ...selectedModel,
          [provider]: "", // Clear model for new provider
        };

        const updatedLists: SelectedModelsArray = {
          ...selectedModelsByProvider,
          [provider]: [],
        };

        set({
          selectedProvider: provider,
          selectedModel: updatedSelections,
          selectedModelsByProvider: updatedLists,
        });

        logger.info("Provider changed and model cleared", { provider });
      },

      setProviderModels: (provider: string, models: string[]) => {
        const firstModel = models[0] || "";

        set((state) => ({
          selectedModelsByProvider: {
            ...state.selectedModelsByProvider,
            [provider]: models,
          },
          selectedModel: {
            ...state.selectedModel,
            [provider]: firstModel,
          },
        }));

        if (firstModel) {
          logger.info("Provider models updated", { provider, firstModel });
        }
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

      getSelectedModel: (provider: string) => {
        const { selectedModel } = get();
        return selectedModel[provider] || "";
      },

      getSelectedProvider: () => {
        const { selectedProvider, selectedModel } = get();

        // Return current provider if valid and has a selected model
        if (selectedProvider && selectedModel[selectedProvider]) {
          return selectedProvider;
        }

        // Otherwise return first provider with a selected model
        const providersWithModels = Object.entries(selectedModel).filter(
          ([, model]) => model.length > 0
        );

        return providersWithModels.length > 0
          ? providersWithModels[0][0]
          : ProviderType.OLLAMA;
      },

      getAllSelectedModels: () => {
        const { selectedModelsByProvider, selectedModel } = get();

        const arraySelections = Object.values(selectedModelsByProvider).flat();
        if (arraySelections.length > 0) {
          return arraySelections.filter(Boolean);
        }

        return Object.values(selectedModel).filter((m) => m && m.length > 0);
      },

      loadModels: async () => {
        await get().initializeCache();
      },

      refreshModels: async () => {
        await get().forceFetchModels();
      },
    }),
    {
      name: "model-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist selectedModel and selectedProvider, not modelsByProvider or cacheTimerId
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        selectedProvider: state.selectedProvider,
        selectedModelsByProvider: state.selectedModelsByProvider,
      }),
    }
  )
);
