/**
 * Model & Temperature Selector Component
 * Shared component for selecting LLM provider/model across the application
 *
 * Features:
 * - Provider selection with descriptions
 * - Model dropdown (populates based on selected provider)
 * - Uses Zustand modelStore for centralized state management
 * - Automatic cache initialization on app load
 * - No context provider required
 */

"use client";

import clsx from "clsx";

import { Autocomplete, AutocompleteOption } from "@/components/ui/Autocomplete";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { getAvailableProviders } from "@/lib/llm/providers";
import { useModelStore } from "@/store/modelStore";
import { ProviderType, Providers } from "@/types/llm";

interface ModelSelectorProps {
  compact?: boolean;
  showLabel?: boolean;
  className?: string;
}

// Build provider labels and info dynamically from registry
function getProviderLabels(): Record<Providers, string> {
  const labels: Record<Providers, string> = {} as unknown as Record<
    Providers,
    string
  >;
  const providers = getAvailableProviders();
  for (const provider of providers) {
    labels[provider.type as Providers] = provider.name;
  }
  return labels;
}

function getProviderInfo(): Record<
  Providers,
  { description: string; icon: string }
> {
  const info = {} as unknown as Record<
    Providers,
    { description: string; icon: string }
  >;

  const providers = getAvailableProviders();
  for (const provider of providers) {
    info[provider.type as Providers] = {
      description: provider.description || "",
      icon: provider.icon || "zap",
    };
  }
  return info;
}

const PROVIDER_LABELS = getProviderLabels();
const PROVIDER_INFO = getProviderInfo();

export function ModelSelector({
  compact = false,
  showLabel = true,
  className = "",
}: ModelSelectorProps) {
  const {
    modelsByProvider,
    selectedProvider,
    isLoading,
    setSelectedModel,
    getSelectedModel,
    setSelectedProvider,
  } = useModelStore();

  // Get current selected model for active provider
  const currentModel = getSelectedModel(selectedProvider);
  const currentModels = modelsByProvider[selectedProvider] ?? [];

  const handleProviderChange = (provider: Providers) => {
    // Setting provider will clear the selected model in the store
    setSelectedProvider(provider);
  };

  const handleModelChange = (model: string) => {
    setSelectedModel(selectedProvider, model);
  };

  // Convert models to autocomplete options
  const modelOptions: AutocompleteOption[] = currentModels.map((model) => ({
    value: model,
    label: model,
  }));

  if (compact) {
    // Compact inline layout for side panels
    return (
      <div className={clsx("space-y-3 text-sm", className)}>
        {showLabel && (
          <h3 className="font-semibold text-gray-900 dark:text-white">
            AI Generation Settings
          </h3>
        )}

        {/* Provider Selection */}
        <div>
          <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
            Provider
          </label>
          <div className="flex flex-col gap-1">
            {(Object.keys(PROVIDER_LABELS) as Providers[]).map((provider) => (
              <button
                key={provider}
                onClick={() => handleProviderChange(provider)}
                className={clsx(
                  "rounded-lg border px-3 py-2 text-left text-xs transition-all",
                  selectedProvider === provider
                    ? "border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-200"
                    : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                )}
              >
                <div className="font-medium">{PROVIDER_LABELS[provider]}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {PROVIDER_INFO[provider].description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Model Selection */}
        {currentModels.length > 0 && (
          <div>
            <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
              Model
              {!currentModel && <span className="ml-1 text-red-500">*</span>}
            </label>
            <Autocomplete
              options={modelOptions}
              value={currentModel}
              onChange={handleModelChange}
              placeholder="Search or select a model..."
              disabled={isLoading}
              loading={isLoading}
              emptyText="No models found"
              searchable={true}
              maxHeight={200}
            />
            {!currentModel && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Please select a model to continue
              </p>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <Icon name="spinner" className="h-3 w-3 animate-spin" />
            Loading models...
          </div>
        )}
      </div>
    );
  }

  // Full layout for settings page or dedicated sections
  return (
    <div className={clsx("space-y-6", className)}>
      {showLabel && (
        <div>
          <h2 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">
            AI Generation Settings
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure which LLM provider and model to use for all AI-generated
            content
          </p>
        </div>
      )}

      {/* Provider Selection Cards */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          Provider
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(Object.keys(PROVIDER_LABELS) as Providers[]).map((provider) => (
            <button
              key={provider}
              onClick={() => handleProviderChange(provider)}
              className={clsx(
                "rounded-lg border-2 p-4 text-left transition-all",
                selectedProvider === provider
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
              )}
            >
              <div className="flex items-start gap-3">
                <Icon
                  name={PROVIDER_INFO[provider].icon}
                  className={clsx(
                    "h-5 w-5 shrink-0",
                    selectedProvider === provider
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-400"
                  )}
                />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {PROVIDER_LABELS[provider]}
                  </h4>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {PROVIDER_INFO[provider].description}
                  </p>
                </div>
                {selectedProvider === provider && (
                  <Icon
                    name="check"
                    className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
                  />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Model Selection */}
      {currentModels.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Model
            {!currentModel && <span className="ml-1 text-red-500">*</span>}
          </h3>
          <Autocomplete
            options={modelOptions}
            value={currentModel}
            onChange={handleModelChange}
            placeholder="Search or select a model..."
            disabled={isLoading}
            loading={isLoading}
            emptyText="No models found"
            searchable={true}
            maxHeight={300}
          />
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            {currentModels.length} model(s) available for{" "}
            {PROVIDER_LABELS[selectedProvider as Providers]}
          </p>
          {!currentModel && (
            <div className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
              <Icon name="alert" className="mr-1 inline h-3 w-3" />
              Model selection is required before generating content
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex items-center gap-3">
            <Icon
              name="spinner"
              className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400"
            />
            <p className="text-sm text-blue-900 dark:text-blue-300">
              Loading available models...
            </p>
          </div>
        </Card>
      )}

      {/* No Models Available */}
      {!isLoading &&
        currentModels.length === 0 &&
        selectedProvider !== ProviderType.OLLAMA && (
          <Card className="border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
            <div className="flex items-start gap-3">
              <Icon
                name="alert"
                className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400"
              />
              <p className="text-sm text-yellow-900 dark:text-yellow-300">
                No models available for{" "}
                {PROVIDER_LABELS[selectedProvider as Providers]}. Please
                configure your API key in settings.
              </p>
            </div>
          </Card>
        )}
    </div>
  );
}
