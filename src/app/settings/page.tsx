"use client";

import { useState, useEffect, useRef } from "react";

import { exportAppData, importAppData } from "@/actions/backup";
import {
  Alert,
  Badge,
  Button,
  MultiSelect,
  PageHeader,
  PageSection,
  SegmentedControl,
  SettingsRow,
  SurfacePanel,
  Toggle,
} from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { useAppUpdaterContext } from "@/contexts/AppUpdaterContext";
import { useTheme } from "@/contexts/ThemeContext";
import { downloadFile } from "@/lib/download";
import { setApiKey, getApiKey, isTauriContext } from "@/lib/keyStorage";
import { validateProviderConnection } from "@/lib/llm/clientLLM";
import { getAvailableProviders } from "@/lib/llm/providers";
import { createLogger } from "@/lib/logger";
import { useModelStore } from "@/store/modelStore";
import { ProviderType } from "@/types/llm";

import { ProviderCard } from "../../components/settings/ProviderCard";

const logger = createLogger("SettingsPage");

// Once acknowledged, the OS keychain permission prompt (triggered the first
// time we read a stored API key) doesn't need re-explaining on later visits.
const KEYCHAIN_NOTICE_SEEN_KEY = "settings.keychainNoticeSeen";

export default function SettingsPage() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [showKeychainNotice, setShowKeychainNotice] = useState(false);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [validatingProvider, setValidatingProvider] = useState<string | null>(
    null
  );
  const [validationResults, setValidationResults] = useState<
    Record<string, { success: boolean; message: string }>
  >({});
  const [ollamaHost, setOllamaHost] = useState("http://localhost:11434");
  const { theme, setTheme } = useTheme();
  const { pushToast } = useToast();
  const [telemetry, setTelemetry] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupError, setBackupError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { state: updaterState, checkForUpdates } = useAppUpdaterContext();
  const [checkingForUpdates, setCheckingForUpdates] = useState(false);

  const handleCheckForUpdates = async () => {
    setCheckingForUpdates(true);
    await checkForUpdates();
  };

  useEffect(() => {
    if (!checkingForUpdates || updaterState.status === "checking") return;
    setCheckingForUpdates(false);
    if (updaterState.status === "idle") {
      pushToast({ title: "You're up to date", variant: "success" });
    }
  }, [checkingForUpdates, updaterState, pushToast]);

  const {
    modelsByProvider,
    selectedModelsByProvider,
    error,
    isLoading,
    loadModels,
    refreshModels,
    clearError,
    setProviderModels,
  } = useModelStore();

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

  useEffect(() => {
    // Reading a stored key triggers an OS keychain permission prompt on
    // first access in the desktop app. Explain that before it pops up
    // unannounced, rather than firing it the instant this page mounts.
    if (isTauriContext() && !localStorage.getItem(KEYCHAIN_NOTICE_SEEN_KEY)) {
      setShowKeychainNotice(true);
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadModels]);

  const handleKeychainNoticeConfirm = () => {
    localStorage.setItem(KEYCHAIN_NOTICE_SEEN_KEY, "1");
    setShowKeychainNotice(false);
    loadData();
  };

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

  const handleBackup = async () => {
    setIsBackingUp(true);
    setBackupError(null);
    try {
      const backup = await exportAppData();
      downloadFile(
        `resume-builder-backup-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(backup, null, 2),
        "application/json"
      );
      pushToast({ title: "Backup downloaded", variant: "success" });
    } catch (err) {
      logger.error("Error exporting backup", { err });
      setBackupError("Failed to download backup. Please try again.");
    } finally {
      setIsBackingUp(false);
    }
  };

  const restoreFromText = async (text: string) => {
    setBackupError(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      logger.error("Error parsing backup file", { parseErr });
      setBackupError("That file isn't valid JSON.");
      return;
    }

    if (
      !window.confirm(
        "This will replace all current data and cannot be undone. Continue?"
      )
    ) {
      return;
    }

    setIsRestoring(true);
    try {
      const result = await importAppData(parsed);
      if (result.success) {
        pushToast({ title: "Backup restored", variant: "success" });
        window.location.reload();
      } else {
        setBackupError(result.error || "Failed to restore backup.");
      }
    } catch (err) {
      logger.error("Error restoring backup", { err });
      setBackupError("Failed to restore backup. Please try again.");
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRestoreClick = async () => {
    if (isTauriContext()) {
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const { readTextFile } = await import("@tauri-apps/plugin-fs");
        const path = await open({
          multiple: false,
          directory: false,
          filters: [{ name: "Backup", extensions: ["json"] }],
        });
        if (!path || Array.isArray(path)) return;
        const text = await readTextFile(path);
        await restoreFromText(text);
      } catch (err) {
        logger.error("Error opening backup file", { err });
        setBackupError("Failed to open backup file. Please try again.");
      }
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await restoreFromText(await file.text());
    } finally {
      e.target.value = "";
    }
  };

  // Only the 6 builtins + the managed provider are ever registered (see
  // providers/factory.ts), so narrowing the package's open ProviderId back
  // to our closed enum is safe.
  const cloudProviders = getAvailableProviders().filter(
    (p) => p.requiresAuth && !p.isLocal
  ) as (Omit<ReturnType<typeof getAvailableProviders>[number], "type"> & {
    type: ProviderType;
  })[];

  return (
    <div className="text-agent-on-surface min-h-full px-6 py-8">
      <ConfirmDialog
        isOpen={showKeychainNotice}
        title="Secure Key Storage"
        message="Curator AI encrypts your API keys and stores the encryption key in your operating system's keychain. Your OS will now ask you to allow access — click Allow to continue."
        confirmLabel="Continue"
        cancelLabel="Not now"
        onConfirm={handleKeychainNoticeConfirm}
        onCancel={() => setShowKeychainNotice(false)}
      />

      <PageHeader
        title="Settings"
        description="Configure your intelligent drafting engine. All configurations are stored locally on your device."
        badge={
          <Badge
            icon={
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
              </svg>
            }
          >
            Stored Locally &amp; Encrypted
          </Badge>
        }
      />

      {error && (
        <Alert variant="error" onDismiss={clearError}>
          Error loading models: {error}
        </Alert>
      )}

      {backupError && (
        <Alert variant="error" onDismiss={() => setBackupError(null)}>
          {backupError}
        </Alert>
      )}

      <div className="space-y-8">
        {/* Cloud LLM Providers */}
        <PageSection title="Cloud LLM Providers">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {cloudProviders.map((provider) => {
              return (
                <ProviderCard
                  key={provider.type}
                  providerType={provider.type}
                  apiKey={keys[provider.type] || ""}
                  onApiKeyChange={(v) =>
                    setKeys((prev) => ({ ...prev, [provider.type]: v }))
                  }
                  onSave={() => handleSaveKey(provider.type)}
                  onValidate={() => handleValidate(provider.type)}
                  isSaving={savingProvider === provider.type}
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
        </PageSection>

        {/* Local LLM — Ollama */}
        <PageSection title="Local LLM">
          <SurfacePanel>
            <p className="text-agent-on-surface-variant text-sm leading-relaxed">
              Connect to Ollama for 100% private, air-gapped processing. No data
              ever leaves your machine when using local models.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Status */}
              <div className="bg-agent-surface-container rounded-xl px-4 py-3">
                <p className="text-agent-on-surface-variant mb-2 text-xs font-semibold tracking-wider uppercase">
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
                  <span className="text-agent-on-surface text-sm font-medium">
                    {modelsByProvider.ollama?.length
                      ? "Ollama Service Detected"
                      : "Ollama Not Connected"}
                  </span>
                </div>
              </div>

              {/* Host URL */}
              <div className="bg-agent-surface-container rounded-xl px-4 py-3">
                <p className="text-agent-on-surface-variant mb-2 text-xs font-semibold tracking-wider uppercase">
                  Host URL
                </p>
                <input
                  type="text"
                  value={ollamaHost}
                  onChange={(e) => setOllamaHost(e.target.value)}
                  className="text-agent-on-surface w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            {(modelsByProvider.ollama?.length ?? 0) > 0 && (
              <div>
                <p className="text-agent-on-surface-variant mb-2 text-xs font-medium">
                  Select Model
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

            <div className="mt-3 flex justify-end">
              <Button
                variant="gradient"
                size="sm"
                onClick={() => refreshModels(ProviderType.OLLAMA)}
                icon={
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
                }
              >
                Test Connection
              </Button>
            </div>
          </SurfacePanel>
        </PageSection>

        {/* Security Architecture */}
        <PageSection
          title="Security Architecture"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
            </svg>
          }
        >
          <SurfacePanel>
            <p className="text-agent-on-surface-variant text-sm leading-relaxed">
              Your API keys are encrypted with AES-256-GCM using a unique
              encryption key generated for your device and stored in your
              operating system&apos;s secure keychain before being written to
              disk locally. Our &ldquo;Local-First&rdquo; philosophy ensures
              that Curator AI operates as a sovereign vault for your
              professional identity.
            </p>
            <ul className="space-y-2.5">
              {[
                "AES-256-GCM Encrypted Storage",
                "Per-Device Key in Your OS Keychain",
                "Keys Never Leave Your Device",
                "Process-Isolated Security Sprites",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2.5 text-sm">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="text-agent-secondary shrink-0"
                  >
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  <span className="text-agent-on-surface">{feature}</span>
                </li>
              ))}
            </ul>
          </SurfacePanel>
        </PageSection>

        {/* Backup & Restore */}
        <PageSection title="Backup & Restore">
          <SurfacePanel stack>
            <SettingsRow
              label="Download Backup"
              description="Download all your data as a JSON file"
              control={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBackup}
                  disabled={isBackingUp}
                >
                  Download Backup
                </Button>
              }
            />

            <SettingsRow
              label="Restore from File"
              description="Replaces all current data with the contents of a backup file. This cannot be undone."
              control={
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRestoreClick}
                    disabled={isRestoring}
                  >
                    Restore from File…
                  </Button>
                  <input
                    type="file"
                    accept="application/json"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </>
              }
            />
          </SurfacePanel>
        </PageSection>

        {/* General Preferences */}
        <PageSection title="General Preferences">
          <SurfacePanel stack>
            {/* Interface Theme */}
            <SettingsRow
              label="Interface Theme"
              description="Switch between Light and Dark mode"
              control={
                <SegmentedControl
                  ariaLabel="Theme"
                  value={theme}
                  onChange={setTheme}
                  options={[
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
                  ]}
                />
              }
            />

            {/* Telemetry */}
            <SettingsRow
              label="Anonymous Telemetry"
              description="Help improve AI parsing accuracy (Opt-in)"
              control={
                <Toggle
                  checked={telemetry}
                  onChange={setTelemetry}
                  label="Anonymous Telemetry"
                />
              }
            />

            {/* Version */}
            <div className="bg-agent-surface-container flex items-center justify-between rounded-xl px-4 py-3">
              <span className="text-agent-on-surface-variant text-sm">
                Version 2.4.0 (Stable)
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCheckForUpdates}
                disabled={
                  checkingForUpdates || updaterState.status === "checking"
                }
              >
                {checkingForUpdates || updaterState.status === "checking"
                  ? "Checking..."
                  : "Check for Updates"}
              </Button>
            </div>
          </SurfacePanel>
        </PageSection>
      </div>
    </div>
  );
}
