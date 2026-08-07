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

import { supportsReasoning, supportsTemperature } from "@pranavraut033/llm-core";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button, Icon } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { PROVIDER_INFO, PROVIDER_ICONS } from "@/lib/llm/providerMetaInfo";
import { useModelStore } from "@/store/modelStore";
import { ProviderType } from "@/types/llm";

import type { ReasoningEffort } from "@pranavraut033/llm-core";

const REASONING_EFFORTS: ReasoningEffort[] = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
];

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
  const {
    selectedModelsByProvider,
    activeModelPair,
    setSelectedModel,
    getReasoningEffort,
    setReasoningEffort,
    getTemperature,
    setTemperature,
    getTopP,
    setTopP,
  } = useModelStore();

  const [isOpen, setIsOpen] = useState(false);

  const activeReasoningEffort = activeModelPair
    ? getReasoningEffort(activeModelPair[0], activeModelPair[1])
    : null;
  const activeModelSupportsReasoning = activeModelPair
    ? supportsReasoning(activeModelPair[1])
    : false;

  const activeTemperature = activeModelPair
    ? getTemperature(activeModelPair[0], activeModelPair[1])
    : null;
  // Top P is part of the same OpenAI sampling-param family as temperature —
  // reasoning models reject both, so they share one capability check.
  const activeModelSupportsTemperature = activeModelPair
    ? supportsTemperature(activeModelPair[1])
    : false;
  const activeTopP = activeModelPair
    ? getTopP(activeModelPair[0], activeModelPair[1])
    : null;
  const hasAdvancedOptions =
    activeModelSupportsReasoning || activeModelSupportsTemperature;

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
    // Keep the modal open — advanced options (reasoning effort, temperature)
    // for the newly-picked model render right below, and closing here would
    // hide them before the user can see or adjust them.
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
          <p
            className="-mt-1 text-xs"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Need a different model or provider?{" "}
            <Link
              href="/settings"
              className="font-semibold underline"
              style={{ color: "var(--color-agent-primary)" }}
              onClick={() => setIsOpen(false)}
            >
              Manage in Settings
            </Link>
          </p>

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

          {/* Advanced options — only for the active model, and only the
              controls that model actually supports (e.g. reasoning models
              reject `temperature` outright, so it's hidden rather than sent
              and rejected by the API). */}
          {activeModelPair && hasAdvancedOptions && (
            <div
              className="border-t pt-4"
              style={{ borderColor: "var(--color-agent-outline-variant)" }}
            >
              <p
                className="mb-3 text-sm font-semibold"
                style={{ color: "var(--color-agent-on-surface)" }}
              >
                Advanced options for {activeModelPair[1]}
              </p>

              {activeModelSupportsReasoning && (
                <div className="mb-4">
                  <p
                    className="mb-2 flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: "var(--color-agent-on-surface)" }}
                  >
                    Reasoning effort
                    <span
                      title="How much the model 'thinks' before answering. Higher effort can improve quality on hard tasks but is slower and costs more tokens. Provider default is used unless you pick one."
                      className="inline-flex cursor-help"
                    >
                      <Icon
                        name="info"
                        className="text-agent-on-surface-variant h-3.5 w-3.5"
                      />
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {REASONING_EFFORTS.map((effort) => {
                      const isSelected = activeReasoningEffort === effort;
                      return (
                        <button
                          key={effort}
                          onClick={() =>
                            setReasoningEffort(
                              activeModelPair[0],
                              activeModelPair[1],
                              isSelected ? null : effort
                            )
                          }
                          className="rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-all hover:shadow-sm active:scale-95"
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
                          {effort}
                        </button>
                      );
                    })}
                  </div>
                  <p
                    className="mt-2 text-xs"
                    style={{ color: "var(--color-agent-on-surface-variant)" }}
                  >
                    Click a selected value again to clear it.
                  </p>
                </div>
              )}

              {activeModelSupportsTemperature && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p
                      className="flex items-center gap-1.5 text-xs font-medium"
                      style={{ color: "var(--color-agent-on-surface)" }}
                    >
                      Temperature
                      <span
                        title="Controls randomness. Lower values (near 0) make output more focused and deterministic; higher values (near 2) make it more varied and creative. Provider default is 0.7 unless you set one."
                        className="inline-flex cursor-help"
                      >
                        <Icon
                          name="info"
                          className="text-agent-on-surface-variant h-3.5 w-3.5"
                        />
                      </span>
                    </p>
                    <span
                      className="text-xs font-medium tabular-nums"
                      style={{ color: "var(--color-agent-on-surface-variant)" }}
                    >
                      {activeTemperature ?? "default"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={activeTemperature ?? 0.7}
                    onChange={(e) =>
                      setTemperature(
                        activeModelPair[0],
                        activeModelPair[1],
                        Number(e.target.value)
                      )
                    }
                    className="w-full accent-[var(--color-agent-primary)]"
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <p
                      className="text-xs"
                      style={{ color: "var(--color-agent-on-surface-variant)" }}
                    >
                      Focused (0) to creative (2).
                    </p>
                    {activeTemperature !== null && (
                      <button
                        onClick={() =>
                          setTemperature(
                            activeModelPair[0],
                            activeModelPair[1],
                            null
                          )
                        }
                        className="text-xs font-medium underline"
                        style={{ color: "var(--color-agent-primary)" }}
                      >
                        Reset to default
                      </button>
                    )}
                  </div>
                </div>
              )}

              {activeModelSupportsTemperature && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p
                      className="flex items-center gap-1.5 text-xs font-medium"
                      style={{ color: "var(--color-agent-on-surface)" }}
                    >
                      Top P
                      <span
                        title="An alternative to temperature — narrows the model to only its most likely next words. Lower values (near 0) are more focused; 1 considers the full range. Provider default is used unless you set one. Usually left alone if you're already adjusting temperature."
                        className="inline-flex cursor-help"
                      >
                        <Icon
                          name="info"
                          className="text-agent-on-surface-variant h-3.5 w-3.5"
                        />
                      </span>
                    </p>
                    <span
                      className="text-xs font-medium tabular-nums"
                      style={{ color: "var(--color-agent-on-surface-variant)" }}
                    >
                      {activeTopP ?? "default"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={activeTopP ?? 1}
                    onChange={(e) =>
                      setTopP(
                        activeModelPair[0],
                        activeModelPair[1],
                        Number(e.target.value)
                      )
                    }
                    className="w-full accent-[var(--color-agent-primary)]"
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <p
                      className="text-xs"
                      style={{ color: "var(--color-agent-on-surface-variant)" }}
                    >
                      Narrow (0) to full range (1).
                    </p>
                    {activeTopP !== null && (
                      <button
                        onClick={() =>
                          setTopP(activeModelPair[0], activeModelPair[1], null)
                        }
                        className="text-xs font-medium underline"
                        style={{ color: "var(--color-agent-primary)" }}
                      >
                        Reset to default
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
