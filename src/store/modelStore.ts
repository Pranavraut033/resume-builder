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

import type { ReasoningEffort } from "@pranavraut033/llm-core";

const logger = createLogger("ModelStore");

type ProviderModels = Record<ProviderType, string[]>;
type SelectedModelsArray = Partial<Record<ProviderType, string[]>>;
export type ModelProviderPair = [ProviderType, string]; // [provider, model]
// Keyed by "provider:model" — reasoning effort is a model-specific preference,
// not a global one (a non-reasoning model has nothing to set it to).
type ReasoningEffortByModel = Record<string, ReasoningEffort>;
// Same "provider:model" keying as reasoning effort — temperature support
// also varies per model (reasoning models reject it outright).
type TemperatureByModel = Record<string, number>;
// Same keying and rejection rule as temperature — top_p is part of the same
// sampling-param family OpenAI's reasoning models reject outright.
type TopPByModel = Record<string, number>;

const modelKey = (provider: ProviderType, model: string) =>
  `${provider}:${model}`;

// Cache duration: 6 hours in milliseconds
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000;

interface ModelState {
  // Cached models organized by provider
  modelsByProvider: ProviderModels;
  // Currently selected model (single selection across all providers);
  activeModelPair: ModelProviderPair | null;

  // Selected models list by provider (for multi-select UIs)
  selectedModelsByProvider: SelectedModelsArray;

  // Reasoning effort preference, per "provider:model"
  reasoningEffortByModel: ReasoningEffortByModel;

  // Temperature preference, per "provider:model"
  temperatureByModel: TemperatureByModel;

  // Top P preference, per "provider:model"
  topPByModel: TopPByModel;

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
  setReasoningEffort: (
    provider: ProviderType,
    model: string,
    effort: ReasoningEffort | null
  ) => void;
  setTemperature: (
    provider: ProviderType,
    model: string,
    temperature: number | null
  ) => void;
  setTopP: (provider: ProviderType, model: string, topP: number | null) => void;
  clearError: () => void;
  setCacheTimer: (timerId: NodeJS.Timeout) => void;
  clearCacheTimer: () => void;

  // Getters
  getSelectedModel: () => string | null;
  getSelectedProvider: () => ProviderType | null;
  getSelectedModelsForProvider: (provider: ProviderType) => string[] | null;
  getAllSelectedModels: () => SelectedModelsArray;
  getReasoningEffort: (
    provider: ProviderType,
    model: string
  ) => ReasoningEffort | null;
  getActiveReasoningEffort: () => ReasoningEffort | null;
  getTemperature: (provider: ProviderType, model: string) => number | null;
  getActiveTemperature: () => number | null;
  getTopP: (provider: ProviderType, model: string) => number | null;
  getActiveTopP: () => number | null;

  // Legacy aliases for UI pages
  loadModels: () => Promise<void>;
  refreshModels: (...providers: ProviderType[]) => Promise<void>;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      modelsByProvider: { ...EMPTY_MODELS_MAPS },
      selectedModelsByProvider: {},
      reasoningEffortByModel: {},
      temperatureByModel: {},
      topPByModel: {},
      cacheTimestamp: null,
      activeModelPair: null,
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
        set({ activeModelPair: [provider, model] });

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

      setReasoningEffort: (
        provider: ProviderType,
        model: string,
        effort: ReasoningEffort | null
      ) => {
        set((state) => {
          const next = { ...state.reasoningEffortByModel };
          const key = modelKey(provider, model);
          if (effort === null) {
            delete next[key];
          } else {
            next[key] = effort;
          }
          return { reasoningEffortByModel: next };
        });
      },

      setTemperature: (
        provider: ProviderType,
        model: string,
        temperature: number | null
      ) => {
        set((state) => {
          const next = { ...state.temperatureByModel };
          const key = modelKey(provider, model);
          if (temperature === null) {
            delete next[key];
          } else {
            next[key] = temperature;
          }
          return { temperatureByModel: next };
        });
      },

      setTopP: (provider: ProviderType, model: string, topP: number | null) => {
        set((state) => {
          const next = { ...state.topPByModel };
          const key = modelKey(provider, model);
          if (topP === null) {
            delete next[key];
          } else {
            next[key] = topP;
          }
          return { topPByModel: next };
        });
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
        const { activeModelPair: selectedModel } = get();
        return selectedModel ? selectedModel[1] : null;
      },

      getSelectedProvider: (): ProviderType | null => {
        const { activeModelPair: selectedModel } = get();

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

      getReasoningEffort: (
        provider: ProviderType,
        model: string
      ): ReasoningEffort | null => {
        const { reasoningEffortByModel } = get();
        return reasoningEffortByModel[modelKey(provider, model)] ?? null;
      },

      getActiveReasoningEffort: (): ReasoningEffort | null => {
        const { activeModelPair, getReasoningEffort } = get();
        if (!activeModelPair) return null;
        return getReasoningEffort(activeModelPair[0], activeModelPair[1]);
      },

      getTemperature: (
        provider: ProviderType,
        model: string
      ): number | null => {
        const { temperatureByModel } = get();
        return temperatureByModel[modelKey(provider, model)] ?? null;
      },

      getActiveTemperature: (): number | null => {
        const { activeModelPair, getTemperature } = get();
        if (!activeModelPair) return null;
        return getTemperature(activeModelPair[0], activeModelPair[1]);
      },

      getTopP: (provider: ProviderType, model: string): number | null => {
        const { topPByModel } = get();
        return topPByModel[modelKey(provider, model)] ?? null;
      },

      getActiveTopP: (): number | null => {
        const { activeModelPair, getTopP } = get();
        if (!activeModelPair) return null;
        return getTopP(activeModelPair[0], activeModelPair[1]);
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
      // Only persist activeModelPair and selectedModelsByProvider, not modelsByProvider or cacheTimerId
      partialize: (state) => ({
        activeModelPair: state.activeModelPair,
        selectedModelsByProvider: state.selectedModelsByProvider,
        reasoningEffortByModel: state.reasoningEffortByModel,
        temperatureByModel: state.temperatureByModel,
        topPByModel: state.topPByModel,
      }),
    }
  )
);
