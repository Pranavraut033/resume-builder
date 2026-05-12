"use server";

import { CoverLetter, Resume } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { colorsToCSV, colorsFromCSV } from "@/lib/colorUtils";
import { prisma } from "@/lib/prisma";
import { JobStatus, JOB_STATUSES } from "@/types/job";
import {
  ResumeJSON,
  JobDetailsJSON,
  ThemeCustomization,
  DEFAULT_CUSTOMIZATION,
  applyCustomization,
  validateCustomization,
} from "@/types/resume";

/**
 * Create a new job with parsed details, resume, and cover letter
 * Note: Job parsing, resume generation, and cover letter generation happen on client side
 */
export async function createJob(input: {
  jobDetails: JobDetailsJSON;
  tailoredResume?: ResumeJSON;
  coverLetterText?: string;
  url?: string;
}): Promise<{ jobId: number }> {
  const { jobDetails, tailoredResume, coverLetterText, url } = input;

  // Create or get company
  const company = await prisma.company.create({
    data: {
      name: jobDetails.company.company_name,
      industry: jobDetails.company.company_industry,
      description: jobDetails.company.company_description,
      marketPosition: jobDetails.company.company_market_position,
      locationCity: jobDetails.company.company_location_city,
      locationCountry: jobDetails.company.company_location_country,
      officeLocationDetails: jobDetails.company.office_location_details,
    },
  });

  // Create contact if any contact fields are provided
  let contactId: number | undefined;
  const hasContact =
    jobDetails.contact &&
    (jobDetails.contact.recruiter_name != null ||
      jobDetails.contact.recruiter_role != null ||
      jobDetails.contact.contact_email != null ||
      jobDetails.contact.contact_phone != null ||
      jobDetails.contact.contact_whatsapp_available != null);
  if (hasContact) {
    const contact = await prisma.contact.create({
      data: {
        recruiterName: jobDetails.contact.recruiter_name,
        recruiterRole: jobDetails.contact.recruiter_role,
        contactEmail: jobDetails.contact.contact_email,
        contactPhone: jobDetails.contact.contact_phone,
        contactWhatsappAvailable: jobDetails.contact.contact_whatsapp_available,
      },
    });
    contactId = contact.id;
  }

  // Create job
  const job = await prisma.job.create({
    data: {
      createdAt: new Date().toISOString(),
      companyId: company.id,
      contactId,
      role: jobDetails.job.job_title,
      description: jobDetails.raw_description,
      // Use human-friendly Title Case default status expected by tests
      status: "Draft",
      jobDetailsJson: JSON.stringify(jobDetails),
      url: url || null,
    },
  });

  if (tailoredResume) {
    // Save tailored resume
    await prisma.resume.create({
      data: {
        jobId: job.id,
        contentJson: JSON.stringify(tailoredResume),
        lastEdited: new Date().toISOString(),
      },
    });
  }

  if (coverLetterText) {
    // Save cover letter
    await prisma.coverLetter.create({
      data: {
        jobId: job.id,
        contentText: coverLetterText,
      },
    });
  }

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

/**
 * Get full job context with all details for resume editing
 * Includes parsed job details for LLM-assisted generation
 */
export async function getJobContext(jobId: number) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      company: true,
      contact: true,
    },
  });

  if (!job) {
    return null;
  }

  let jobDetails: JobDetailsJSON | null = null;
  if (job.jobDetailsJson) {
    try {
      jobDetails = JSON.parse(job.jobDetailsJson) as JobDetailsJSON;
    } catch {
      console.error("Failed to parse jobDetailsJson for job", jobId);
    }
  }

  return {
    ...job,
    details: jobDetails,
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
export async function getResumeByJobId(
  jobId: number
): Promise<(Omit<Resume, "contentJson"> & { contentJson: ResumeJSON }) | null> {
  if (typeof jobId !== "number" || isNaN(jobId)) {
    throw new Error("Invalid or missing jobId argument");
  }

  const resume = await prisma.resume.findFirst({
    where: { jobId },
  });

  if (!resume) return null;

  return {
    ...resume,
    contentJson: JSON.parse(resume.contentJson) as ResumeJSON,
  };
}

/**
 * Update resume for a job
 */
export async function updateResume(
  jobId: number,
  contentJson: ResumeJSON,
  customization?: ThemeCustomization
) {
  const data: Partial<Resume> = {
    contentJson: JSON.stringify(contentJson),
    lastEdited: new Date().toISOString(),
  };

  applyCustomization(customization, data);

  await prisma.resume.updateMany({
    where: { jobId },
    data,
  });
  revalidatePath(`/resume/${jobId}`);
  return { success: true };
}

/**
 * Get cover letter for a job
 */
export async function getCoverLetterByJobId(
  jobId: number
): Promise<CoverLetter | null> {
  const coverLetter = await prisma.coverLetter.findFirst({
    where: { jobId },
  });

  return coverLetter;
}

/**
 * Update cover letter for a job
 */
export async function updateCoverLetter(
  jobId: number,
  contentText: string,
  customization?: ThemeCustomization,
  metadata?: {
    provider?: string;
    model?: string;
    customPrompt?: string;
  }
) {
  const data: Partial<CoverLetter> = {
    contentText,
    lastEdited: new Date().toISOString(),
  };

  if (metadata) {
    if (metadata.provider) data.provider = metadata.provider;
    if (metadata.model) data.model = metadata.model;
    if (metadata.customPrompt) data.customPrompt = metadata.customPrompt;
    data.generatedAt = new Date().toISOString();
  }

  applyCustomization(customization, data);

  await prisma.coverLetter.updateMany({
    where: { jobId },
    data,
  });
  revalidatePath(`/cover-letter/${jobId}`);
  return { success: true };
}

/**
 * Update cover letter customization (template, colors, fonts, etc.)
 */
export async function updateCoverLetterCustomization(
  jobId: number,
  customization: Partial<ThemeCustomization>
) {
  const data: Partial<CoverLetter> = {};

  applyCustomization(customization, data);

  data.lastEdited = new Date().toISOString();

  await prisma.coverLetter.updateMany({
    where: { jobId },
    data,
  });

  revalidatePath(`/cover-letter/${jobId}`);
  return { success: true };
}

/**
 * Update resume customization (template, colors, fonts, etc.)
 * Adapted from Resumify (https://github.com/Afif718/Resumify)
 */
export async function updateResumeCustomization(
  jobId: number,
  customization: Partial<ThemeCustomization>
) {
  validateCustomization(customization);

  const data: Record<string, unknown> = {};

  if (customization.template) {
    data.template = customization.template;
  }
  if (customization.pageFormat) {
    data.pageFormat = customization.pageFormat;
  }
  if (customization.fontSize) {
    data.fontSize = customization.fontSize;
  }
  if (customization.fontFamily) {
    data.fontFamily = customization.fontFamily;
  }
  if (customization.colors) {
    data.colors = colorsToCSV(customization.colors);
  }

  await prisma.resume.updateMany({
    where: { jobId },
    data,
  });

  revalidatePath(`/resume/${jobId}`);
  return { success: true };
}

/**
 * Get resume customization for a job
 */
export async function getResumeCustomization(
  jobId: number
): Promise<ThemeCustomization> {
  if (typeof jobId !== "number" || isNaN(jobId)) {
    throw new Error("Invalid or missing jobId argument");
  }
  const resume = await prisma.resume.findFirst({
    where: { jobId },
    select: {
      template: true,
      pageFormat: true,
      fontSize: true,
      fontFamily: true,
      colors: true,
    },
  });

  if (!resume) {
    return DEFAULT_CUSTOMIZATION;
  }

  return {
    template: resume.template as ThemeCustomization["template"],
    pageFormat: resume.pageFormat as ThemeCustomization["pageFormat"],
    fontSize: resume.fontSize as ThemeCustomization["fontSize"],
    fontFamily: resume.fontFamily,
    colors: colorsFromCSV(resume.colors),
  };
}

// types
export type JobContext = Awaited<ReturnType<typeof getJobContext>>;
