"use server";

import {
  ATSAnalysis,
  Company,
  Contact,
  CoverLetter,
  Customization,
  Job,
  Profile,
  Resume,
  ResumeSnapshot,
  TokenUsage,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type AppDataBackup = {
  version: 1;
  exportedAt: string;
  data: {
    profiles: Profile[];
    companies: Company[];
    contacts: Contact[];
    customizations: Customization[];
    atsAnalyses: ATSAnalysis[];
    resumes: Resume[];
    coverLetters: CoverLetter[];
    jobs: Job[];
    resumeSnapshots: ResumeSnapshot[];
    tokenUsage: TokenUsage[];
  };
};

/**
 * Export every row from every table in the database as a single JSON-serializable
 * backup object. Excludes API keys (those live in OS keychain / keyStorage.ts,
 * not the database).
 */
export async function exportAppData(): Promise<AppDataBackup> {
  const [
    profiles,
    companies,
    contacts,
    customizations,
    atsAnalyses,
    resumes,
    coverLetters,
    jobs,
    resumeSnapshots,
    tokenUsage,
  ] = await Promise.all([
    prisma.profile.findMany(),
    prisma.company.findMany(),
    prisma.contact.findMany(),
    prisma.customization.findMany(),
    prisma.aTSAnalysis.findMany(),
    prisma.resume.findMany(),
    prisma.coverLetter.findMany(),
    prisma.job.findMany(),
    prisma.resumeSnapshot.findMany(),
    prisma.tokenUsage.findMany(),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      profiles,
      companies,
      contacts,
      customizations,
      atsAnalyses,
      resumes,
      coverLetters,
      jobs,
      resumeSnapshots,
      tokenUsage,
    },
  };
}

const EXPECTED_DATA_KEYS = [
  "profiles",
  "companies",
  "contacts",
  "customizations",
  "atsAnalyses",
  "resumes",
  "coverLetters",
  "jobs",
  "resumeSnapshots",
  "tokenUsage",
] as const;

/**
 * Validate the shape of a backup payload before any destructive DB operation
 * is attempted. Returns an error message if invalid, or null if valid.
 */
function validateBackupShape(backup: unknown): string | null {
  if (typeof backup !== "object" || backup === null) {
    return "Backup file is not a valid object.";
  }

  const candidate = backup as Record<string, unknown>;
  if (candidate.version !== 1) {
    return "Unsupported backup version. Only version 1 backups are supported.";
  }

  const data = candidate.data;
  if (typeof data !== "object" || data === null) {
    return "Backup file is missing its data payload.";
  }

  const dataRecord = data as Record<string, unknown>;
  for (const key of EXPECTED_DATA_KEYS) {
    if (!Array.isArray(dataRecord[key])) {
      return `Backup file is missing or has an invalid "${key}" table.`;
    }
  }

  return null;
}

/**
 * Replace ALL data in the database with the contents of the given backup.
 * Wipes every table and re-inserts the backup's rows (preserving ids so
 * foreign keys still resolve), inside a single transaction. Validates the
 * payload shape before touching the database — an invalid payload never
 * deletes anything.
 */
export async function importAppData(
  backup: unknown
): Promise<{ success: boolean; error?: string }> {
  const validationError = validateBackupShape(backup);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const { data } = backup as AppDataBackup;

  try {
    await prisma.$transaction(async (tx) => {
      // Delete in reverse FK order (children first)
      await tx.tokenUsage.deleteMany();
      await tx.resumeSnapshot.deleteMany();
      await tx.job.deleteMany();
      await tx.coverLetter.deleteMany();
      await tx.resume.deleteMany();
      await tx.aTSAnalysis.deleteMany();
      await tx.customization.deleteMany();
      await tx.contact.deleteMany();
      await tx.company.deleteMany();
      await tx.profile.deleteMany();

      // Re-insert in forward FK order (parents first)
      if (data.profiles.length) {
        await tx.profile.createMany({ data: data.profiles });
      }
      if (data.companies.length) {
        await tx.company.createMany({ data: data.companies });
      }
      if (data.contacts.length) {
        await tx.contact.createMany({ data: data.contacts });
      }
      if (data.customizations.length) {
        await tx.customization.createMany({ data: data.customizations });
      }
      if (data.atsAnalyses.length) {
        await tx.aTSAnalysis.createMany({ data: data.atsAnalyses });
      }
      if (data.resumes.length) {
        await tx.resume.createMany({ data: data.resumes });
      }
      if (data.coverLetters.length) {
        await tx.coverLetter.createMany({ data: data.coverLetters });
      }
      if (data.jobs.length) {
        await tx.job.createMany({ data: data.jobs });
      }
      if (data.resumeSnapshots.length) {
        await tx.resumeSnapshot.createMany({ data: data.resumeSnapshots });
      }
      if (data.tokenUsage.length) {
        await tx.tokenUsage.createMany({ data: data.tokenUsage });
      }
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to import backup.",
    };
  }
}
