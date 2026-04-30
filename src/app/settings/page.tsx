"use client";

import { useState, useEffect } from "react";

import { MultiSelect } from "@/components/ui/MultiSelect";
import { useTheme } from "@/contexts/ThemeContext";
import { setApiKey, getApiKey } from "@/lib/keyStorage";
import { validateProviderConnection } from "@/lib/llm/clientLLM";
import { getAvailableProviders } from "@/lib/llm/providers";
import { createLogger } from "@/lib/logger";
import { useModelStore } from "@/store/modelStore";
import { ProviderType } from "@/types/llm";

const logger = createLogger("SettingsPage");

interface ProviderCardProps {
  name: string;
  providerType: string;
  tagline: string;
  avatarLetter: string;
  avatarColor: string;
  apiKey: string;
  onApiKeyChange: (v: string) => void;
  onSave: () => void;
  onValidate: () => void;
  isSaving: boolean;
  isConnected: boolean;
  modelOptions: string[];
  selectedModels: string[];
  onModelsChange: (models: string[]) => void;
  isLoadingModels: boolean;
  isValidating?: boolean;
  validationMessage?: string;
  validationSuccess?: boolean | null;
}

function ProviderCard({
  name,
  tagline,
  avatarLetter,
  avatarColor,
  apiKey,
  onApiKeyChange,
  onSave,
  onValidate,
  isSaving,
  isConnected,
  modelOptions,
  selectedModels,
  onModelsChange,
  isLoadingModels,
  isValidating = false,
  validationMessage = "",
  validationSuccess = null,
}: ProviderCardProps) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl p-5"
      style={{ background: "var(--color-agent-surface-low)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
          style={{ background: avatarColor }}
        >
          {avatarLetter}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-sm leading-tight font-semibold"
            style={{ color: "var(--color-agent-on-surface)" }}
          >
            {name}
          </p>
          <p
            className="truncate text-xs"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            {tagline}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={
            isConnected
              ? {
                  background: "var(--color-agent-secondary-container)",
                  color: "var(--color-agent-on-secondary-container)",
                }
              : {
                  background: "var(--color-agent-surface-highest)",
                  color: "var(--color-agent-on-surface-variant)",
                }
          }
        >
          {isConnected ? "Connected" : "Not Configured"}
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
            onChange={onModelsChange}
            options={modelOptions}
            placeholder={isLoadingModels ? "Loading models…" : "Select Models"}
            disabled={isLoadingModels}
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

export default function SettingsPage() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [validatingProvider, setValidatingProvider] = useState<string | null>(
    null
  );
  const [validationResults, setValidationResults] = useState<
    Record<string, { success: boolean; message: string }>
  >({});
  const [ollamaHost, setOllamaHost] = useState("http://localhost:11434");
  const { theme, setTheme } = useTheme();
  const [telemetry, setTelemetry] = useState(false);

  const {
    modelsByProvider,
    selectedModelsByProvider,
    selectedProvider,
    isLoading,
    error,
    loadModels,
    setProviderModels,
    refreshModels,
    clearError,
  } = useModelStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        await loadModels();
        const providers = getAvailableProviders();
        const loadedKeys: Record<string, string> = {};
        for (const provider of providers) {
          const key = await getApiKey(provider.type);
          if (key) loadedKeys[provider.type] = key;
        }
        setKeys(loadedKeys);
      } catch (err) {
        logger.error("Error loading data", { err });
      }
    };
    loadData();
  }, [loadModels]);

  const handleSaveKey = async (providerType: string) => {
    setSavingProvider(providerType);
    try {
      await setApiKey(providerType, keys[providerType] || "");
      await refreshModels();
    } catch (err) {
      logger.error("Error saving API key", { err });
    } finally {
      setSavingProvider(null);
    }
  };

  const handleValidate = async (providerType: ProviderType) => {
    setValidatingProvider(providerType);
    try {
      const result = await validateProviderConnection(providerType);
      setValidationResults((prev) => ({
        ...prev,
        [providerType]: result,
      }));
      logger.info("Validation result", { providerType, result });
      // Clear validation message after 5 seconds
      setTimeout(() => {
        setValidationResults((prev) => {
          const updated = { ...prev };
          delete updated[providerType];
          return updated;
        });
      }, 5000);
    } catch (err) {
      logger.error("Validation error", { err });
      setValidationResults((prev) => ({
        ...prev,
        [providerType]: {
          success: false,
          message: "Failed to validate connection",
        },
      }));
    } finally {
      setValidatingProvider(null);
    }
  };

  const cloudProviders = getAvailableProviders().filter(
    (p) => p.requiresAuth && !p.isLocal
  );

  const providerMeta: Record<
    string,
    { tagline: string; avatarLetter: string; avatarColor: string }
  > = {
    openai: {
      tagline: "GPT-4o, GPT-4 Turbo",
      avatarLetter: "O",
      avatarColor: "#10a37f",
    },
    gemini: {
      tagline: "Gemini 1.5 Pro, Flash",
      avatarLetter: "G",
      avatarColor: "#4285f4",
    },
    grok: {
      tagline: "Grok-1, Grok-Beta",
      avatarLetter: "X",
      avatarColor: "#1a1a1a",
    },
    perplexity: {
      tagline: "Sonar, Llama 3 API",
      avatarLetter: "P",
      avatarColor: "#20b2aa",
    },
  };

  return (
    <div
      className="min-h-full px-6 py-8"
      style={{ color: "var(--color-agent-on-surface)" }}
    >
      {/* Page header */}
      <div className="mb-8">
        <div className="mb-1 flex items-center gap-3">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--color-agent-on-surface)" }}
          >
            Settings
          </h1>
          <span
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: "var(--color-agent-surface-low)",
              color: "var(--color-agent-on-surface-variant)",
              border: "1px solid var(--color-agent-outline-variant)",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
            </svg>
            Stored Locally &amp; Encrypted
          </span>
        </div>
        <p
          className="text-sm"
          style={{ color: "var(--color-agent-on-surface-variant)" }}
        >
          Configure your intelligent drafting engine. All configurations are
          stored locally on your device.
        </p>
      </div>

      {error && (
        <div
          className="mb-6 flex items-center justify-between rounded-xl px-4 py-3 text-sm"
          style={{
            background: "var(--color-agent-error-container)",
            color: "var(--color-agent-on-error-container)",
          }}
        >
          <span>Error loading models: {error}</span>
          <button onClick={clearError} className="underline hover:no-underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-8">
        {/* Cloud LLM Providers */}
        <section>
          <h2
            className="mb-4 text-base font-semibold"
            style={{ color: "var(--color-agent-on-surface)" }}
          >
            Cloud LLM Providers
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {cloudProviders.map((provider) => {
              const meta = providerMeta[provider.type] ?? {
                tagline: provider.description ?? "",
                avatarLetter: provider.name[0].toUpperCase(),
                avatarColor: "var(--color-agent-primary)",
              };
              return (
                <ProviderCard
                  key={provider.type}
                  name={provider.name}
                  providerType={provider.type}
                  tagline={meta.tagline}
                  avatarLetter={meta.avatarLetter}
                  avatarColor={meta.avatarColor}
                  apiKey={keys[provider.type] || ""}
                  onApiKeyChange={(v) =>
                    setKeys((prev) => ({ ...prev, [provider.type]: v }))
                  }
                  onSave={() => handleSaveKey(provider.type)}
                  onValidate={() => handleValidate(provider.type)}
                  isSaving={savingProvider === provider.type}
                  isConnected={!!keys[provider.type]}
                  modelOptions={modelsByProvider[provider.type] ?? []}
                  selectedModels={selectedModelsByProvider[provider.type] ?? []}
                  onModelsChange={(models) =>
                    setProviderModels(provider.type, models)
                  }
                  isLoadingModels={isLoading}
                  isValidating={validatingProvider === provider.type}
                  validationMessage={
                    validationResults[provider.type]?.message ?? ""
                  }
                  validationSuccess={
                    validationResults[provider.type]?.success ?? null
                  }
                />
              );
            })}
          </div>
        </section>

        {/* Local LLM — Ollama */}
        <section>
          <h2
            className="mb-4 text-base font-semibold"
            style={{ color: "var(--color-agent-on-surface)" }}
          >
            Local LLM
          </h2>
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--color-agent-surface-low)" }}
          >
            <p
              className="mb-5 text-sm leading-relaxed"
              style={{ color: "var(--color-agent-on-surface-variant)" }}
            >
              Connect to Ollama for 100% private, air-gapped processing. No data
              ever leaves your machine when using local models.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Status */}
              <div
                className="rounded-xl px-4 py-3"
                style={{ background: "var(--color-agent-surface-container)" }}
              >
                <p
                  className="mb-2 text-xs font-semibold tracking-wider uppercase"
                  style={{ color: "var(--color-agent-on-surface-variant)" }}
                >
                  Status
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{
                      background: modelsByProvider.ollama?.length
                        ? "var(--color-agent-secondary)"
                        : "var(--color-agent-outline)",
                    }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--color-agent-on-surface)" }}
                  >
                    {modelsByProvider.ollama?.length
                      ? "Ollama Service Detected"
                      : "Ollama Not Connected"}
                  </span>
                </div>
              </div>

              {/* Host URL */}
              <div
                className="rounded-xl px-4 py-3"
                style={{ background: "var(--color-agent-surface-container)" }}
              >
                <p
                  className="mb-2 text-xs font-semibold tracking-wider uppercase"
                  style={{ color: "var(--color-agent-on-surface-variant)" }}
                >
                  Host URL
                </p>
                <input
                  type="text"
                  value={ollamaHost}
                  onChange={(e) => setOllamaHost(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  style={{ color: "var(--color-agent-on-surface)" }}
                />
              </div>
            </div>

            {/* Ollama model selector */}
            {(modelsByProvider.ollama?.length ?? 0) > 0 && (
              <div className="mt-4">
                <p
                  className="mb-2 text-xs font-medium"
                  style={{ color: "var(--color-agent-on-surface-variant)" }}
                >
                  Select Model
                  {selectedProvider === "ollama" && (
                    <span
                      className="ml-2"
                      style={{ color: "var(--color-agent-primary)" }}
                    >
                      (Primary)
                    </span>
                  )}
                </p>
                <MultiSelect
                  value={selectedModelsByProvider.ollama ?? []}
                  onChange={(models) =>
                    setProviderModels(ProviderType.OLLAMA, models)
                  }
                  options={modelsByProvider.ollama ?? []}
                  placeholder={isLoading ? "Loading…" : "Select Ollama models"}
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => refreshModels()}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-agent-primary), var(--color-agent-primary-container))",
                  color: "var(--color-agent-on-primary)",
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="13 2 13 9 20 9" />
                  <polyline points="11 22 11 15 4 15" />
                  <path d="M2 11.5A10 10 0 0 1 20.5 8" />
                  <path d="M22 12.5A10 10 0 0 1 3.5 16" />
                </svg>
                Test Connection
              </button>
            </div>
          </div>
        </section>

        {/* Security Architecture */}
        <section>
          <h2
            className="mb-4 flex items-center gap-2 text-base font-semibold"
            style={{ color: "var(--color-agent-on-surface)" }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ color: "var(--color-agent-primary)" }}
            >
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
            </svg>
            Security Architecture
          </h2>
          <div
            className="rounded-2xl p-5"
            style={{ background: "var(--color-agent-surface-low)" }}
          >
            <p
              className="mb-5 text-sm leading-relaxed"
              style={{ color: "var(--color-agent-on-surface-variant)" }}
            >
              We use Tauri Stronghold to encrypt your API keys before they are
              written to disk. Our &ldquo;Local-First&rdquo; philosophy ensures
              that Curator AI operates as a sovereign vault for your
              professional identity.
            </p>
            <ul className="space-y-2.5">
              {[
                "AES-256-GCM Hardware Encryption",
                "Zero-Knowledge Key Storage",
                "Process-Isolated Security Sprites",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-sm">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    style={{ color: "var(--color-agent-secondary)" }}
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  <span style={{ color: "var(--color-agent-on-surface)" }}>
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* General Preferences */}
        <section>
          <h2
            className="mb-4 text-base font-semibold"
            style={{ color: "var(--color-agent-on-surface)" }}
          >
            General Preferences
          </h2>
          <div
            className="space-y-5 rounded-2xl p-5"
            style={{ background: "var(--color-agent-surface-low)" }}
          >
            {/* Interface Theme */}
            <div>
              <div className="mb-3">
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--color-agent-on-surface)" }}
                >
                  Interface Theme
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--color-agent-on-surface-variant)" }}
                >
                  Switch between Light and Dark mode
                </p>
              </div>
              <div
                className="inline-flex gap-1 rounded-xl p-1"
                style={{ background: "var(--color-agent-surface-container)" }}
                role="group"
                aria-label="Theme"
              >
                {(
                  [
                    {
                      value: "light" as const,
                      label: "Light",
                      icon: (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        >
                          <circle cx="12" cy="12" r="5" />
                          <line x1="12" y1="1" x2="12" y2="3" />
                          <line x1="12" y1="21" x2="12" y2="23" />
                          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                          <line x1="1" y1="12" x2="3" y2="12" />
                          <line x1="21" y1="12" x2="23" y2="12" />
                          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                        </svg>
                      ),
                    },
                    {
                      value: "dark" as const,
                      label: "Dark",
                      icon: (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        </svg>
                      ),
                    },
                    {
                      value: "system" as const,
                      label: "System",
                      icon: (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="2" y="3" width="20" height="14" rx="2" />
                          <line x1="8" y1="21" x2="16" y2="21" />
                          <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                      ),
                    },
                  ] as const
                ).map(({ value, label, icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all"
                    style={
                      theme === value
                        ? {
                            background: "var(--color-agent-surface-lowest)",
                            color: "var(--color-agent-on-surface)",
                            boxShadow: "var(--shadow-agent-card)",
                          }
                        : {
                            background: "transparent",
                            color: "var(--color-agent-on-surface-variant)",
                          }
                    }
                  >
                    {icon}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Telemetry */}
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--color-agent-on-surface)" }}
                >
                  Anonymous Telemetry
                </p>
                <p
                  className="text-xs"
                  style={{ color: "var(--color-agent-on-surface-variant)" }}
                >
                  Help improve AI parsing accuracy (Opt-in)
                </p>
              </div>
              <button
                role="switch"
                aria-checked={telemetry}
                onClick={() => setTelemetry((v) => !v)}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{
                  background: telemetry
                    ? "var(--color-agent-primary)"
                    : "var(--color-agent-surface-highest)",
                }}
              >
                <span
                  className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  style={{
                    transform: telemetry
                      ? "translateX(22px)"
                      : "translateX(4px)",
                  }}
                />
              </button>
            </div>

            {/* Version */}
            <div
              className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: "var(--color-agent-surface-container)" }}
            >
              <span
                className="text-sm"
                style={{ color: "var(--color-agent-on-surface-variant)" }}
              >
                Version 2.4.0 (Stable)
              </span>
              <button
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                style={{
                  background: "var(--color-agent-surface-high)",
                  color: "var(--color-agent-on-surface)",
                }}
              >
                Check for Updates
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
