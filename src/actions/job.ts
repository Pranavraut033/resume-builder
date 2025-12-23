"use server";

import { prisma } from "@/lib/prisma";
import {
  ResumeJSON,
  JobDetails,
  ResumeCustomization,
  DEFAULT_CUSTOMIZATION,
} from "@/types/resume";
import { JobStatus, JOB_STATUSES } from "@/types/job";
import { revalidatePath } from "next/cache";

/**
 * Create a new job with parsed details, resume, and cover letter
 * Note: Job parsing, resume generation, and cover letter generation happen on client side
 */
export async function createJob(input: {
  jobDetails: JobDetails;
  tailoredResume?: ResumeJSON;
  coverLetterText?: string;
}): Promise<{ jobId: number }> {
  const { jobDetails, tailoredResume, coverLetterText } = input;

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

  // Create contact if available
  let contactId: number | undefined;
  if (jobDetails.contact) {
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
      companyId: company.id,
      contactId,
      role: jobDetails.job.job_title,
      description: jobDetails.raw_description,
      status: "DRAFT",
      jobDetailsJson: JSON.stringify(jobDetails),
      createdAt: new Date().toISOString(),
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
    include: {
      company: true,
    },
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
  jobId: number,
): Promise<ResumeJSON | null> {
  const resume = await prisma.resume.findFirst({
    where: { jobId },
  });

  if (!resume) return null;
  return JSON.parse(resume.contentJson) as ResumeJSON;
}

/**
 * Update resume for a job
 */
export async function updateResume(jobId: number, contentJson: ResumeJSON) {
  await prisma.resume.updateMany({
    where: { jobId },
    data: {
      contentJson: JSON.stringify(contentJson),
      lastEdited: new Date().toISOString(),
    },
  });
  revalidatePath(`/resume/${jobId}`);
  return { success: true };
}

/**
 * Get cover letter for a job
 */
export async function getCoverLetterByJobId(
  jobId: number,
): Promise<string | null> {
  const coverLetter = await prisma.coverLetter.findFirst({
    where: { jobId },
  });
  return coverLetter?.contentText || null;
}

/**
 * Update cover letter for a job
 */
export async function updateCoverLetter(jobId: number, contentText: string) {
  await prisma.coverLetter.updateMany({
    where: { jobId },
    data: { contentText },
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
  customization: Partial<ResumeCustomization>,
) {
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
    data.colorsJson = JSON.stringify(customization.colors);
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
  jobId: number,
): Promise<ResumeCustomization> {
  const resume = await prisma.resume.findFirst({
    where: { jobId },
    select: {
      template: true,
      pageFormat: true,
      fontSize: true,
      fontFamily: true,
      colorsJson: true,
    },
  });

  if (!resume) {
    return DEFAULT_CUSTOMIZATION;
  }

  return {
    template: resume.template as ResumeCustomization["template"],
    pageFormat: resume.pageFormat as ResumeCustomization["pageFormat"],
    fontSize: resume.fontSize as ResumeCustomization["fontSize"],
    fontFamily: resume.fontFamily,
    colors: resume.colorsJson
      ? JSON.parse(resume.colorsJson)
      : DEFAULT_CUSTOMIZATION.colors,
  };
}
