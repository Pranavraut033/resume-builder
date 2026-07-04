"use server";

import {
  Company,
  Contact,
  CoverLetter,
  Customization,
  Job,
  Resume,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_CUSTOMIZATION,
  SanitizedCustomization,
  validateCustomization,
} from "@/types/customization";
import { JobStatus, JOB_STATUSES } from "@/types/job";
import { ResumeJSON, JobDetailsJSON, ATSAnalysisJSON } from "@/types/resume";

/**
 * Create a new job with parsed details, resume, and cover letter
 * Note: Job parsing, resume generation, and cover letter generation happen on client side
 */
export async function createJob(input: {
  jobDetails: JobDetailsJSON;
  tailoredResume?: ResumeJSON;
  coverLetterText?: string;
  atsAnalysis?: ATSAnalysisJSON | null;
  url?: string;
  profileId?: number;
}): Promise<{ jobId: number }> {
  const {
    jobDetails,
    tailoredResume,
    coverLetterText,
    atsAnalysis,
    url,
    profileId,
  } = input;

  const data: Parameters<typeof prisma.job.create>[0]["data"] = {
    role: jobDetails.job.job_title,
    description: jobDetails.raw_description,
    // Use human-friendly Title Case default status expected by tests
    status: "Draft",
    jobDetailsJson: JSON.stringify(jobDetails),
    url: url || null,
    ...(profileId ? { profile: { connect: { id: profileId } } } : {}),
    company: {
      create: {
        name: jobDetails.company.company_name,
        industry: jobDetails.company.company_industry,
        description: jobDetails.company.company_description,
        marketPosition: jobDetails.company.company_market_position,
        locationCity: jobDetails.company.company_location_city,
        locationCountry: jobDetails.company.company_location_country,
        officeLocationDetails: jobDetails.company.office_location_details,
      },
    },
  };

  const hasContact =
    (!!jobDetails.contact &&
      (!!jobDetails.contact.contact_email ||
        !!jobDetails.contact.contact_phone ||
        !!jobDetails.contact.recruiter_name ||
        !!jobDetails.contact.recruiter_role)) ??
    false;

  if (hasContact) {
    data.contact = {
      create: {
        recruiterName: jobDetails.contact.recruiter_name,
        recruiterRole: jobDetails.contact.recruiter_role,
        contactEmail: jobDetails.contact.contact_email,
        contactPhone: jobDetails.contact.contact_phone,
        contactWhatsappAvailable: jobDetails.contact.contact_whatsapp_available,
      },
    };
  }

  if (atsAnalysis) {
    data.baseProfileAnalysis = {
      create: { contentJson: JSON.stringify(atsAnalysis) },
    };
  }

  if (tailoredResume) {
    data.resume = {
      create: {
        contentJson: JSON.stringify(tailoredResume),
        customizations: { create: { ...DEFAULT_CUSTOMIZATION } },
      },
    };
  }

  if (coverLetterText) {
    data.coverLetter = {
      create: {
        contentText: coverLetterText,
        customizations: { create: { ...DEFAULT_CUSTOMIZATION } },
      },
    };
  }
  const job = await prisma.job.create({ data });

  revalidatePath("/");

  return { jobId: job.id };
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

export type JobData = Omit<Job, "baseProfileAnalysis"> & {
  details: JobDetailsJSON;
  baseProfileAnalysis: ATSAnalysisJSON | null;
  contact: Contact | null;
  company: Company;
};

/**
 * Get full job context with all details for resume editing
 * Includes parsed job details for LLM-assisted generation
 */
export async function getJob(jobId: number) {
  const job = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
    include: {
      company: true,
      contact: true,
      baseProfileAnalysis: true,
    },
  });

  let jobDetails: JobDetailsJSON;
  try {
    jobDetails = JSON.parse(job.jobDetailsJson) as JobDetailsJSON;
  } catch {
    throw new Error(`Failed to parse jobDetailsJson for job ${jobId}`);
  }

  let baseProfileAnalysis: ATSAnalysisJSON | null = null;
  if (job.baseProfileAnalysis?.contentJson) {
    try {
      baseProfileAnalysis = JSON.parse(
        job.baseProfileAnalysis.contentJson
      ) as ATSAnalysisJSON;
    } catch {
      console.error(
        "Failed to parse baseProfileAnalysis contentJson for job",
        jobId
      );
    }
  }

  return {
    ...job,
    details: jobDetails,
    baseProfileAnalysis: baseProfileAnalysis,
  };
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

/**
 * Get resume for a job
 */
export async function getResumeByJobId(jobId: number): Promise<
  Omit<Resume, "contentJson"> & {
    contentJson: ResumeJSON;
    customizations: Customization;
    atsAnalysis: ATSAnalysisJSON | null;
  }
> {
  return await prisma.job
    .findFirstOrThrow({
      where: { id: jobId },
      select: {
        resume: { include: { customizations: true, atsAnalysis: true } },
      },
    })
    .then((job) => {
      if (!job.resume) {
        throw new Error(`Resume not found for job ${jobId}`);
      }

      return {
        ...job.resume,
        contentJson: JSON.parse(job.resume.contentJson) as ResumeJSON,
        atsAnalysis: job.resume.atsAnalysis?.contentJson
          ? (JSON.parse(job.resume.atsAnalysis.contentJson) as ATSAnalysisJSON)
          : null,
      };
    });
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
  const job = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
    select: { resume: { select: { id: true, contentJson: true } } },
  });

  const nextContentJson = JSON.stringify(contentJson);

  await Promise.all([
    prisma.job.update({
      where: { id: jobId },
      data: {
        resume: {
          update: {
            contentJson: nextContentJson,
            updatedAt: new Date(),
          },
        },
      },
    }),
    updateOrCreateCustomization(customization),
    job.resume && job.resume.contentJson !== nextContentJson
      ? snapshotResume(job.resume.id, job.resume.contentJson, label)
      : Promise.resolve(),
  ]);

  revalidatePath(`/job/${jobId}/resume`);
  return { success: true };
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
  return JSON.parse(snapshot.contentJson) as ResumeJSON;
}

export async function saveAtsAnalysis(
  jobId: number,
  atsAnalysis: ATSAnalysisJSON
) {
  const resume = await getResumeByJobId(jobId);

  if (!resume)
    throw new Error(
      `Cannot save ATS analysis: Resume not found for job ${jobId}`
    );

  const now = new Date();
  await prisma.resume.update({
    where: { id: resume.id },
    data: {
      updatedAt: now,
      atsAnalysis: {
        ...(resume.aTSAnalysisId
          ? { update: { contentJson: JSON.stringify(atsAnalysis) } }
          : { create: { contentJson: JSON.stringify(atsAnalysis) } }),
      },
    },
  });

  revalidatePath(`/job/${jobId}/resume`);
  return { success: true };
}

export async function deleteJobById(id: number) {
  await prisma.job.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath(`/job/${id}`, "layout");
  return { success: true };
}

/**
 * Get cover letter for a job
 */
export async function getCoverLetterByJobId(
  jobId: number
): Promise<CoverLetter & { customizations: Customization }> {
  return await prisma.job
    .findFirstOrThrow({
      where: { id: jobId },
      select: { coverLetter: { include: { customizations: true } } },
    })
    .then((job) => {
      if (!job.coverLetter) {
        throw new Error(`Cover letter not found for job ${jobId}`);
      }

      return job.coverLetter;
    });
}

export type JobRecord = Job & {
  company: Company;
  contact: Contact | null;
  status: JobStatus;
};

export async function getAllJob(
  profileId?: number | null
): Promise<JobRecord[]> {
  const jobList = await prisma.job.findMany({
    where: profileId ? { profileId } : undefined,
    orderBy: { createdAt: "desc" },
    include: { company: true, contact: true },
  });

  return jobList as JobRecord[];
}

export type DocumentRecord = {
  jobId: number;
  docType: "resume" | "coverLetter";
  role: string;
  companyName: string;
  status: JobStatus;
  atsScore: number | null;
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
      resume: { include: { atsAnalysis: true } },
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
      let atsScore: number | null = null;
      if (job.resume.atsAnalysis?.contentJson) {
        try {
          const parsed = JSON.parse(
            job.resume.atsAnalysis.contentJson
          ) as ATSAnalysisJSON;
          atsScore = parsed.scores.composite_score;
        } catch {
          atsScore = null;
        }
      }

      documents.push({
        ...base,
        docType: "resume",
        atsScore,
        createdAt: job.resume.createdAt,
        updatedAt: job.resume.updatedAt,
      });
    }

    if (job.coverLetter) {
      documents.push({
        ...base,
        docType: "coverLetter",
        atsScore: null,
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
  await Promise.all([
    prisma.job.update({
      where: { id: jobId },
      data: { coverLetter: { update: { contentText, updatedAt: new Date() } } },
    }),
    updateOrCreateCustomization(customization),
  ]);

  revalidatePath(`/job/${jobId}/cover-letter`);
  return { success: true };
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
