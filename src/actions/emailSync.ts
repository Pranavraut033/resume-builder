"use server";

import { takeAuthCode } from "@/lib/email/authCodeStore";
import { isJobAlert } from "@/lib/email/jobAlert";
import { loadJobCandidates, matchEmailToJob } from "@/lib/email/jobMatcher";
import { normalizeListingUrl } from "@/lib/email/listingUrl";
import { createLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import type { EmailClassification } from "@/lib/llm/emailClassifier";
import type { ListingInput } from "@/lib/llm/listingExtractor";

const logger = createLogger("EmailSyncActions");

export interface EmailStatusDTO {
  hasAccount: boolean;
  email: string | null;
  lastSyncedAt: string | null;
  totalEmails: number;
  matchedEmails: number;
  totalListings: number;
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

    // Display-only counts must not decide "connected": if one throws, the
    // account is still there, and reporting hasAccount:false would flip
    // Settings back to "Connect Gmail". Application emails only — job-alert
    // digests are counted via their listings.
    let [totalEmails, matchedEmails, totalListings] = [0, 0, 0];
    try {
      [totalEmails, matchedEmails, totalListings] = await Promise.all([
        prisma.jobEmail.count({ where: { kind: "APPLICATION" } }),
        prisma.jobEmail.count({
          where: { kind: "APPLICATION", jobId: { not: null } },
        }),
        prisma.jobListing.count(),
      ]);
    } catch (err) {
      logger.error("Failed to count tracked emails", { err });
    }

    return {
      hasAccount: Boolean(account),
      email: account?.email ?? null,
      lastSyncedAt: account?.lastSyncedAt?.toISOString() ?? null,
      totalEmails,
      matchedEmails,
      totalListings,
    };
  } catch (err) {
    logger.error("Failed to get email sync status", { err });
    return {
      hasAccount: false,
      email: null,
      lastSyncedAt: null,
      totalEmails: 0,
      matchedEmails: 0,
      totalListings: 0,
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
  /**
   * Where the job-alert pass resumes: the newest stored digest. Null until one
   * exists, which the client treats as "backfill MAX_EMAIL_AGE_DAYS" — alerts that arrived
   * before this feature were never fetched, so lastSyncedAt would skip them.
   * ponytail: an install with genuinely no alerts re-lists the age window every sync;
   * add a per-account alerts cursor if that ever costs real time.
   */
  alertsAfter: string | null;
}

export async function getSyncCursor(): Promise<SyncCursorDTO> {
  const account = await prisma.emailAccount.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  const newestAlert = await prisma.jobEmail.findFirst({
    where: { kind: "ALERT" },
    orderBy: { receivedAt: "desc" },
    select: { receivedAt: true },
  });
  return {
    accountId: account?.id ?? null,
    lastSyncedAt: account?.lastSyncedAt?.toISOString() ?? null,
    alertsAfter: newestAlert?.receivedAt.toISOString() ?? null,
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
  /** Postings extracted from an ALERT digest; ignored for APPLICATION rows. */
  listings?: ListingInput[];
}

export interface PersistResult {
  created: number;
  listingsCreated: number;
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

/** Inserts postings not seen before (unique on the normalized url); existing ones keep their firstSeenAt. */
async function saveListings(
  jobEmailId: number,
  listings: ListingInput[],
  seenAt: Date
): Promise<number> {
  const byUrl = new Map(
    listings.map((l) => [normalizeListingUrl(l.url), l] as const)
  );
  if (byUrl.size === 0) return 0;
  const existing = await prisma.jobListing.findMany({
    where: { url: { in: [...byUrl.keys()] } },
    select: { url: true },
  });
  const known = new Set(existing.map((l) => l.url));
  const fresh = [...byUrl].filter(([url]) => !known.has(url));
  if (fresh.length === 0) return 0;
  await prisma.jobListing.createMany({
    data: fresh.map(([url, l]) => ({
      title: l.title,
      companyName: l.companyName,
      location: l.location,
      url,
      source: l.source,
      postedText: l.postedText,
      firstSeenAt: seenAt,
      jobEmailId,
    })),
  });
  return fresh.length;
}

export interface MisfiledAlert {
  id: number;
  sender: string;
  subject: string;
  snippet: string;
  bodyText: string | null;
}

/**
 * Digests stored before `kind` existed sit as unlinked APPLICATION rows, and
 * message-id dedupe means a sync would never revisit them. Unlinked only: a row
 * the user linked to a job is theirs to keep as-is.
 */
export async function getMisfiledAlerts(): Promise<MisfiledAlert[]> {
  const rows = await prisma.jobEmail.findMany({
    where: { kind: "APPLICATION", jobId: null },
    select: {
      id: true,
      sender: true,
      subject: true,
      snippet: true,
      bodyText: true,
    },
  });
  return rows.filter(isJobAlert);
}

/** Re-labels misfiled digests as ALERT and stores the postings extracted from them. */
export async function promoteStoredAlerts(
  items: { emailId: number; listings: ListingInput[] }[]
): Promise<{ promoted: number; listingsCreated: number }> {
  let promoted = 0;
  let listingsCreated = 0;
  for (const { emailId, listings } of items) {
    const { count } = await prisma.jobEmail.updateMany({
      where: { id: emailId, kind: "APPLICATION", jobId: null },
      data: {
        kind: "ALERT",
        stage: null,
        nextSteps: null,
        actionRequired: false,
      },
    });
    if (count === 0) continue;
    promoted++;
    const email = await prisma.jobEmail.findUnique({
      where: { id: emailId },
      select: { receivedAt: true },
    });
    listingsCreated += await saveListings(
      emailId,
      listings,
      email?.receivedAt ?? new Date()
    );
  }
  return { promoted, listingsCreated };
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
  let listingsCreated = 0;
  const matchedJobIds = new Set<number>();
  const failedMessageIds: string[] = [];

  for (const row of rows) {
    if (!row.classification.isRecruitingEmail) continue;

    try {
      if (row.classification.kind === "ALERT") {
        // A digest is not correspondence about a tracked job: no matching, and
        // never a status change (it may say "interview" in a recommended title).
        const email = await prisma.jobEmail.create({
          data: {
            messageId: row.messageId,
            threadId: row.threadId ?? undefined,
            sender: row.sender,
            recipient: row.recipient ?? undefined,
            subject: row.subject,
            snippet: row.snippet,
            bodyText: row.bodyText ?? undefined,
            receivedAt: new Date(row.receivedAt),
            companyName: row.classification.companyName ?? undefined,
            confidence: row.classification.confidence,
            kind: "ALERT",
          },
        });
        created++;
        listingsCreated += await saveListings(
          email.id,
          row.listings ?? [],
          new Date(row.receivedAt)
        );
        continue;
      }

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
          companyName: row.classification.companyName ?? undefined,
          role: row.classification.role ?? undefined,
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
    listingsCreated,
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

// ponytail: hidden rows are returned too — /emails filters them client-side so
// "Show hidden" is instant. Fine at personal-inbox scale; paginate past ~200.
export async function getAllTrackedEmails(limit = 200) {
  try {
    return await prisma.jobEmail.findMany({
      where: { kind: "APPLICATION" },
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

export type TrackedEmail = Awaited<
  ReturnType<typeof getAllTrackedEmails>
>[number];

/** View preference only — mirrors `setJobHidden`; classification/link/status are untouched. */
export async function setJobEmailHidden(emailId: number, hidden: boolean) {
  return prisma.jobEmail.update({
    where: { id: emailId },
    data: { hiddenAt: hidden ? new Date() : null },
  });
}

/** Undoes a wrong match. Pairs with `linkEmailToJob`. */
export async function unlinkEmail(emailId: number) {
  return prisma.jobEmail.update({
    where: { id: emailId },
    data: { jobId: null, companyId: null },
  });
}

// ponytail: capped like getAllTrackedEmails; dismissed rows come back so the
// page's "Show dismissed" is instant. Paginate past a few hundred listings.
export async function getJobListings(limit = 300) {
  try {
    const [listings, jobs] = await Promise.all([
      prisma.jobListing.findMany({
        orderBy: { firstSeenAt: "desc" },
        take: limit,
      }),
      prisma.job.findMany({
        where: { url: { not: null } },
        select: { id: true, url: true },
      }),
    ]);
    // Saved = a Job already exists for this posting, however it got there
    // (this page, /bookmarks, Find Jobs) — derived, so nothing to write back.
    const jobIdByUrl = new Map(
      jobs.map((j) => [normalizeListingUrl(j.url!), j.id] as const)
    );
    return listings.map((l) => ({
      ...l,
      savedJobId: jobIdByUrl.get(l.url) ?? null,
    }));
  } catch (err) {
    logger.error("Failed to fetch job listings", { err });
    return [];
  }
}

export type JobListingRow = Awaited<ReturnType<typeof getJobListings>>[number];

/** Dismiss/restore — a view preference, mirrors `setJobEmailHidden`. */
export async function setListingHidden(listingId: number, hidden: boolean) {
  return prisma.jobListing.update({
    where: { id: listingId },
    data: { hiddenAt: hidden ? new Date() : null },
  });
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
