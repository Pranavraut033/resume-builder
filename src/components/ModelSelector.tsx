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
import { useMemo, useState } from "react";

import { Button, Icon } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { PROVIDER_INFO, PROVIDER_ICONS } from "@/lib/llm/providerMetaInfo";
import { useModelStore } from "@/store/modelStore";
import { ProviderType } from "@/types/llm";

interface ModelSelectorProps {
  /** Callback when user selects a model. Emits {model, provider} */
  onModelSelected?: (model: string, provider: ProviderType) => void;
  label?: string;
  className?: string;
  variant?: "normal" | "compact" | "minimal";
}

export function ModelSelector({
  onModelSelected,
  label = "Select Model",
  className = "",
  variant = "normal",
}: ModelSelectorProps) {
  const { selectedModelsByProvider, activeModelPair, setSelectedModel } =
    useModelStore();

  const [isOpen, setIsOpen] = useState(false);

  // Get preselected models by provider (from settings)
  const preselectedByProvider = useMemo(
    () =>
      Object.entries(selectedModelsByProvider)
        .map(([provider, models]) => ({
          provider: provider as ProviderType,
          models: (models || []).filter(Boolean),
        }))
        .filter(({ models }) => models.length > 0),
    [selectedModelsByProvider]
  );

  const handleModelClick = (model: string, provider: ProviderType) => {
    setSelectedModel(provider, model);
    onModelSelected?.(model, provider);
    setIsOpen(false);
  };

  const selectedProviderInfo = activeModelPair
    ? PROVIDER_INFO[activeModelPair[0]]
    : undefined;

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

  const ActiveIcon = activeModelPair
    ? PROVIDER_ICONS[activeModelPair[0]]
    : undefined;

  const getProviderIcon = (provider: ProviderType) => {
    const IconComponent = PROVIDER_ICONS[provider];
    return <IconComponent className="h-4 w-4" />;
  };
  return (
    <>
      {variant === "normal" ? (
        <>
          {/* Current Model Display */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="bg-agent-surface-container border-agent-outline-variant mb-4 flex w-full gap-3 rounded-xl border p-3 text-left transition-all hover:shadow-sm active:scale-[0.99]"
          >
            {activeModelPair ? (
              <>
                <div className="bg-agent-surface-low flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  {ActiveIcon && <ActiveIcon className="size-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-agent-on-surface-variant text-xs font-semibold tracking-wide uppercase">
                    {selectedProviderInfo?.name || activeModelPair[0]}
                  </p>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "var(--color-agent-on-surface)" }}
                  >
                    {activeModelPair[1]}
                  </p>
                  {selectedProviderInfo?.description && (
                    <p className="text-agent-on-surface-variant mt-1 text-xs">
                      {selectedProviderInfo.description}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <span
                className="flex-1 text-sm font-medium"
                style={{ color: "var(--color-agent-on-surface-variant)" }}
              >
                {label}
              </span>
            )}
            <Icon
              name="chevronDown"
              className="text-agent-on-surface-variant h-4 w-4 shrink-0"
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
      ) : variant === "compact" ? (
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
            <Icon name="slidersHorizontal" className="h-4 w-4" />
            <span>
              {activeModelPair
                ? `${activeModelPair[0]} - ${activeModelPair[1]}`
                : label}
            </span>
          </div>
          <Icon name="chevronDown" className="h-4 w-4 opacity-60" />
        </button>
      ) : variant === "minimal" ? (
        <>
          {activeModelPair?.[1]} [{activeModelPair?.[0]}]{" "}
          <Button
            size="sm"
            onClick={() => setIsOpen(true)}
            className="p-0.5 px-1 text-[10px]"
          >
            switch
          </Button>
        </>
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

            return (
              <div key={provider}>
                {/* Provider Header */}
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg text-xs font-semibold text-white">
                    {getProviderIcon(provider)}
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
                      activeModelPair?.[0] === provider &&
                      activeModelPair?.[1] === model;

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
