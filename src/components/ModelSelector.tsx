/**
 * Model Selector Component (Presenter)
 *
 * Displays preselected models in a modal window.
 * This is a pure presenter component that:
 * - Reads preselected models and last used model from store (read-only)
 * - Does NOT update any store state
 * - Emits selected model via callback: {model, provider}
 * - Defaults to last used model from store
 */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { getAvailableProviders } from "@/lib/llm/providers";
import { useModelStore } from "@/store/modelStore";
import { Providers } from "@/types/llm";

interface ModelSelectorProps {
  /** Callback when user selects a model. Emits {model, provider} */
  onModelSelected: (model: string, provider: Providers) => void;
  label?: string;
  className?: string;
  variant?: "normal" | "compact";
}

// Provider color mapping
const PROVIDER_COLORS: Record<Providers, string> = {
  openai: "#10a37f",
  gemini: "#4285f4",
  grok: "#000000",
  ollama: "#fb542b",
  perplexity: "#0066cc",
};

// Build provider info map
function buildProviderInfo(): Record<
  Providers,
  { name: string; icon: string }
> {
  const info = {} as Record<Providers, { name: string; icon: string }>;
  const providers = getAvailableProviders();

  for (const provider of providers) {
    info[provider.type as Providers] = {
      name: provider.name,
      icon: provider.icon || "zap",
    };
  }

  return info;
}

const PROVIDER_INFO = buildProviderInfo();

export function ModelSelector({
  onModelSelected,
  label = "Select Model",
  className = "",
  variant = "compact",
}: ModelSelectorProps) {
  const { selectedModelsByProvider, selectedModel, selectedProvider } =
    useModelStore();

  const [isOpen, setIsOpen] = useState(false);

  // Initialize with last used model from store
  const initialSelected = useMemo(() => {
    if (selectedModel && selectedProvider) {
      const lastUsedModel = selectedModel[selectedProvider];
      if (lastUsedModel) {
        return {
          model: lastUsedModel,
          provider: selectedProvider as Providers,
        };
      }
    }
    return null;
  }, [selectedModel, selectedProvider]);

  const [selected, setSelected] = useState<{
    model: string;
    provider: Providers;
  } | null>(initialSelected);

  useEffect(() => {
    setSelected(initialSelected);
  }, [initialSelected]);

  // Get preselected models by provider (from settings)
  const preselectedByProvider = useMemo(
    () =>
      Object.entries(selectedModelsByProvider)
        .map(([provider, models]) => ({
          provider: provider as Providers,
          models: (models || []).filter(Boolean),
        }))
        .filter(({ models }) => models.length > 0),
    [selectedModelsByProvider]
  );

  const handleModelClick = (model: string, provider: Providers) => {
    setSelected({ model, provider });
    onModelSelected(model, provider);
    setIsOpen(false);
  };

  const selectedProviderInfo = selected
    ? PROVIDER_INFO[selected.provider]
    : undefined;
  const selectedProviderColor = selected
    ? PROVIDER_COLORS[selected.provider]
    : undefined;
  const showButtonTrigger = variant === "compact" || !selected;

  // Show error state if no models configured
  if (preselectedByProvider.length === 0) {
    return (
      <div
        className={`rounded-xl px-4 py-3 ${className}`}
        style={{
          background: "var(--color-agent-error-container)",
          color: "var(--color-agent-on-error-container)",
        }}
      >
        <p className="text-xs">
          No models configured. Go to{" "}
          <Link href="/settings" className="font-semibold underline">
            Settings
          </Link>{" "}
          to select models.
        </p>
      </div>
    );
  }

  return (
    <>
      {variant === "normal" && selected ? (
        <>
          {/* Current Model Display */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="mb-4 flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all hover:shadow-sm active:scale-[0.99]"
            style={{
              background: "var(--color-agent-surface-container)",
              border: "1px solid var(--color-agent-outline-variant)",
            }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ background: selectedProviderColor }}
            >
              <Icon
                name={selectedProviderInfo?.icon || "zap"}
                className="h-4 w-4"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="text-xs font-semibold tracking-wide uppercase"
                style={{ color: "var(--color-agent-on-surface-variant)" }}
              >
                {selectedProviderInfo?.name || selected.provider}
              </p>
              <p
                className="truncate text-sm font-semibold"
                style={{ color: "var(--color-agent-on-surface)" }}
              >
                {selected.model}
              </p>
            </div>
            <Icon
              name="chevron-down"
              className="h-4 w-4 shrink-0"
              style={{ color: "var(--color-agent-on-surface-variant)" }}
            />
          </button>

          {/* Help text */}
          <p
            className="mb-4 text-xs"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Pick from your pre-selected options. Need to add more? Visit
            settings.
          </p>
        </>
      ) : null}

      {/* Trigger Button */}
      {showButtonTrigger ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`flex items-center justify-between gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all hover:shadow-md active:scale-95 ${className}`}
          style={{
            background: "var(--color-agent-primary-container)",
            color: "var(--color-agent-on-primary-container)",
            border: "1px solid var(--color-agent-outline-variant)",
          }}
        >
          <div className="flex items-center gap-2">
            <Icon name="sliders-horizontal" className="h-4 w-4" />
            <span>
              {variant === "compact" && selected
                ? `${selected.provider} - ${selected.model}`
                : label}
            </span>
          </div>
          <Icon name="chevron-down" className="h-4 w-4 opacity-60" />
        </button>
      ) : null}

      {/* Modal Window */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Select Model"
        size="md"
      >
        <div className="space-y-5">
          {preselectedByProvider.map(({ provider, models }) => {
            const providerInfo = PROVIDER_INFO[provider];
            const providerColor = PROVIDER_COLORS[provider];

            return (
              <div key={provider}>
                {/* Provider Header */}
                <div className="mb-3 flex items-center gap-2">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-xs font-semibold text-white"
                    style={{ background: providerColor }}
                  >
                    <Icon name={providerInfo.icon} className="h-3.5 w-3.5" />
                  </div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--color-agent-on-surface)" }}
                  >
                    {providerInfo.name}
                  </p>
                </div>

                {/* Model Pills */}
                <div className="flex flex-wrap gap-2">
                  {models.map((model) => {
                    const isSelected =
                      selected?.provider === provider &&
                      selected?.model === model;

                    return (
                      <button
                        key={`${provider}-${model}`}
                        onClick={() => handleModelClick(model, provider)}
                        className="rounded-full px-4 py-2 text-sm font-medium transition-all hover:shadow-sm active:scale-95"
                        style={{
                          background: isSelected
                            ? "var(--color-agent-primary)"
                            : "var(--color-agent-surface-container)",
                          color: isSelected
                            ? "var(--color-agent-on-primary)"
                            : "var(--color-agent-on-surface)",
                          border: isSelected
                            ? "2px solid var(--color-agent-primary)"
                            : "1px solid var(--color-agent-outline-variant)",
                        }}
                      >
                        {model}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
