/**
 * Selected Model Card Component
 *
 * Displays the currently selected model in a sidebar card format.
 * Integrated with ModelSelector modal for changing models.
 * Shows error state when no model is configured.
 */

"use client";

import Link from "next/link";

import { ModelSelector } from "@/components/ModelSelector";
import { Icon } from "@/components/ui/Icon";
import useHydrated from "@/hooks/useHydrated";

export function SelectedModelCard() {
  const hydrated = useHydrated();

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

      <>
        {/* Change Model Button */}
        <ModelSelector
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
    </div>
  );
}
