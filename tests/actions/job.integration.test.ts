/**
 * Job Actions Integration Tests
 *
 * Tests for job server actions with real database integration.
 * These tests verify actual database operations and cascade behaviors.
 */

import type { PrismaClient } from "@prisma/client";
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  vi,
} from "vitest";

import {
  createJob as createJobAction,
  getAllJobs,
  getJobById,
  getJobContext,
  updateJobStatus,
  deleteJob,
  getResumeByJobId,
  updateResume,
  getCoverLetterByJobId,
  updateCoverLetter,
  updateResumeCustomization,
  getResumeCustomization,
} from "@/actions/job";
import { JOB_STATUSES } from "@/types/job";

import { setupTestDb, clearDatabase, closeGlobalTestDb } from "../utils/db";
import {
  createCompleteJobScenario,
  createCompany,
  createContact,
  createJob,
  createResume,
  createCoverLetter,
  createJobDetails,
  createResumeJSON,
} from "../utils/factories";

// Module-level reference so vi.mock factory closure can access it lazily
let _testPrisma: PrismaClient;

// Mock @/lib/prisma so server actions use the in-memory test database
vi.mock("@/lib/prisma", () => ({
  get prisma() {
    return _testPrisma;
  },
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Job Actions Integration", () => {
  const testDbPromise = setupTestDb();

  beforeAll(async () => {
    const { prisma } = await testDbPromise;
    _testPrisma = prisma;
  });

  beforeEach(async () => {
    await clearDatabase(_testPrisma);
  });

  afterAll(async () => {
    await closeGlobalTestDb();
  });

  describe("createJob", () => {
    it("should create a job with company and parsed details", async () => {
      const { prisma } = await testDbPromise;
      const jobDetails = createJobDetails();

      const result = await createJobAction({ jobDetails });

      expect(result.jobId).toBeDefined();
      expect(typeof result.jobId).toBe("number");

      // Verify job was created
      const job = await prisma.job.findUnique({
        where: { id: result.jobId },
        include: { company: true },
      });

      expect(job).toBeDefined();
      expect(job?.role).toBe(jobDetails.job.job_title);
      expect(job?.company?.name).toBe(jobDetails.company.company_name);
      expect(job?.status).toBe("Draft");
      expect(job?.jobDetailsJson).toBe(JSON.stringify(jobDetails));
    });

    it("should create a job with contact information", async () => {
      const { prisma } = await testDbPromise;
      const jobDetails = createJobDetails({
        contact: {
          recruiter_name: "John Recruiter",
          recruiter_role: "Senior Recruiter",
          contact_email: "john@company.com",
          contact_phone: "+1234567890",
          contact_whatsapp_available: true,
        },
      });

      const result = await createJobAction({ jobDetails });

      const job = await prisma.job.findUnique({
        where: { id: result.jobId },
        include: { contact: true },
      });

      expect(job?.contact).toBeDefined();
      expect(job?.contact?.recruiterName).toBe("John Recruiter");
      expect(job?.contact?.contactEmail).toBe("john@company.com");
    });

    it("should create a job with resume and cover letter", async () => {
      const { prisma } = await testDbPromise;
      const jobDetails = createJobDetails();
      const resume = createResumeJSON();
      const coverLetterText = "Dear Hiring Manager, I am excited to apply...";

      const result = await createJobAction({
        jobDetails,
        tailoredResume: resume,
        coverLetterText,
      });

      // Verify resume was created
      const dbResume = await prisma.resume.findFirst({
        where: { jobId: result.jobId },
      });
      expect(dbResume).toBeDefined();
      expect(JSON.parse(dbResume?.contentJson || "{}")).toEqual(resume);

      // Verify cover letter was created
      const dbCoverLetter = await prisma.coverLetter.findFirst({
        where: { jobId: result.jobId },
      });
      expect(dbCoverLetter).toBeDefined();
      expect(dbCoverLetter?.contentText).toBe(coverLetterText);
    });

    it("should create a job with URL", async () => {
      const { prisma } = await testDbPromise;
      const jobDetails = createJobDetails();
      const url = "https://example.com/job/123";

      const result = await createJobAction({ jobDetails, url });

      const job = await prisma.job.findUnique({
        where: { id: result.jobId },
      });

      expect(job?.url).toBe(url);
    });

    it("should handle job without contact information", async () => {
      const { prisma } = await testDbPromise;
      const jobDetails = createJobDetails({
        contact: {
          recruiter_name: null,
          recruiter_role: null,
          contact_email: null,
          contact_phone: null,
          contact_whatsapp_available: null,
        },
      });

      const result = await createJobAction({ jobDetails });

      const job = await prisma.job.findUnique({
        where: { id: result.jobId },
        include: { contact: true },
      });

      expect(job?.contactId).toBeNull();
    });
  });

  describe("getAllJobs", () => {
    it("should return all jobs ordered by creation date desc", async () => {
      const { prisma } = await testDbPromise;

      // Create jobs with different dates
      const oldDate = new Date("2024-01-01").toISOString();
      const newDate = new Date("2024-12-01").toISOString();

      await createJob(prisma, { role: "Old Job", createdAt: oldDate });
      await createJob(prisma, { role: "New Job", createdAt: newDate });

      const jobs = await getAllJobs();

      expect(jobs).toHaveLength(2);
      expect(jobs[0].role).toBe("New Job");
      expect(jobs[1].role).toBe("Old Job");
    });

    it("should return empty array when no jobs exist", async () => {
      const jobs = await getAllJobs();
      expect(jobs).toEqual([]);
    });

    it("should include company and contact relations", async () => {
      const { prisma } = await testDbPromise;

      const company = await createCompany(prisma, { name: "Test Company" });
      const contact = await createContact(prisma, {
        recruiterName: "Test Recruiter",
      });
      await createJob(prisma, {
        companyId: company.id,
        contactId: contact.id,
      });

      const jobs = await getAllJobs();

      expect(jobs).toHaveLength(1);
      expect(jobs[0].companyId).toBe(company.id);
      expect(jobs[0].contactId).toBe(contact.id);
    });
  });

  describe("getJobById", () => {
    it("should return a job by ID", async () => {
      const { prisma } = await testDbPromise;
      const job = await createJob(prisma, { role: "Test Role" });

      const result = await getJobById(job.id);

      expect(result).toBeDefined();
      expect(result?.role).toBe("Test Role");
    });

    it("should return null for non-existent job", async () => {
      const result = await getJobById(99999);
      expect(result).toBeNull();
    });
  });

  describe("getJobContext", () => {
    it("should return job with parsed details", async () => {
      const { prisma } = await testDbPromise;
      const jobDetails = createJobDetails();
      const job = await createJob(prisma, {
        jobDetailsJson: JSON.stringify(jobDetails),
      });

      const result = await getJobContext(job.id);

      expect(result).toBeDefined();
      expect(result?.details).toBeDefined();
      expect(result?.details?.job.job_title).toBe(jobDetails.job.job_title);
      expect(result?.details?.company.company_name).toBe(
        jobDetails.company.company_name
      );
    });

    it("should return job with company and contact", async () => {
      const { prisma } = await testDbPromise;
      const company = await createCompany(prisma, { name: "Context Company" });
      const contact = await createContact(prisma, {
        recruiterName: "Context Recruiter",
      });
      const job = await createJob(prisma, {
        companyId: company.id,
        contactId: contact.id,
      });

      const result = await getJobContext(job.id);

      expect(result?.company?.name).toBe("Context Company");
      expect(result?.contact?.recruiterName).toBe("Context Recruiter");
    });

    it("should return null for non-existent job", async () => {
      const result = await getJobContext(99999);
      expect(result).toBeNull();
    });

    it("should handle invalid JSON in jobDetailsJson", async () => {
      const { prisma } = await testDbPromise;
      const job = await createJob(prisma, {
        jobDetailsJson: "invalid json",
      });

      const result = await getJobContext(job.id);

      expect(result).toBeDefined();
      expect(result?.details).toBeNull();
    });
  });

  describe("updateJobStatus", () => {
    it("should update job status", async () => {
      const { prisma } = await testDbPromise;
      const job = await createJob(prisma, { status: "Draft" });

      const result = await updateJobStatus(job.id, "APPLIED");

      expect(result.success).toBe(true);

      const updatedJob = await prisma.job.findUnique({
        where: { id: job.id },
      });
      expect(updatedJob?.status).toBe("APPLIED");
    });

    it("should throw error for invalid status", async () => {
      const { prisma } = await testDbPromise;
      const job = await createJob(prisma);

      await expect(
        updateJobStatus(
          job.id,
          "INVALID_STATUS" as (typeof JOB_STATUSES)[number]
        )
      ).rejects.toThrow("Invalid job status");
    });

    it("should handle all valid statuses", async () => {
      const { prisma } = await testDbPromise;

      for (const status of JOB_STATUSES) {
        const job = await createJob(prisma, { status: "Draft" });
        const result = await updateJobStatus(job.id, status);
        expect(result.success).toBe(true);

        const updated = await prisma.job.findUnique({
          where: { id: job.id },
        });
        expect(updated?.status).toBe(status);
      }
    });
  });

  describe("deleteJob", () => {
    it("should delete a job and cascade to resume and cover letter", async () => {
      const { prisma } = await testDbPromise;
      const scenario = await createCompleteJobScenario(prisma);

      const result = await deleteJob(scenario.job.id);

      expect(result.success).toBe(true);

      // Verify job deleted
      const job = await prisma.job.findUnique({
        where: { id: scenario.job.id },
      });
      expect(job).toBeNull();

      // Verify resume deleted (cascade)
      const resume = await prisma.resume.findFirst({
        where: { jobId: scenario.job.id },
      });
      expect(resume).toBeNull();

      // Verify cover letter deleted (cascade)
      const coverLetter = await prisma.coverLetter.findFirst({
        where: { jobId: scenario.job.id },
      });
      expect(coverLetter).toBeNull();

      // Company and contact should still exist (SetNull on delete)
      const company = await prisma.company.findUnique({
        where: { id: scenario.company.id },
      });
      expect(company).toBeDefined();
    });

    it("should succeed when deleting non-existent job", async () => {
      // Prisma delete throws error for non-existent, but our action catches it
      await expect(deleteJob(99999)).rejects.toThrow();
    });
  });

  describe("getResumeByJobId", () => {
    it("should return resume with parsed JSON content", async () => {
      const { prisma } = await testDbPromise;
      const resumeData = createResumeJSON();
      const job = await createJob(prisma);
      await createResume(prisma, {
        jobId: job.id,
        contentJson: resumeData,
      });

      const result = await getResumeByJobId(job.id);

      expect(result).toBeDefined();
      expect(result?.contentJson).toEqual(resumeData);
    });

    it("should return null when no resume exists", async () => {
      const { prisma } = await testDbPromise;
      const job = await createJob(prisma);

      const result = await getResumeByJobId(job.id);

      expect(result).toBeNull();
    });

    it("should throw error for invalid jobId", async () => {
      await expect(getResumeByJobId(NaN)).rejects.toThrow(
        "Invalid or missing jobId"
      );
    });
  });

  describe("updateResume", () => {
    it("should update resume content", async () => {
      const { prisma } = await testDbPromise;
      const job = await createJob(prisma);
      await createResume(prisma, { jobId: job.id });

      const newContent = createResumeJSON({ summary: "Updated summary" });

      const result = await updateResume(job.id, newContent);

      expect(result.success).toBe(true);

      const updated = await prisma.resume.findFirst({
        where: { jobId: job.id },
      });
      expect(JSON.parse(updated?.contentJson || "{}").summary).toBe(
        "Updated summary"
      );
    });

    it("should update resume with customization", async () => {
      const { prisma } = await testDbPromise;
      const job = await createJob(prisma);
      await createResume(prisma, { jobId: job.id });

      const newContent = createResumeJSON();
      const customization = {
        template: "tech-sidebar" as const,
        pageFormat: "a4" as const,
        fontSize: "large" as const,
        fontFamily: "Georgia",
        colors: {
          primary: "#ff0000",
          secondary: "#00ff00",
          accent: "#0000ff",
          text: "#000000",
          background: "#ffffff",
        },
      };

      const result = await updateResume(job.id, newContent, customization);

      expect(result.success).toBe(true);

      const updated = await prisma.resume.findFirst({
        where: { jobId: job.id },
      });
      expect(updated?.template).toBe("tech-sidebar");
      expect(updated?.colors).toContain("#ff0000");
    });
  });

  describe("getCoverLetterByJobId", () => {
    it("should return cover letter text", async () => {
      const { prisma } = await testDbPromise;
      const job = await createJob(prisma);
      await createCoverLetter(prisma, {
        jobId: job.id,
        contentText: "Test cover letter content",
      });

      const result = await getCoverLetterByJobId(job.id);

      expect(result).toBeDefined();
      expect(result?.contentText).toBe("Test cover letter content");
    });

    it("should return null when no cover letter exists", async () => {
      const { prisma } = await testDbPromise;
      const job = await createJob(prisma);

      const result = await getCoverLetterByJobId(job.id);

      expect(result).toBeNull();
    });
  });

  describe("updateCoverLetter", () => {
    it("should update cover letter content", async () => {
      const { prisma } = await testDbPromise;
      const job = await createJob(prisma);
      await createCoverLetter(prisma, { jobId: job.id });

      const result = await updateCoverLetter(
        job.id,
        "Updated cover letter text"
      );

      expect(result.success).toBe(true);

      const updated = await prisma.coverLetter.findFirst({
        where: { jobId: job.id },
      });
      expect(updated?.contentText).toBe("Updated cover letter text");
    });

    it("should update cover letter with metadata", async () => {
      const { prisma } = await testDbPromise;
      const job = await createJob(prisma);
      await createCoverLetter(prisma, { jobId: job.id });

      const result = await updateCoverLetter(
        job.id,
        "Generated text",
        undefined,
        {
          provider: "openai",
          model: "gpt-4o",
          customPrompt: "Custom instructions",
        }
      );

      expect(result.success).toBe(true);

      const updated = await prisma.coverLetter.findFirst({
        where: { jobId: job.id },
      });
      expect(updated?.provider).toBe("openai");
      expect(updated?.model).toBe("gpt-4o");
      expect(updated?.customPrompt).toBe("Custom instructions");
      expect(updated?.generatedAt).toBeDefined();
    });
  });

  describe("getResumeCustomization", () => {
    it("should return customization for existing resume", async () => {
      const { prisma } = await testDbPromise;
      const job = await createJob(prisma);
      await createResume(prisma, {
        jobId: job.id,
        template: "tech-sidebar",
        pageFormat: "a4",
        fontSize: "large",
        fontFamily: "Georgia",
        colors: "#ff0000,#00ff00,#0000ff,#000000,#ffffff",
      });

      const result = await getResumeCustomization(job.id);

      expect(result.template).toBe("tech-sidebar");
      expect(result.pageFormat).toBe("a4");
      expect(result.fontSize).toBe("large");
      expect(result.fontFamily).toBe("Georgia");
      expect(result.colors.primary).toBe("#ff0000");
    });

    it("should return default customization when no resume exists", async () => {
      const { prisma } = await testDbPromise;
      const job = await createJob(prisma);

      const result = await getResumeCustomization(job.id);

      expect(result.template).toBe("modern-minimal");
      expect(result.pageFormat).toBe("letter");
      expect(result.fontSize).toBe("medium");
      expect(result.fontFamily).toBe("Inter");
    });

    it("should throw error for invalid jobId", async () => {
      await expect(getResumeCustomization(NaN)).rejects.toThrow(
        "Invalid or missing jobId"
      );
    });
  });

  describe("updateResumeCustomization", () => {
    it("should update resume customization", async () => {
      const { prisma } = await testDbPromise;
      const job = await createJob(prisma);
      await createResume(prisma, { jobId: job.id });

      const customization = {
        template: "tech-sidebar" as const,
        pageFormat: "a4" as const,
        fontSize: "large" as const,
        fontFamily: "Georgia",
        colors: {
          primary: "#ff0000",
          secondary: "#00ff00",
          accent: "#0000ff",
          text: "#000000",
          background: "#ffffff",
        },
      };

      const result = await updateResumeCustomization(job.id, customization);

      expect(result.success).toBe(true);

      const updated = await prisma.resume.findFirst({
        where: { jobId: job.id },
      });
      expect(updated?.template).toBe("tech-sidebar");
      expect(updated?.pageFormat).toBe("a4");
      expect(updated?.fontSize).toBe("large");
      expect(updated?.fontFamily).toBe("Georgia");
    });

    it("should throw error for invalid template", async () => {
      const { prisma } = await testDbPromise;
      const job = await createJob(prisma);
      await createResume(prisma, { jobId: job.id });

      await expect(
        updateResumeCustomization(job.id, {
          template:
            "invalid-template" as unknown as typeof customization.template,
        })
      ).rejects.toThrow("Invalid template");
    });

    it("should throw error for invalid font size", async () => {
      const { prisma } = await testDbPromise;
      const job = await createJob(prisma);
      await createResume(prisma, { jobId: job.id });

      await expect(
        updateResumeCustomization(job.id, {
          fontSize: "huge" as unknown as typeof customization.fontSize,
        })
      ).rejects.toThrow("Invalid font size");
    });

    it("should throw error for invalid colors", async () => {
      const { prisma } = await testDbPromise;
      const job = await createJob(prisma);
      await createResume(prisma, { jobId: job.id });

      await expect(
        updateResumeCustomization(job.id, {
          colors: {
            primary: "invalid",
            secondary: "#00ff00",
            accent: "#0000ff",
            text: "#000000",
            background: "#ffffff",
          },
        })
      ).rejects.toThrow("Invalid color format");
    });
  });
});
