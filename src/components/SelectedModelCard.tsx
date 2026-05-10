/**
 * Selected Model Card Component
 *
 * Displays the currently selected model in a sidebar card format.
 * Integrated with ModelSelector modal for changing models.
 * Shows error state when no model is configured.
 */

"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { ModelSelector } from "@/components/ModelSelector";
import { Icon } from "@/components/ui/Icon";
import { useModelStore } from "@/store/modelStore";
import { ProviderType } from "@/types/llm";

export function SelectedModelCard() {
  const { selectedModel, setSelectedModel } = useModelStore();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const handleModelSelected = (model: string, provider: ProviderType) => {
    setSelectedModel(provider, model);
  };

  if (!hydrated) {
    return (
      <div
        className="animate-pulse rounded-2xl p-5"
        style={{
          background: "var(--color-agent-surface-lowest)",
          border: "1px solid var(--color-agent-outline-variant)",
        }}
      >
        <div className="mb-3 h-4 w-24 rounded bg-gray-300" />
        <div className="space-y-3">
          <div className="h-10 w-full rounded-lg bg-gray-300" />
          <div className="h-10 w-full rounded-lg bg-gray-300" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "var(--color-agent-surface-lowest)",
        border: "1px solid var(--color-agent-outline-variant)",
      }}
    >
      <p
        className="mb-4 text-xs font-semibold tracking-wide uppercase"
        style={{ color: "var(--color-agent-on-surface-variant)" }}
      >
        Selected Model
      </p>

      {selectedModel ? (
        <>
          {/* Change Model Button */}
          <ModelSelector
            onModelSelected={handleModelSelected}
            label="Change Model"
            className="w-full"
            variant="normal"
          />

          {/* Link to Settings */}
          <Link
            href="/settings"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition hover:opacity-90"
            style={{
              background: "var(--color-agent-surface-container)",
              color: "var(--color-agent-on-surface)",
              border: "1px solid var(--color-agent-outline-variant)",
            }}
          >
            <Icon name="settings" className="h-3.5 w-3.5" />
            Add Models in Settings
          </Link>
        </>
      ) : (
        <>
          {/* Error State */}
          <div
            className="mb-4 rounded-xl px-4 py-3"
            style={{
              background: "var(--color-agent-error-container)",
              color: "var(--color-agent-on-error-container)",
            }}
          >
            <p className="text-xs">
              No model configured. Visit settings to select models.
            </p>
          </div>

          {/* Link to Settings */}
          <Link
            href="/settings"
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition hover:opacity-90"
            style={{
              background: "var(--color-agent-primary)",
              color: "var(--color-agent-on-primary)",
            }}
          >
            <Icon name="settings" className="h-3.5 w-3.5" />
            Configure Models
          </Link>
        </>
      )}
    </div>
  );
}
