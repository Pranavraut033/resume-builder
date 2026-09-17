"use client";

/**
 * Runs the email sync pipeline (fetch → classify → match → persist)
 * client-side, reporting progress through `notificationStore` — the same
 * progress→success/error pattern `runJobCreation.ts` uses for background job
 * creation. Replaces the old server-side `emailSyncService.ts`, which never
 * worked: it called client-only modules (keyStorage, the LLM providers) from
 * a `'use server'` action.
 *
 * ponytail: like runJobCreation.ts, the in-flight run lives only in this
 * module's promise chain — a hard reload mid-sync loses it silently. Fine
 * for a local desktop app with one sync at a time.
 */

import {
  ClassifiedEmailInput,
  filterNewMessageIds,
  getSyncCursor,
  persistClassifiedEmails,
} from "@/actions/emailSync";
import { queryClient } from "@/components/AppShell";
import {
  fetchRecruitingEmails,
  getValidAccessToken,
  GoogleReauthRequiredError,
} from "@/lib/email/gmailClient";
import { classifyEmail } from "@/lib/llm/emailClassifier";
import { createLogger } from "@/lib/logger";
import { useNotificationStore } from "@/store/notificationStore";

const logger = createLogger("runEmailSync");

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const OVERLAP_MS = 5 * 60 * 1000;

export type SyncStatus = "OK" | "NOT_CONNECTED" | "NEEDS_REAUTH" | "ERROR";

export interface SyncResult {
  status: SyncStatus;
  newEmailsCount: number;
  matchedJobsCount: number;
  error?: string;
}

let inFlight: Promise<SyncResult> | null = null;

/** Fire-and-forget: kicks off a sync without the caller awaiting it. */
export function startEmailSync(manual = false): void {
  void runEmailSync(manual);
}

/** Runs a sync, or returns the already-running one if a sync is in flight. */
export function runEmailSync(manual = false): Promise<SyncResult> {
  if (inFlight) return inFlight;
  const run = doRunEmailSync(manual).finally(() => {
    inFlight = null;
  });
  inFlight = run;
  return run;
}

async function doRunEmailSync(manual: boolean): Promise<SyncResult> {
  const notify = useNotificationStore.getState().notify;
  const update = useNotificationStore.getState().update;

  let accessToken: string | null;
  try {
    accessToken = await getValidAccessToken();
  } catch (err) {
    if (err instanceof GoogleReauthRequiredError) {
      if (manual) {
        notify({
          title: "Reconnect Gmail",
          description: err.message,
          status: "error",
          transient: true,
        });
      }
      return {
        status: "NEEDS_REAUTH",
        newEmailsCount: 0,
        matchedJobsCount: 0,
        error: err.message,
      };
    }
    throw err;
  }

  if (!accessToken) {
    return { status: "NOT_CONNECTED", newEmailsCount: 0, matchedJobsCount: 0 };
  }

  const notificationId = manual
    ? notify({
        title: "Syncing emails…",
        description: "Checking for new recruiting emails",
        status: "progress",
        transient: false,
      })
    : null;

  try {
    const cursor = await getSyncCursor();
    if (!cursor.accountId) {
      return {
        status: "NOT_CONNECTED",
        newEmailsCount: 0,
        matchedJobsCount: 0,
      };
    }

    const afterTimestamp = cursor.lastSyncedAt
      ? new Date(new Date(cursor.lastSyncedAt).getTime() - OVERLAP_MS)
      : new Date(Date.now() - THIRTY_DAYS_MS);

    const messages = await fetchRecruitingEmails(accessToken, {
      afterTimestamp,
    });
    const newIds = new Set(
      await filterNewMessageIds(messages.map((m) => m.messageId))
    );
    const newMessages = messages.filter((m) => newIds.has(m.messageId));

    const rows: ClassifiedEmailInput[] = [];
    for (let i = 0; i < newMessages.length; i++) {
      const msg = newMessages[i];
      if (notificationId) {
        update(notificationId, {
          description: `Classifying email ${i + 1}/${newMessages.length}`,
        });
      }
      try {
        const classification = await classifyEmail({
          sender: msg.sender,
          recipient: msg.recipient,
          subject: msg.subject,
          snippet: msg.snippet,
          bodyText: msg.bodyText,
          date: msg.date,
        });
        if (!classification.isRecruitingEmail) continue;
        rows.push({
          messageId: msg.messageId,
          threadId: msg.threadId,
          sender: msg.sender,
          recipient: msg.recipient,
          subject: msg.subject,
          snippet: msg.snippet,
          bodyText: msg.bodyText,
          receivedAt: msg.date.toISOString(),
          classification,
        });
      } catch (err) {
        // One bad message must not abort the run — skip it and keep going.
        logger.error("Failed to classify email, skipping", {
          messageId: msg.messageId,
          err,
        });
      }
    }

    const result = await persistClassifiedEmails(cursor.accountId, rows);

    void queryClient.invalidateQueries({ queryKey: ["emailSyncStatus"] });
    void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    void queryClient.invalidateQueries({ queryKey: ["jobEmails"] });

    if (notificationId) {
      update(notificationId, {
        title: "Email sync complete",
        description: `${result.created} new email${result.created === 1 ? "" : "s"}, ${result.matchedJobIds.length} job${result.matchedJobIds.length === 1 ? "" : "s"} updated`,
        status: "success",
      });
    }

    return {
      status: "OK",
      newEmailsCount: result.created,
      matchedJobsCount: result.matchedJobIds.length,
    };
  } catch (err) {
    logger.error("Email sync failed", { err });
    const message = err instanceof Error ? err.message : String(err);
    if (notificationId) {
      update(notificationId, {
        title: "Email sync failed",
        description: message,
        status: "error",
      });
    }
    return {
      status: "ERROR",
      newEmailsCount: 0,
      matchedJobsCount: 0,
      error: message,
    };
  }
}
