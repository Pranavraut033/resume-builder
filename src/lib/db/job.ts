import {
  Company,
  Contact,
  CoverLetter,
  Customization,
  Job,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_CUSTOMIZATION,
  SanitizedCustomization,
  validateCustomization,
} from "@/types/customization";
import { JobStatus } from "@/types/job";
import {
  ResumeJSON,
  JobDetailsJSON,
  ATSAnalysisJSON,
  ATSAnalysisSchema,
  normalizeSkills,
} from "@/types/resume";

// Read functions used directly by the MCP server (src/mcp/server.ts), which
// must never import anything that transitively pulls in next/cache — that's
// the whole reason this file (rather than src/actions/job.ts, "use server"
// + a top-level `import { revalidatePath } from "next/cache"`) exists. These
// four have no revalidatePath call and never did; they're here so the MCP
// bundle doesn't need `next` itself resolvable at runtime just to read a job.

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
      baseProfileAnalysis = ATSAnalysisSchema.parse(
        JSON.parse(job.baseProfileAnalysis.contentJson)
      );
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
export type ResumeWithDetails = Omit<
  import("@prisma/client").Resume,
  "contentJson"
> & {
  contentJson: ResumeJSON;
  customizations: Customization;
  atsAnalysis: ATSAnalysisJSON | null;
};
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
  return await prisma.job
    .findFirstOrThrow({
      where: { id: jobId },
      select: {
        resume: { include: { customizations: true, atsAnalysis: true } },
      },
    })
    .then((job) => {
      if (!job.resume) {
        if (allowNull) {
          return null;
        }
        throw new Error(`Resume not found for job ${jobId}`);
      }

      const contentJson = JSON.parse(job.resume.contentJson) as ResumeJSON;
      return {
        ...job.resume,
        contentJson: {
          ...contentJson,
          skills: normalizeSkills(contentJson.skills),
        },
        atsAnalysis: job.resume.atsAnalysis?.contentJson
          ? ATSAnalysisSchema.parse(
              JSON.parse(job.resume.atsAnalysis.contentJson)
            )
          : null,
      };
    });
}

/**
 * Check if a cover letter exists for a job, and create one if it doesn't. Returns the cover letter with its customization.
 * @param jobId The ID of the job to get or create a cover letter for.
 * @returns The cover letter with its customization.
 */
export async function getCoverLetterByJobId(
  jobId: number
): Promise<CoverLetter & { customizations: Customization }> {
  return await prisma.job
    .findFirstOrThrow({
      where: { id: jobId },
      select: { coverLetter: { include: { customizations: true } } },
    })
    .then(async (job) => {
      if (!job.coverLetter) {
        const coverLetter = await prisma.coverLetter.create({
          data: {
            contentText: "",
            customizations: { create: { ...DEFAULT_CUSTOMIZATION } },
          },
          include: { customizations: true },
        });
        prisma.job.update({
          where: { id: jobId },
          data: { coverLetterId: coverLetter.id },
        });
        return coverLetter;
        // throw new Error(`Cover letter not found for job ${jobId}`);
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

/**
 * Look up an existing job by its posting URL — used to dedupe bookmarks
 * (both the in-app queue and the MCP bookmark flow) so pasting/submitting
 * the same URL twice doesn't create a second row.
 */
export async function findJobByUrl(
  url: string
): Promise<{ id: number } | null> {
  return prisma.job.findFirst({ where: { url }, select: { id: true } });
}

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
  status?: JobStatus;
}): Promise<{ jobId: number }> {
  const {
    jobDetails,
    tailoredResume,
    coverLetterText,
    atsAnalysis,
    url,
    profileId,
    status,
  } = input;

  const data: Parameters<typeof prisma.job.create>[0]["data"] = {
    role: jobDetails.job.job_title,
    description: jobDetails.raw_description,
    // Use human-friendly Title Case default status expected by tests
    status: status ?? "Draft",
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

  return { jobId: job.id };
}

/**
 * Attach generated materials (resume, cover letter, ATS analysis) to a job
 * that doesn't have any yet — e.g. flipping a bookmark (status
 * "BOOKMARKED", no resume/coverLetter/baseProfileAnalysis rows) into a
 * fully tracked job. Uses nested `create`, mirroring createJob above, since
 * the child rows don't exist yet; updateResume/updateCoverLetter/
 * saveAtsAnalysis all assume they already do and would throw.
 */
export async function attachGeneratedMaterials(
  jobId: number,
  input: {
    tailoredResume?: ResumeJSON;
    coverLetterText?: string;
    atsAnalysis?: ATSAnalysisJSON | null;
    status?: JobStatus;
  }
): Promise<{ success: true }> {
  const { tailoredResume, coverLetterText, atsAnalysis, status } = input;

  const data: Parameters<typeof prisma.job.update>[0]["data"] = {};

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

  if (atsAnalysis) {
    data.baseProfileAnalysis = {
      create: { contentJson: JSON.stringify(atsAnalysis) },
    };
  }

  if (status) {
    data.status = status;
  }

  await prisma.job.update({ where: { id: jobId }, data });

  return { success: true };
}

// Duplicated from src/actions/job.ts's updateOrCreateCustomization (kept in
// sync manually): that function stays untouched there since it has its own
// public contract, but importing it here would pull in the Next cache
// module via that "use server" file's top-level import.
async function updateOrCreateCustomization({
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

export async function saveAtsAnalysis(
  jobId: number,
  atsAnalysis: ATSAnalysisJSON
) {
  const resume = await prisma.job
    .findFirstOrThrow({
      where: { id: jobId },
      select: { resume: { select: { id: true, aTSAnalysisId: true } } },
    })
    .then((job) => job.resume);

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

  return { success: true };
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

  return { success: true };
}

export async function createResume(
  resume: ResumeJSON,
  jobId: number
): Promise<ResumeWithDetails> {
  return await prisma.resume
    .create({
      data: {
        contentJson: JSON.stringify(resume),
        customizations: { create: { ...DEFAULT_CUSTOMIZATION } },
        jobs: { connect: { id: jobId } },
      },
      include: { customizations: true, atsAnalysis: true },
    })
    .then((resume) => ({
      ...resume,
      contentJson: JSON.parse(resume.contentJson),
      atsAnalysis: resume.atsAnalysis?.contentJson
        ? ATSAnalysisSchema.parse(JSON.parse(resume.atsAnalysis.contentJson))
        : null,
    }));
}
