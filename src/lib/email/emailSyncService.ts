import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import {
  fetchRecruitingEmails,
  getGoogleUserInfo,
  getValidAccessToken,
} from "./gmailClient";
import { classifyEmail } from "@/lib/llm/emailClassifier";
import { matchEmailToJob } from "./jobMatcher";

const logger = createLogger("EmailSyncService");

export interface SyncResult {
  success: boolean;
  status: "OK" | "NOT_CONNECTED" | "ERROR";
  newEmailsCount: number;
  matchedJobsCount: number;
  lastSyncedAt: Date | null;
  error?: string;
}

export async function syncEmails(): Promise<SyncResult> {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      logger.info("Sync skipped: No valid Google access token found");
      return {
        success: false,
        status: "NOT_CONNECTED",
        newEmailsCount: 0,
        matchedJobsCount: 0,
        lastSyncedAt: null,
      };
    }

    // Ensure EmailAccount record exists in DB
    let account = await prisma.emailAccount.findFirst({
      where: { isActive: true },
    });

    if (!account) {
      const userInfo = await getGoogleUserInfo(accessToken);
      account = await prisma.emailAccount.upsert({
        where: { email: userInfo.email },
        update: { isActive: true },
        create: {
          email: userInfo.email,
          provider: "GMAIL",
          isActive: true,
        },
      });
    }

    // Determine cutoff timestamp (lookback to lastSyncedAt or 30 days ago)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const afterTimestamp = account.lastSyncedAt
      ? new Date(account.lastSyncedAt.getTime() - 5 * 60 * 1000) // 5 min overlap safety
      : thirtyDaysAgo;

    logger.info("Fetching recruiting emails from Gmail", {
      after: afterTimestamp.toISOString(),
    });

    const messages = await fetchRecruitingEmails(accessToken, {
      afterTimestamp,
      maxResults: 30,
    });

    let newEmailsCount = 0;
    const matchedJobIds = new Set<number>();

    for (const msg of messages) {
      // Check if already stored
      const existing = await prisma.jobEmail.findUnique({
        where: { messageId: msg.messageId },
      });
      if (existing) continue;

      // Classify the email
      const classification = await classifyEmail({
        sender: msg.sender,
        recipient: msg.recipient,
        subject: msg.subject,
        snippet: msg.snippet,
        bodyText: msg.bodyText,
        date: msg.date,
      });

      // Match to an existing Job application in the database
      const match = await matchEmailToJob(
        {
          sender: msg.sender,
          recipient: msg.recipient,
          subject: msg.subject,
          snippet: msg.snippet,
          bodyText: msg.bodyText,
          date: msg.date,
        },
        classification
      );

      // Create JobEmail record
      await prisma.jobEmail.create({
        data: {
          messageId: msg.messageId,
          threadId: msg.threadId,
          sender: msg.sender,
          recipient: msg.recipient,
          subject: msg.subject,
          snippet: msg.snippet,
          bodyText: msg.bodyText,
          receivedAt: msg.date,
          stage: classification.stage,
          confidence: classification.confidence,
          nextSteps: classification.nextSteps,
          actionRequired: classification.actionRequired,
          jobId: match?.jobId ?? null,
          companyId: match?.companyId ?? null,
        },
      });

      newEmailsCount++;

      // If matched, optionally auto-update job status
      if (match) {
        matchedJobIds.add(match.jobId);

        if (classification.confidence >= 0.7 && classification.stage) {
          const currentJob = await prisma.job.findUnique({
            where: { id: match.jobId },
            select: { status: true },
          });

          if (currentJob) {
            let newStatus: string | null = null;
            if (
              classification.stage === "INTERVIEW" &&
              (currentJob.status === "APPLIED" || currentJob.status === "DRAFT")
            ) {
              newStatus = "INTERVIEW";
            } else if (
              classification.stage === "OFFER" &&
              currentJob.status !== "OFFER"
            ) {
              newStatus = "OFFER";
            } else if (
              classification.stage === "REJECTED" &&
              currentJob.status !== "OFFER"
            ) {
              newStatus = "REJECTED";
            }

            if (newStatus) {
              await prisma.job.update({
                where: { id: match.jobId },
                data: { status: newStatus },
              });
              logger.info(`Auto-updated job #${match.jobId} status to ${newStatus}`);
            }
          }
        }
      }
    }

    const now = new Date();
    await prisma.emailAccount.update({
      where: { id: account.id },
      data: { lastSyncedAt: now },
    });

    logger.info("Email sync complete", {
      newEmailsCount,
      matchedJobsCount: matchedJobIds.size,
    });

    return {
      success: true,
      status: "OK",
      newEmailsCount,
      matchedJobsCount: matchedJobIds.size,
      lastSyncedAt: now,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error("Email sync encountered an error", { error: errorMsg });
    return {
      success: false,
      status: "ERROR",
      newEmailsCount: 0,
      matchedJobsCount: 0,
      lastSyncedAt: null,
      error: errorMsg,
    };
  }
}
