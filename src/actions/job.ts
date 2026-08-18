"use server";

import { Customization } from "@prisma/client";
import { revalidatePath } from "next/cache";

import * as dbJob from "@/lib/db/job";
import { ResumeWithDetails } from "@/lib/db/job";
import { prisma } from "@/lib/prisma";
import {
  SanitizedCustomization,
  validateCustomization,
} from "@/types/customization";
import { DocumentAnalysisJSON } from "@/types/documentAnalysis";
import { FitCheckJSON, FitCheckSchema, FitLevel } from "@/types/fitCheck";
import { JobStatus, JOB_STATUSES } from "@/types/job";
import { ResumeJSON, normalizeSkills } from "@/types/resume";

/**
 * Create a new job with parsed details, resume, and cover letter
 * Note: Job parsing, resume generation, and cover letter generation happen on client side
 */
export async function createJob(
  input: Parameters<typeof dbJob.createJob>[0]
): Promise<{ jobId: number }> {
  const result = await dbJob.createJob(input);

  revalidatePath("/");

  return result;
}

export async function attachGeneratedMaterials(
  jobId: number,
  input: Parameters<typeof dbJob.attachGeneratedMaterials>[1]
): Promise<{ success: true }> {
  const result = await dbJob.attachGeneratedMaterials(jobId, input);

  revalidatePath("/");
  revalidatePath("/bookmarks");

  return result;
}

export async function createResume(
  resume: ResumeJSON,
  jobId: number
): Promise<ResumeWithDetails> {
  return dbJob.createResume(resume, jobId);
}
/**
 * Get all jobs
 */
export async function getAllJobs(profileId?: number | null) {
  const jobs = await prisma.job.findMany({
    where: profileId ? { profileId } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return jobs;
}

/**
 * Get a single job by ID
 */
export async function getJobById(id: number) {
  const job = await prisma.job.findUnique({
    where: { id },
  });
  return job;
}

// Next-free (no revalidatePath) — see src/lib/db/job.ts for why this and
// the other three thin wrappers below delegate there instead of holding
// their own Prisma logic: the MCP server imports the same implementations
// directly and must never pull in next/cache transitively. A bare
// `export { getJob } from "@/lib/db/job"` re-export would be simpler, but
// Next's "use server" compiler rejects any export in this file that isn't a
// locally-declared async function — hence the wrapper.
export type { JobData } from "@/lib/db/job";
export async function getJob(jobId: number) {
  return dbJob.getJob(jobId);
}

/**
 * Update job status
 */
export async function updateJobStatus(id: number, status: JobStatus) {
  if (!JOB_STATUSES.includes(status)) {
    throw new Error(`Invalid job status: ${status}`);
  }

  await prisma.job.update({
    where: { id },
    data: { status },
  });
  revalidatePath("/");
  revalidatePath(`/job/${id}`);
  return { success: true };
}

/**
 * Delete a job (cascade deletes resumes and cover letters)
 */
export async function deleteJob(id: number) {
  await prisma.job.delete({
    where: { id },
  });
  revalidatePath("/");
  return { success: true };
}

export async function getResumeByJobId(
  jobId: number,
  allowNull?: false
): Promise<ResumeWithDetails>;

export async function getResumeByJobId(
  jobId: number,
  allowNull?: true
): Promise<null | ResumeWithDetails>;

export async function getResumeByJobId(
  jobId: number,
  allowNull: boolean = false
): Promise<null | ResumeWithDetails> {
  return allowNull
    ? dbJob.getResumeByJobId(jobId, true)
    : dbJob.getResumeByJobId(jobId, false);
}

const MAX_RESUME_SNAPSHOTS = 20;

/**
 * Update resume for a job. Snapshots the prior content first so it can be restored later.
 */
export async function updateResume(
  jobId: number,
  contentJson: ResumeJSON,
  customization: SanitizedCustomization,
  label = "Manual save"
) {
  const result = await dbJob.updateResume(
    jobId,
    contentJson,
    customization,
    label
  );

  revalidatePath(`/job/${jobId}/resume`);
  return result;
}

async function snapshotResume(
  resumeId: number,
  contentJson: string,
  label: string
) {
  await prisma.resumeSnapshot.create({
    data: { resumeId, contentJson, label },
  });

  const stale = await prisma.resumeSnapshot.findMany({
    where: { resumeId },
    orderBy: { createdAt: "desc" },
    skip: MAX_RESUME_SNAPSHOTS,
    select: { id: true },
  });
  if (stale.length > 0) {
    await prisma.resumeSnapshot.deleteMany({
      where: { id: { in: stale.map((s) => s.id) } },
    });
  }
}

/**
 * List saved version snapshots for a job's resume, newest first.
 */
export async function getResumeSnapshots(jobId: number) {
  const job = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
    select: {
      resume: {
        select: {
          snapshots: {
            orderBy: { createdAt: "desc" },
            select: { id: true, label: true, createdAt: true },
          },
        },
      },
    },
  });

  return job.resume?.snapshots ?? [];
}

/**
 * Restore a resume to a prior snapshot, snapshotting the current content first.
 */
export async function restoreResumeSnapshot(
  jobId: number,
  snapshotId: number
): Promise<ResumeJSON> {
  const job = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
    select: { resume: { select: { id: true, contentJson: true } } },
  });

  if (!job.resume) {
    throw new Error(`Resume not found for job ${jobId}`);
  }

  const snapshot = await prisma.resumeSnapshot.findUniqueOrThrow({
    where: { id: snapshotId },
  });

  if (snapshot.resumeId !== job.resume.id) {
    throw new Error(`Snapshot ${snapshotId} does not belong to job ${jobId}`);
  }

  await snapshotResume(job.resume.id, job.resume.contentJson, "Before restore");
  await prisma.resume.update({
    where: { id: job.resume.id },
    data: { contentJson: snapshot.contentJson, updatedAt: new Date() },
  });

  revalidatePath(`/job/${jobId}/resume`);
  const restored = JSON.parse(snapshot.contentJson) as ResumeJSON;
  return { ...restored, skills: normalizeSkills(restored.skills) };
}

export async function saveAtsAnalysis(
  jobId: number,
  atsAnalysis: DocumentAnalysisJSON
) {
  const result = await dbJob.saveAtsAnalysis(jobId, atsAnalysis);

  revalidatePath(`/job/${jobId}/resume`);
  return result;
}

export async function saveFitCheck(jobId: number, fitCheck: FitCheckJSON) {
  const result = await dbJob.saveFitCheck(jobId, fitCheck);

  revalidatePath(`/job/${jobId}/resume`);
  revalidatePath("/documents");
  return result;
}

export async function deleteJobById(id: number) {
  await prisma.job.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath(`/job/${id}`, "layout");
  return { success: true };
}

export async function getCoverLetterByJobId(jobId: number) {
  return dbJob.getCoverLetterByJobId(jobId);
}

export type { JobRecord } from "@/lib/db/job";
export async function getAllJob(profileId?: number | null) {
  return dbJob.getAllJob(profileId);
}

export async function findJobByUrl(url: string) {
  return dbJob.findJobByUrl(url);
}

export type DocumentRecord = {
  jobId: number;
  docType: "resume" | "coverLetter";
  role: string;
  companyName: string;
  status: JobStatus;
  fitLevel: FitLevel | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * List every resume and cover letter across all jobs, for the Documents page.
 */
export async function getAllDocuments(
  profileId?: number | null
): Promise<DocumentRecord[]> {
  const jobs = await prisma.job.findMany({
    where: profileId ? { profileId } : undefined,
    orderBy: { updatedAt: "desc" },
    include: {
      company: true,
      resume: { include: { fitCheck: true } },
      coverLetter: true,
    },
  });

  const documents: DocumentRecord[] = [];

  for (const job of jobs) {
    const base = {
      jobId: job.id,
      role: job.role,
      companyName: job.company.name,
      status: job.status as JobStatus,
    };

    if (job.resume) {
      let fitLevel: FitLevel | null = null;
      if (job.resume.fitCheck?.contentJson) {
        // A blob that predates the `v: 2` shape fails parse on purpose (see
        // the version-check discipline in fitCheck.ts) — treated the same
        // as "never run" rather than crashing the documents list.
        try {
          const result = FitCheckSchema.safeParse(
            JSON.parse(job.resume.fitCheck.contentJson)
          );
          fitLevel = result.success ? result.data.fit_level : null;
        } catch {
          fitLevel = null;
        }
      }

      documents.push({
        ...base,
        docType: "resume",
        fitLevel,
        createdAt: job.resume.createdAt,
        updatedAt: job.resume.updatedAt,
      });
    }

    if (job.coverLetter) {
      documents.push({
        ...base,
        docType: "coverLetter",
        fitLevel: null,
        createdAt: job.coverLetter.createdAt,
        updatedAt: job.coverLetter.updatedAt,
      });
    }
  }

  return documents;
}

/**
 * Update cover letter for a job
 */
export async function updateCoverLetter(
  jobId: number,
  contentText: string,
  customization: SanitizedCustomization
) {
  const result = await dbJob.updateCoverLetter(
    jobId,
    contentText,
    customization
  );

  revalidatePath(`/job/${jobId}/cover-letter`);
  return result;
}

export async function updateOrCreateCustomization({
  id,
  ...rest
}: SanitizedCustomization): Promise<Customization> {
  validateCustomization(rest);
  if (id) {
    return prisma.customization.update({
      where: { id },
      data: { ...rest, updatedAt: new Date() },
    });
  }

  // If no ID, create new customization
  return prisma.customization.create({
    data: {
      ...rest,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
}
