"use client";

import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";

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
import { useToast } from "@/components/ui/ToastProvider";
import { useEmailSync } from "@/hooks/useEmailSync";
import { formatTimestamp } from "@/lib";
import {
  DEFAULT_GOOGLE_CLIENT_ID,
  getActiveClientId,
  hasDefaultGoogleClient,
  setCustomGoogleCredentials,
} from "@/lib/email/gmailClient";
import { useModelStore } from "@/store/modelStore";
import { ProviderType } from "@/types/llm";

const DOCS_URL =
  "https://github.com/Pranavraut033/resume-builder/blob/main/docs/EMAIL_TRACKING.md";

export function EmailTrackingSettings() {
  const { pushToast } = useToast();
  const {
    status,
    isConnected,
    isStatusLoading,
    isSyncing,
    isConnecting,
    syncNow,
    connect,
    disconnect,
  } = useEmailSync();

  const { modelsByProvider, emailModelPair, activeModelPair, setEmailModel } =
    useModelStore();

  const { data: activeClientId, refetch: refetchClientId } = useQuery({
    queryKey: ["gmailActiveClientId"],
    queryFn: () => getActiveClientId(),
    staleTime: 60 * 1000,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customClientId, setCustomClientId] = useState("");
  const [customClientSecret, setCustomClientSecret] = useState("");
  const [isSavingCreds, setIsSavingCreds] = useState(false);

  // Seed the editable field whenever the resolved client ID changes (e.g.
  // first load, or after a save) — not just once at mount, which would miss
  // the async result entirely. Leave it blank when the active id is just the
  // bundled default (nothing custom to show) rather than pre-filling
  // Udaan's own client ID into a "your custom client" field.
  useEffect(() => {
    if (activeClientId === undefined) return;
    setCustomClientId(
      activeClientId && activeClientId !== DEFAULT_GOOGLE_CLIENT_ID
        ? activeClientId
        : ""
    );
  }, [activeClientId]);

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
      await setCustomGoogleCredentials(
        customClientId.trim() || null,
        customClientSecret.trim() || null
      );
      pushToast({ title: "OAuth settings updated", variant: "success" });
      await refetchClientId();
    } catch (err) {
      pushToast({
        title: "Failed to update OAuth settings",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    } finally {
      setIsSavingCreds(false);
    }
  };

  const redirectUri =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/auth/callback/google`
      : "<app origin>/api/auth/callback/google";

  return (
    <PageSection
      title="Email & Job Application Tracking"
      icon={<Icon name="mail" className="text-agent-primary h-4 w-4" />}
    >
      <SurfacePanel stack>
        {/* Connection status */}
        <SettingsRow
          label="Google Account (Gmail)"
          description={
            isConnecting
              ? "Waiting for you to finish signing in in your browser — don't close or reload the app until this finishes."
              : isConnected
                ? `Connected to ${status?.email}. Recruiting emails are automatically parsed and linked to jobs.`
                : hasDefaultGoogleClient()
                  ? "Connect your Gmail with read-only permission."
                  : "Connect your Gmail with read-only permission. Requires a Google OAuth client you set up yourself — see below."
          }
          control={
            <div className="flex items-center gap-3">
              {isStatusLoading ? (
                <span className="text-xs text-neutral-400">Checking…</span>
              ) : isConnected ? (
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
                  disabled={isConnecting}
                  icon={
                    <Icon
                      name={isConnecting ? "spinner" : "mail"}
                      className={`h-4 w-4 ${isConnecting ? "animate-spin" : ""}`}
                    />
                  }
                >
                  {isConnecting ? "Waiting for sign-in…" : "Connect Gmail"}
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
              {isConnected && (
                <div className="mr-2 text-xs text-neutral-400">
                  {status?.totalEmails} emails tracked ({status?.matchedEmails}{" "}
                  linked)
                </div>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={syncNow}
                disabled={!isConnected || isSyncing}
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

        {/* Google OAuth Client — optional override when a bundled default exists */}
        <SettingsRow
          label={
            hasDefaultGoogleClient()
              ? "Custom Google OAuth Client (Optional)"
              : "Google OAuth Client"
          }
          description={
            hasDefaultGoogleClient() ? (
              <>
                Udaan ships with a working Google OAuth client, so this is
                optional. Use your own instead (e.g. for a private/unlimited
                quota) by creating one in Google Cloud Console — see the{" "}
                <a
                  href={DOCS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-agent-primary underline"
                >
                  step-by-step guide
                </a>
                .
              </>
            ) : (
              <>
                Required before connecting Gmail — there is no bundled client
                ID. Create one in Google Cloud Console (Gmail API, OAuth consent
                screen in Testing mode with yourself as a test user, Web
                application credentials with the redirect URI below) and paste
                it here.{" "}
                <a
                  href={DOCS_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-agent-primary underline"
                >
                  Step-by-step guide
                </a>
                .
              </>
            )
          }
          control={<Toggle checked={showAdvanced} onChange={setShowAdvanced} />}
        />

        {showAdvanced && (
          <div className="bg-agent-surface-container/50 border-agent-outline-variant space-y-3 rounded-xl border p-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-300">
                Redirect URI to register in Google Cloud Console
              </label>
              <code className="border-agent-outline-variant bg-agent-surface-lowest block w-full rounded-lg border px-3 py-2 text-xs text-neutral-300 select-all">
                {redirectUri}
              </code>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-300">
                Google Client ID
              </label>
              <input
                type="text"
                value={customClientId}
                onChange={(e) => setCustomClientId(e.target.value)}
                placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                className="border-agent-outline-variant bg-agent-surface-lowest focus:border-agent-primary w-full rounded-lg border px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-300">
                Client Secret
              </label>
              <input
                type="password"
                value={customClientSecret}
                onChange={(e) => setCustomClientSecret(e.target.value)}
                placeholder="Google requires this at token exchange even with PKCE"
                className="border-agent-outline-variant bg-agent-surface-lowest focus:border-agent-primary w-full rounded-lg border px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSaveCredentials}
                disabled={isSavingCreds}
              >
                {isSavingCreds ? "Saving…" : "Save Google OAuth Client"}
              </Button>
            </div>
          </div>
        )}
      </SurfacePanel>
    </PageSection>
  );
}
