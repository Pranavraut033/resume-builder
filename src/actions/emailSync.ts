"use server";

import { takeAuthCode } from "@/lib/email/authCodeStore";
import { loadJobCandidates, matchEmailToJob } from "@/lib/email/jobMatcher";
import { createLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import type { EmailClassification } from "@/lib/llm/emailClassifier";

const logger = createLogger("EmailSyncActions");

export interface EmailStatusDTO {
  hasAccount: boolean;
  email: string | null;
  lastSyncedAt: string | null;
  totalEmails: number;
  matchedEmails: number;
}

/**
 * DB-only connection status. Whether a *usable* (non-expired/non-revoked)
 * token exists is a client-side question — tokens live in keyStorage, never
 * here — so `useEmailSync` combines this with its own client-side token
 * check before showing "Connected".
 */
export async function getEmailSyncStatus(): Promise<EmailStatusDTO> {
  try {
    const account = await prisma.emailAccount.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    });

    const totalEmails = await prisma.jobEmail.count();
    const matchedEmails = await prisma.jobEmail.count({
      where: { jobId: { not: null } },
    });

    return {
      hasAccount: Boolean(account),
      email: account?.email ?? null,
      lastSyncedAt: account?.lastSyncedAt?.toISOString() ?? null,
      totalEmails,
      matchedEmails,
    };
  } catch (err) {
    logger.error("Failed to get email sync status", { err });
    return {
      hasAccount: false,
      email: null,
      lastSyncedAt: null,
      totalEmails: 0,
      matchedEmails: 0,
    };
  }
}

/** Picks up the code the callback route stashed for this connect attempt. Single-use. */
export async function consumeAuthCode(
  state: string
): Promise<{ code: string | null }> {
  return { code: takeAuthCode(state) };
}

export async function upsertEmailAccount(
  email: string
): Promise<{ id: number }> {
  const account = await prisma.emailAccount.upsert({
    where: { email },
    update: { provider: "GMAIL", isActive: true },
    create: { email, provider: "GMAIL", isActive: true },
  });
  return { id: account.id };
}

export interface SyncCursorDTO {
  accountId: number | null;
  lastSyncedAt: string | null;
}

export async function getSyncCursor(): Promise<SyncCursorDTO> {
  const account = await prisma.emailAccount.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  return {
    accountId: account?.id ?? null,
    lastSyncedAt: account?.lastSyncedAt?.toISOString() ?? null,
  };
}

/** Dedupes against already-synced messages before the caller pays for classification. */
export async function filterNewMessageIds(
  messageIds: string[]
): Promise<string[]> {
  if (messageIds.length === 0) return [];
  const existing = await prisma.jobEmail.findMany({
    where: { messageId: { in: messageIds } },
    select: { messageId: true },
  });
  const existingIds = new Set(existing.map((e) => e.messageId));
  return messageIds.filter((id) => !existingIds.has(id));
}

export interface ClassifiedEmailInput {
  messageId: string;
  threadId?: string | null;
  sender: string;
  recipient?: string | null;
  subject: string;
  snippet: string;
  bodyText?: string | null;
  receivedAt: string;
  classification: EmailClassification;
}

export interface PersistResult {
  created: number;
  matchedJobIds: number[];
  failedMessageIds: string[];
}

async function applyJobStatusFromEmail(
  jobId: number,
  stage: NonNullable<EmailClassification["stage"]>
): Promise<void> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { status: true },
  });
  if (!job) return;

  let newStatus: string | null = null;
  if (
    stage === "INTERVIEW" &&
    (job.status === "APPLIED" || job.status === "DRAFT")
  ) {
    newStatus = "INTERVIEW";
  } else if (stage === "OFFER" && job.status !== "OFFER") {
    newStatus = "OFFER";
  } else if (stage === "REJECTED" && job.status !== "OFFER") {
    newStatus = "REJECTED";
  }

  if (newStatus) {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: newStatus },
    });
  }
}

/**
 * Persists already-classified emails (classification runs client-side, see
 * runEmailSync.ts). Loads job candidates once for the whole batch, matches
 * and writes each row independently — one bad row doesn't abort the rest —
 * and always advances `lastSyncedAt`, even on partial failure.
 */
export async function persistClassifiedEmails(
  accountId: number,
  rows: ClassifiedEmailInput[]
): Promise<PersistResult> {
  const candidates = await loadJobCandidates();
  let created = 0;
  const matchedJobIds = new Set<number>();
  const failedMessageIds: string[] = [];

  for (const row of rows) {
    if (!row.classification.isRecruitingEmail) continue;

    try {
      const match = matchEmailToJob(
        {
          sender: row.sender,
          recipient: row.recipient,
          subject: row.subject,
          snippet: row.snippet,
          bodyText: row.bodyText,
        },
        row.classification,
        candidates
      );

      await prisma.jobEmail.create({
        data: {
          messageId: row.messageId,
          threadId: row.threadId ?? undefined,
          sender: row.sender,
          recipient: row.recipient ?? undefined,
          subject: row.subject,
          snippet: row.snippet,
          bodyText: row.bodyText ?? undefined,
          receivedAt: new Date(row.receivedAt),
          stage: row.classification.stage ?? undefined,
          confidence: row.classification.confidence,
          nextSteps: row.classification.nextSteps ?? undefined,
          actionRequired: row.classification.actionRequired,
          jobId: match?.jobId ?? null,
          companyId: match?.companyId ?? null,
        },
      });
      created++;

      if (match) {
        matchedJobIds.add(match.jobId);
        if (row.classification.confidence >= 0.7 && row.classification.stage) {
          await applyJobStatusFromEmail(match.jobId, row.classification.stage);
        }
      }
    } catch (err) {
      logger.error("Failed to persist classified email", {
        messageId: row.messageId,
        err,
      });
      failedMessageIds.push(row.messageId);
    }
  }

  await prisma.emailAccount.update({
    where: { id: accountId },
    data: { lastSyncedAt: new Date() },
  });

  return {
    created,
    matchedJobIds: Array.from(matchedJobIds),
    failedMessageIds,
  };
}

export async function disconnectGoogleAccount(): Promise<{ success: boolean }> {
  try {
    await prisma.emailAccount.updateMany({ data: { isActive: false } });
    return { success: true };
  } catch (err) {
    logger.error("Failed to disconnect Google account", { err });
    return { success: false };
  }
}

export async function getEmailsForJob(jobId: number) {
  try {
    return await prisma.jobEmail.findMany({
      where: { jobId },
      orderBy: { receivedAt: "desc" },
    });
  } catch (err) {
    logger.error("Failed to fetch emails for job", { jobId, err });
    return [];
  }
}

export async function getAllTrackedEmails(limit = 50) {
  try {
    return await prisma.jobEmail.findMany({
      include: {
        job: {
          select: {
            id: true,
            role: true,
            status: true,
            company: { select: { name: true } },
          },
        },
      },
      orderBy: { receivedAt: "desc" },
      take: limit,
    });
  } catch (err) {
    logger.error("Failed to fetch all emails", { err });
    return [];
  }
}

export async function linkEmailToJob(emailId: number, jobId: number) {
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { companyId: true },
    });
    return await prisma.jobEmail.update({
      where: { id: emailId },
      data: {
        jobId,
        companyId: job?.companyId ?? undefined,
      },
    });
  } catch (err) {
    logger.error("Failed to link email to job", { emailId, jobId, err });
    throw err;
  }
}

/**
 * One-time cleanup for installs that connected on an older build, when the
 * OAuth callback wrote tokens straight into SQLite. Tokens now live only in
 * client-side keyStorage; this just wipes the leftover plaintext columns.
 * The `EmailAccount` schema keeps the columns (see CLAUDE.md) since
 * scripts/migrate-app-db.mjs is additive-only — dropping them would leave
 * upgraded installs with stale data and fresh installs without the columns.
 */
export async function wipeLegacyPlaintextTokens(): Promise<void> {
  try {
    await prisma.emailAccount.updateMany({
      where: {
        OR: [{ accessToken: { not: null } }, { refreshToken: { not: null } }],
      },
      data: { accessToken: null, refreshToken: null, tokenExpiry: null },
    });
  } catch (err) {
    logger.error("Failed to wipe legacy plaintext email tokens", { err });
  }
}
