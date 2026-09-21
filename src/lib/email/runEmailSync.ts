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
  getMisfiledAlerts,
  getSyncCursor,
  persistClassifiedEmails,
  promoteStoredAlerts,
} from "@/actions/emailSync";
import { queryClient } from "@/components/AppShell";
import {
  fetchRecruitingEmails,
  getValidAccessToken,
  JOB_ALERT_QUERY,
  GoogleReauthRequiredError,
} from "@/lib/email/gmailClient";
import { syncAfter } from "@/lib/email/syncWindow";
import { classifyEmail } from "@/lib/llm/emailClassifier";
import { extractJobListings } from "@/lib/llm/listingExtractor";
import { createLogger } from "@/lib/logger";
import {
  describeSyncProgress,
  useEmailSyncStore,
  type SyncProgress,
} from "@/store/emailSyncStore";
import { useNotificationStore } from "@/store/notificationStore";

const logger = createLogger("runEmailSync");

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

/**
 * Runs a sync, or joins the one already running. This is the single place
 * `isSyncing` is set: true when a run starts, false in `finally` — so a throw,
 * a NOT_CONNECTED bail-out or a reauth failure can never leave every button
 * stuck on "Syncing…". A caller that joins a run doesn't start a second one
 * (nor touch the flag); it just gets the same result.
 */
export function runEmailSync(manual = false): Promise<SyncResult> {
  if (inFlight) return inFlight;
  useEmailSyncStore.setState({
    isSyncing: true,
    progress: { phase: "fetching", done: 0, total: 0 },
  });
  const run = doRunEmailSync(manual).finally(() => {
    inFlight = null;
    useEmailSyncStore.setState({ isSyncing: false, progress: null });
    // Token state can change on any outcome (refreshed, or cleared on reauth).
    void queryClient.invalidateQueries({ queryKey: ["emailSyncStatus"] });
    void queryClient.invalidateQueries({ queryKey: ["gmailHasToken"] });
  });
  inFlight = run;
  return run;
}

/** Best-effort: converts digests stored before `kind` existed. Returns new listings. */
async function promoteMisfiledAlerts(): Promise<number> {
  try {
    const stale = await getMisfiledAlerts();
    if (stale.length === 0) return 0;
    const items = [];
    for (const email of stale) {
      items.push({
        emailId: email.id,
        listings: await extractJobListings(email),
      });
    }
    return (await promoteStoredAlerts(items)).listingsCreated;
  } catch (err) {
    logger.error("Converting stored job alerts failed", { err });
    return 0;
  }
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

  // One place that says where the run is: the store feeds every Sync button,
  // and a manual run's notification shows the same text.
  const report = (progress: SyncProgress) => {
    useEmailSyncStore.setState({ progress });
    if (notificationId) {
      update(notificationId, { description: describeSyncProgress(progress) });
    }
  };

  try {
    const cursor = await getSyncCursor();
    if (!cursor.accountId) {
      return {
        status: "NOT_CONNECTED",
        newEmailsCount: 0,
        matchedJobsCount: 0,
      };
    }

    // Both passes are floored at MAX_EMAIL_AGE_DAYS (see syncWindow.ts).
    const applicationMessages = await fetchRecruitingEmails(accessToken, {
      afterTimestamp: syncAfter(cursor.lastSyncedAt),
      onProgress: (done, total) => report({ phase: "fetching", done, total }),
    });
    // Best-effort: a failed digest pass must not lose the application emails.
    const alertMessages = await fetchRecruitingEmails(accessToken, {
      query: JOB_ALERT_QUERY,
      maxResults: 150,
      // Own cursor: lastSyncedAt would skip every alert older than this feature.
      afterTimestamp: syncAfter(cursor.alertsAfter),
      longBody: true,
      onProgress: (done, total) => report({ phase: "fetching", done, total }),
    }).catch((err) => {
      logger.error("Job alert fetch failed, continuing without digests", {
        err,
      });
      return [];
    });
    const seenIds = new Set<string>();
    // Alert pass first: on a collision its copy has the longer body.
    const messages = [...alertMessages, ...applicationMessages].filter((m) =>
      seenIds.has(m.messageId) ? false : (seenIds.add(m.messageId), true)
    );
    const newIds = new Set(
      await filterNewMessageIds(messages.map((m) => m.messageId))
    );
    const newMessages = messages.filter((m) => newIds.has(m.messageId));

    const rows: ClassifiedEmailInput[] = [];
    for (let i = 0; i < newMessages.length; i++) {
      const msg = newMessages[i];
      report({ phase: "classifying", done: i + 1, total: newMessages.length });
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
        const listings =
          classification.kind === "ALERT"
            ? await extractJobListings(msg)
            : undefined;
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
          listings,
        });
      } catch (err) {
        // One bad message must not abort the run — skip it and keep going.
        logger.error("Failed to classify email, skipping", {
          messageId: msg.messageId,
          err,
        });
      }
    }

    report({ phase: "saving", done: 0, total: 0 });
    const result = await persistClassifiedEmails(cursor.accountId, rows);
    // After the alert fetch: alertsAfter above was read before these rows became ALERTs.
    result.listingsCreated += await promoteMisfiledAlerts();

    void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    void queryClient.invalidateQueries({ queryKey: ["jobEmails"] });
    void queryClient.invalidateQueries({ queryKey: ["jobListings"] });

    if (notificationId) {
      update(notificationId, {
        title: "Email sync complete",
        description: `${result.created} new email${result.created === 1 ? "" : "s"}, ${result.matchedJobIds.length} job${result.matchedJobIds.length === 1 ? "" : "s"} updated${result.listingsCreated > 0 ? `, ${result.listingsCreated} new listing${result.listingsCreated === 1 ? "" : "s"}` : ""}`,
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
