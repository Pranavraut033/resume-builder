"use client";

import React, { useState } from "react";
import {
  Badge,
  Button,
  Icon,
  PageSection,
  Select,
  SettingsRow,
  SurfacePanel,
  Toggle,
} from "@/components/ui";
import { useEmailSync } from "@/hooks/useEmailSync";
import { useModelStore } from "@/store/modelStore";
import { ProviderType } from "@/types/llm";
import { saveGoogleCredentials } from "@/actions/emailSync";
import { useToast } from "@/components/ui/ToastProvider";
import { formatTimestamp } from "@/lib";

export function EmailTrackingSettings() {
  const { pushToast } = useToast();
  const {
    status,
    isStatusLoading,
    isSyncing,
    syncNow,
    connect,
    disconnect,
  } = useEmailSync();

  const {
    modelsByProvider,
    emailModelPair,
    activeModelPair,
    setEmailModel,
  } = useModelStore();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customClientId, setCustomClientId] = useState(status?.customClientId || "");
  const [customClientSecret, setCustomClientSecret] = useState("");
  const [isSavingCreds, setIsSavingCreds] = useState(false);

  // Build model options for selection
  const modelOptions = React.useMemo(() => {
    const list: string[] = ["Default (Use Primary Active Model)"];
    Object.entries(modelsByProvider).forEach(([provider, models]) => {
      (models || []).forEach((m) => {
        list.push(`${provider}:${m}`);
      });
    });
    return list;
  }, [modelsByProvider]);

  const currentModelValue = emailModelPair
    ? `${emailModelPair[0]}:${emailModelPair[1]}`
    : "Default (Use Primary Active Model)";

  const handleModelChange = (value: string) => {
    if (value === "Default (Use Primary Active Model)") {
      setEmailModel(null, null);
    } else {
      const parts = value.split(":");
      if (parts.length >= 2) {
        setEmailModel(parts[0] as ProviderType, parts.slice(1).join(":"));
      }
    }
  };

  const handleSaveCredentials = async () => {
    setIsSavingCreds(true);
    try {
      await saveGoogleCredentials(
        customClientId.trim() || null,
        customClientSecret.trim() || null
      );
      pushToast({
        title: "OAuth settings updated",
        variant: "success",
      });
    } catch {
      pushToast({
        title: "Failed to update OAuth settings",
        variant: "error",
      });
    } finally {
      setIsSavingCreds(false);
    }
  };

  return (
    <PageSection
      title="Email & Job Application Tracking"
      icon={<Icon name="mail" className="h-4 w-4 text-agent-primary" />}
    >
      <SurfacePanel stack>
        {/* Connection status */}
        <SettingsRow
          label="Google Account (Gmail)"
          description={
            status?.isConnected
              ? `Connected to ${status.email}. Recruiting emails are automatically parsed and linked to jobs.`
              : "Connect your Gmail with read-only permission. No manual OAuth setup required."
          }
          control={
            <div className="flex items-center gap-3">
              {isStatusLoading ? (
                <span className="text-xs text-neutral-400">Checking…</span>
              ) : status?.isConnected ? (
                <>
                  <Badge variant="success">Connected</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={disconnect}
                    className="text-rose-400 hover:text-rose-300"
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={connect}
                  icon={<Icon name="mail" className="h-4 w-4" />}
                >
                  Connect Gmail
                </Button>
              )}
            </div>
          }
        />

        {/* Sync Status and Manual Sync */}
        <SettingsRow
          label="Email Synchronization"
          description={
            status?.lastSyncedAt
              ? `Last synced: ${formatTimestamp(status.lastSyncedAt)}. Background sync runs twice daily and on launch (if inactive >6h).`
              : "Background sync runs twice daily and on launch (if inactive >6h)."
          }
          control={
            <div className="flex items-center gap-3">
              {status?.isConnected && (
                <div className="text-xs text-neutral-400 mr-2">
                  {status.totalEmails} emails tracked ({status.matchedEmails} linked)
                </div>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={syncNow}
                disabled={!status?.isConnected || isSyncing}
                icon={
                  <Icon
                    name={isSyncing ? "spinner" : "refreshCw"}
                    className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`}
                  />
                }
              >
                {isSyncing ? "Syncing…" : "Sync Now"}
              </Button>
            </div>
          }
        />

        {/* Dedicated Email Classification Model */}
        <SettingsRow
          label="Email AI Model"
          description={`Choose the dedicated model for parsing email updates. Currently active: ${
            emailModelPair
              ? `${emailModelPair[0]} (${emailModelPair[1]})`
              : activeModelPair
              ? `${activeModelPair[0]} (${activeModelPair[1]}) [inherited]`
              : "Default"
          }.`}
          control={
            <div className="w-72">
              <Select
                value={currentModelValue}
                onChange={handleModelChange}
                options={modelOptions}
                placeholder="Select Email Model"
              />
            </div>
          }
        />

        {/* Advanced Credentials Toggle */}
        <SettingsRow
          label="Custom Google OAuth Client (Optional)"
          description="Use your own Google Cloud Client ID instead of the default native app client."
          control={
            <Toggle
              checked={showAdvanced}
              onChange={setShowAdvanced}
            />
          }
        />

        {showAdvanced && (
          <div className="p-4 rounded-xl bg-agent-surface-container/50 border border-agent-outline-variant space-y-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Custom Google Client ID
              </label>
              <input
                type="text"
                value={customClientId}
                onChange={(e) => setCustomClientId(e.target.value)}
                placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                className="w-full text-xs px-3 py-2 rounded-lg border border-agent-outline-variant bg-agent-surface-lowest text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-agent-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Custom Client Secret (Optional for Native PKCE)
              </label>
              <input
                type="password"
                value={customClientSecret}
                onChange={(e) => setCustomClientSecret(e.target.value)}
                placeholder="Optional client secret"
                className="w-full text-xs px-3 py-2 rounded-lg border border-agent-outline-variant bg-agent-surface-lowest text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-agent-primary"
              />
            </div>
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSaveCredentials}
                disabled={isSavingCreds}
              >
                {isSavingCreds ? "Saving…" : "Save Custom Credentials"}
              </Button>
            </div>
          </div>
        )}
      </SurfacePanel>
    </PageSection>
  );
}
