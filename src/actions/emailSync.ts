"use server";

import { syncEmails, SyncResult } from "@/lib/email/emailSyncService";
import {
  clearGoogleAuthTokens,
  generateAuthUrl,
  getValidAccessToken,
  setCustomGoogleCredentials,
  getActiveClientId,
  DEFAULT_GOOGLE_CLIENT_ID,
} from "@/lib/email/gmailClient";
import { createLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const logger = createLogger("EmailSyncActions");

export interface EmailStatusDTO {
  isConnected: boolean;
  email: string | null;
  lastSyncedAt: string | null;
  totalEmails: number;
  matchedEmails: number;
  customClientId: string | null;
}

export async function getEmailSyncStatus(): Promise<EmailStatusDTO> {
  try {
    const accessToken = await getValidAccessToken();
    const account = await prisma.emailAccount.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    });

    const totalEmails = await prisma.jobEmail.count();
    const matchedEmails = await prisma.jobEmail.count({
      where: { jobId: { not: null } },
    });

    const activeId = await getActiveClientId();
    const customClientId = activeId !== DEFAULT_GOOGLE_CLIENT_ID ? activeId : null;

    return {
      isConnected: Boolean(accessToken && account),
      email: account?.email ?? null,
      lastSyncedAt: account?.lastSyncedAt?.toISOString() ?? null,
      totalEmails,
      matchedEmails,
      customClientId,
    };
  } catch (err) {
    logger.error("Failed to get email sync status", { err });
    return {
      isConnected: false,
      email: null,
      lastSyncedAt: null,
      totalEmails: 0,
      matchedEmails: 0,
      customClientId: null,
    };
  }
}

export async function getGoogleAuthUrl(origin: string): Promise<string> {
  const redirectUri = `${origin}/api/auth/callback/google`;
  return generateAuthUrl(redirectUri);
}

export async function triggerEmailSync(): Promise<SyncResult> {
  return syncEmails();
}

export async function disconnectGoogleAccount(): Promise<{ success: boolean }> {
  try {
    await clearGoogleAuthTokens();
    await prisma.emailAccount.updateMany({
      data: { isActive: false },
    });
    return { success: true };
  } catch (err) {
    logger.error("Failed to disconnect Google account", { err });
    return { success: false };
  }
}

export async function saveGoogleCredentials(
  clientId: string | null,
  clientSecret: string | null
): Promise<{ success: boolean }> {
  try {
    await setCustomGoogleCredentials(clientId, clientSecret);
    return { success: true };
  } catch (err) {
    logger.error("Failed to save custom credentials", { err });
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
