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
}): Promise<{ jobId: number }> {
  const { jobDetails, tailoredResume, coverLetterText, atsAnalysis, url } =
    input;

  const data: Parameters<typeof prisma.job.create>[0]["data"] = {
    role: jobDetails.job.job_title,
    description: jobDetails.raw_description,
    // Use human-friendly Title Case default status expected by tests
    status: "Draft",
    jobDetailsJson: JSON.stringify(jobDetails),
    url: url || null,
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
export async function getAllJobs() {
  const jobs = await prisma.job.findMany({
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

/**
 * Update resume for a job
 */
export async function updateResume(
  jobId: number,
  contentJson: ResumeJSON,
  customization: SanitizedCustomization
) {
  await Promise.all([
    prisma.job.update({
      where: { id: jobId },
      data: {
        resume: {
          update: {
            contentJson: JSON.stringify(contentJson),
            updatedAt: new Date(),
          },
        },
      },
    }),
    updateOrCreateCustomization(customization),
  ]);

  revalidatePath(`/job/${jobId}/resume`);
  return { success: true };
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
  const result = await prisma.resume.update({
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

  console.log({ result, updated: now === result.updatedAt });

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
