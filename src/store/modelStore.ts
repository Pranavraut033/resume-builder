/**
 * Zustand store for managing LLM model state.
 *
 * This store centralizes model-related state including:
 * - Available models organized by provider
 * - Selected models for each provider
 * - Current primary provider
 *
 * The store handles fetching models from LLM providers and persisting
 * selections to localStorage for persistence across sessions.
 */

import { create } from "zustand";
import { fetchModels } from "@/lib/clientLLM";
import { createLogger } from "@/lib/logger";

const logger = createLogger("ModelStore");

type ProviderModels = Record<string, string[]>;

interface ModelState {
  // Available models organized by provider
  modelsByProvider: ProviderModels;

  // Selected models for each provider
  selectedModelsByProvider: ProviderModels;

  // Current primary provider
  selectedProvider: string;

  // Loading state
  isLoading: boolean;

  // Error state
  error: string | null;

  // Actions
  loadModels: () => Promise<void>;
  setProviderModels: (provider: string, models: string[]) => void;
  setSelectedProvider: (provider: string) => void;
  refreshModels: () => Promise<void>;
  clearError: () => void;

  // Computed getters
  getAllSelectedModels: () => string[];
  getSelectedProvider: () => string;
}

export const useModelStore = create<ModelState>((set, get) => ({
  modelsByProvider: {},
  selectedModelsByProvider: {},
  selectedProvider: "",
  isLoading: false,
  error: null,

  loadModels: async () => {
    set({ isLoading: true, error: null });

    try {
      // Fetch models from all providers
      const data = await fetchModels();

      // Load persisted selections from localStorage
      const savedSelections = localStorage.getItem("selectedModelsByProvider");
      const savedProvider = localStorage.getItem("selectedProvider") || "";

      const selectedByProvider = savedSelections
        ? JSON.parse(savedSelections)
        : {};

      set({
        modelsByProvider: data as ProviderModels,
        selectedModelsByProvider: selectedByProvider,
        selectedProvider: savedProvider,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load models";
      logger.error("Error loading models", { error });
      set({
        isLoading: false,
        error: errorMessage,
      });
    }
  },

  setProviderModels: (provider: string, models: string[]) => {
    const { selectedModelsByProvider } = get();

    const updatedSelections = {
      ...selectedModelsByProvider,
      [provider]: models,
    };

    // Determine primary provider (first provider with selected models)
    let primaryProvider = get().selectedProvider;
    if (models.length > 0 && !primaryProvider) {
      primaryProvider = provider;
    } else if (models.length === 0 && primaryProvider === provider) {
      // Find another provider with selected models
      const providersWithModels = Object.entries(updatedSelections).filter(
        ([, m]) => m.length > 0,
      );
      primaryProvider =
        providersWithModels.length > 0 ? providersWithModels[0][0] : "";
    }

    set({
      selectedModelsByProvider: updatedSelections,
      selectedProvider: primaryProvider,
    });

    // Persist to localStorage
    localStorage.setItem(
      "selectedModelsByProvider",
      JSON.stringify(updatedSelections),
    );
    localStorage.setItem("selectedProvider", primaryProvider);

    // Keep backward compatibility with old format
    const allSelected = Object.values(updatedSelections).flat();
    localStorage.setItem("selectedModel", JSON.stringify(allSelected));
  },

  setSelectedProvider: (provider: string) => {
    set({ selectedProvider: provider });
    localStorage.setItem("selectedProvider", provider);
  },

  refreshModels: async () => {
    await get().loadModels();
  },

  clearError: () => {
    set({ error: null });
  },

  getAllSelectedModels: () => {
    const { selectedModelsByProvider } = get();
    return Object.values(selectedModelsByProvider).flat();
  },

  getSelectedProvider: () => {
    const { selectedProvider, selectedModelsByProvider } = get();

    // Return current provider if valid
    if (
      selectedProvider &&
      selectedModelsByProvider[selectedProvider]?.length > 0
    ) {
      return selectedProvider;
    }

    // Otherwise return first provider with selected models
    const providersWithModels = Object.entries(selectedModelsByProvider).filter(
      ([, models]) => models.length > 0,
    );

    return providersWithModels.length > 0
      ? providersWithModels[0][0]
      : "ollama";
  },
}));
