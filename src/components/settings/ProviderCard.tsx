"use client";
import clsx from "clsx";
import { useState } from "react";

import { MultiSelect } from "@/components/ui";
import { PROVIDER_ICONS, PROVIDER_INFO } from "@/lib/llm/providerMetaInfo";
import { useModelStore } from "@/store/modelStore";
import { ProviderType } from "@/types/llm";

export interface ProviderCardProps {
  apiKey: string;
  isSaving: boolean;
  isValidating?: boolean;
  onApiKeyChange: (v: string) => void;
  onSave: () => void;
  onValidate: () => void;
  providerType: ProviderType;
  validationMessage?: string;
  validationSuccess?: boolean | null;
}

export function ProviderCard({
  apiKey,
  isSaving,
  isValidating = false,
  onApiKeyChange,
  onSave,
  onValidate,
  providerType,
  validationMessage = "",
  validationSuccess = null,
}: ProviderCardProps) {
  const {
    selectedModelsByProvider,
    isLoading,
    modelsByProvider,
    setProviderModels,
  } = useModelStore();
  const _modelOptions = modelsByProvider[providerType] ?? [];
  const [showKey, setShowKey] = useState(false);
  const hasFallback = _modelOptions[0] === "fallback";
  const modelOptions = hasFallback ? _modelOptions.slice(1) : _modelOptions;
  const meta = PROVIDER_INFO[providerType];
  const selectedModels = selectedModelsByProvider[providerType] ?? [];
  const isConnected = _modelOptions?.length > 0;

  const Icon = PROVIDER_ICONS[providerType];
  return (
    <div
      className="flex flex-col gap-4 rounded-2xl p-5"
      style={{ background: "var(--color-agent-surface-low)" }}
    >
      {/* Fallback warning */}
      {hasFallback && (
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
          style={{
            background: "var(--color-agent-warning-container, #fffbe6)",
            color: "var(--color-agent-on-warning-container, #ad6800)",
            border: "1px solid var(--color-agent-outline-variant, #ffe58f)",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="shrink-0"
            style={{ marginRight: 6 }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <circle cx="12" cy="16" r="1" />
          </svg>
          Connection could not be verified. Using fallback models.
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg text-xs font-semibold text-white">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-sm leading-tight font-semibold"
            style={{ color: "var(--color-agent-on-surface)" }}
          >
            {meta.name}
          </p>
          {meta.description && (
            <p
              className="truncate text-xs"
              style={{ color: "var(--color-agent-on-surface-variant)" }}
            >
              {meta.description}
            </p>
          )}
        </div>
        <span
          className={clsx(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",

            hasFallback
              ? "text-color-agent-on-warning-container border border-[#ffe58f] bg-[#fffbe6]"
              : isConnected
                ? "bg-agent-primary text-white"
                : "bg-agent-error text-white/90"
          )}
        >
          {hasFallback
            ? "Unavailable"
            : isConnected
              ? "Connected"
              : "Not Configured"}
        </span>
      </div>

      {/* API Key row */}
      <div className="flex items-center gap-2">
        <div
          className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm"
          style={{
            background: "var(--color-agent-surface-container)",
            border: "1px solid var(--color-agent-outline-variant)",
          }}
        >
          <span
            className="shrink-0 text-xs font-medium"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            API Key
          </span>
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder="Enter API key"
            className="min-w-0 flex-1 bg-transparent text-xs outline-none"
            style={{ color: "var(--color-agent-on-surface)" }}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
            aria-label={showKey ? "Hide API key" : "Show API key"}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              {showKey ? (
                <>
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </>
              ) : (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        </div>
        <button
          onClick={onSave}
          disabled={isSaving || !apiKey}
          className="shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{
            background:
              "linear-gradient(135deg, var(--color-agent-primary), var(--color-agent-primary-container))",
            color: "var(--color-agent-on-primary)",
          }}
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Model selector and Validate button */}
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <MultiSelect
            value={selectedModels}
            onChange={(models) => setProviderModels(providerType, models)}
            options={modelOptions}
            placeholder={isLoading ? "Loading models…" : "Select Models"}
            disabled={isLoading}
          />
        </div>
        <button
          onClick={onValidate}
          disabled={!apiKey || isValidating}
          className="shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-40"
          style={{
            borderColor: "var(--color-agent-outline-variant)",
            color: "var(--color-agent-on-surface-variant)",
            background: "transparent",
          }}
        >
          {isValidating ? "Testing…" : "Validate Connection"}
        </button>
      </div>

      {/* Validation message */}
      {validationMessage && (
        <div
          className="flex items-start gap-2 rounded-xl px-3 py-2 text-xs"
          style={{
            background: validationSuccess
              ? "var(--color-agent-secondary-container)"
              : "var(--color-agent-error-container)",
            color: validationSuccess
              ? "var(--color-agent-on-secondary-container)"
              : "var(--color-agent-on-error-container)",
          }}
        >
          <span className="shrink-0 pt-0.5">
            {validationSuccess ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
              </svg>
            )}
          </span>
          <span className="flex-1">{validationMessage}</span>
        </div>
      )}
    </div>
  );
}
