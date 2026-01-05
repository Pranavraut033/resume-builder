import { describe, it, expect, beforeEach, vi } from "vitest";

import { sampleJobDetails, sampleTailoredResume } from "../fixtures/data";
import { prismaMock, resetPrismaMock } from "../mocks/prisma";

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Job Actions", () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  describe("createJob", () => {
    it("should create a job with parsed details", async () => {
      const mockCompany = {
        id: 1,
        name: "Acme Corporation",
        industry: null,
        description: null,
        marketPosition: null,
        locationCity: null,
        locationCountry: null,
        officeLocationDetails: null,
      };

      const mockContact = {
        id: 1,
        recruiterName: null,
        recruiterRole: null,
        contactEmail: null,
        contactPhone: null,
        contactWhatsappAvailable: null,
      };

      const mockJob = {
        id: 1,
        companyId: 1,
        contactId: 1,
        role: "Full Stack Developer",
        description: "Full Stack Developer position at Acme Corporation...",
        status: "Draft",
        jobDetailsJson: JSON.stringify(sampleJobDetails),
        createdAt: new Date().toISOString(),
      };

      prismaMock.company.create.mockResolvedValue(mockCompany);
      prismaMock.contact.create.mockResolvedValue(mockContact);
      prismaMock.job.create.mockResolvedValue(mockJob);

      const { createJob } = await import("@/actions/job");

      const result = await createJob({
        jobDetails: sampleJobDetails,
      });

      expect(result).toEqual({ jobId: 1 });
      expect(prismaMock.company.create).toHaveBeenCalled();
      expect(prismaMock.job.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 1,
          contactId: 1,
          role: "Full Stack Developer",
          status: "Draft",
        }),
      });
    });

    it("should create job with resume and cover letter", async () => {
      const mockCompany = {
        id: 2,
        name: "Acme Corporation",
        industry: null,
        description: null,
        marketPosition: null,
        locationCity: null,
        locationCountry: null,
        officeLocationDetails: null,
      };

      const mockContact = {
        id: 2,
        recruiterName: null,
        recruiterRole: null,
        contactEmail: null,
        contactPhone: null,
        contactWhatsappAvailable: null,
      };

      const mockJob = {
        id: 2,
        companyId: 2,
        contactId: 2,
        role: "Full Stack Developer",
        description: "Job description",
        status: "Draft",
        jobDetailsJson: JSON.stringify(sampleJobDetails),
        createdAt: new Date().toISOString(),
      };

      const mockResume = {
        id: 1,
        jobId: 2,
        contentJson: JSON.stringify(sampleTailoredResume),
        lastEdited: new Date().toISOString(),
        template: "modern-minimal",
        pageFormat: "letter",
        fontSize: "medium",
        fontFamily: "Inter",
        themeId: "Default Blue",
        colors: "#3b82f6,#64748b,#8b5cf6,#1f2937,#ffffff",
      };

      const mockCoverLetter = {
        id: 1,
        jobId: 2,
        contentText: "Cover letter text",
        template: "professional-block",
        fontSize: "medium",
        fontFamily: "Inter",
        lineHeight: "normal",
        colors: "#3b82f6,#64748b,#8b5cf6,#1f2937,#ffffff",
        provider: null,
        model: null,
        customPrompt: null,
        generatedAt: null,
        version: 1,
        lastEdited: new Date().toISOString(),
        pageFormat: "a4",
      };

      prismaMock.company.create.mockResolvedValue(mockCompany);
      prismaMock.contact.create.mockResolvedValue(mockContact);
      prismaMock.job.create.mockResolvedValue(mockJob);
      prismaMock.resume.create.mockResolvedValue(mockResume);
      prismaMock.coverLetter.create.mockResolvedValue(mockCoverLetter);

      const { createJob } = await import("@/actions/job");

      const result = await createJob({
        jobDetails: sampleJobDetails,
        tailoredResume: sampleTailoredResume,
        coverLetterText: "Cover letter text",
      });

      expect(result).toEqual({ jobId: 2 });
      expect(prismaMock.job.create).toHaveBeenCalled();
      expect(prismaMock.resume.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jobId: 2,
          contentJson: JSON.stringify(sampleTailoredResume),
        }),
      });
      expect(prismaMock.coverLetter.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          jobId: 2,
          contentText: "Cover letter text",
        }),
      });
    });
  });

  describe("getAllJobs", () => {
    it("should return all jobs ordered by creation date", async () => {
      const mockJobs = [
        {
          id: 2,
          companyId: 2,
          contactId: null,
          role: "Role B",
          description: "Desc B",
          status: "Draft",
          jobDetailsJson: "{}",
          createdAt: "2025-01-02T00:00:00.000Z",
        },
        {
          id: 1,
          companyId: 1,
          contactId: null,
          role: "Role A",
          description: "Desc A",
          status: "Applied",
          jobDetailsJson: "{}",
          createdAt: "2025-01-01T00:00:00.000Z",
        },
      ];

      prismaMock.job.findMany.mockResolvedValue(mockJobs);

      const { getAllJobs } = await import("@/actions/job");
      const result = await getAllJobs();

      expect(result).toEqual(mockJobs);
      expect(prismaMock.job.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" },
      });
    });

    it("should return empty array when no jobs exist", async () => {
      prismaMock.job.findMany.mockResolvedValue([]);

      const { getAllJobs } = await import("@/actions/job");
      const result = await getAllJobs();

      expect(result).toEqual([]);
    });
  });

  describe("getJobById", () => {
    it("should return a job by ID", async () => {
      const mockJob = {
        id: 1,
        companyId: 1,
        contactId: null,
        role: "Test Role",
        description: "Test Description",
        status: "Draft",
        jobDetailsJson: "{}",
        createdAt: new Date().toISOString(),
      };

      prismaMock.job.findUnique.mockResolvedValue(mockJob);

      const { getJobById } = await import("@/actions/job");
      const result = await getJobById(1);

      expect(result).toEqual(mockJob);
      expect(prismaMock.job.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it("should return null when job does not exist", async () => {
      prismaMock.job.findUnique.mockResolvedValue(null);

      const { getJobById } = await import("@/actions/job");
      const result = await getJobById(999);

      expect(result).toBeNull();
    });
  });

  describe("updateJobStatus", () => {
    it("should update job status", async () => {
      const mockJob = {
        id: 1,
        companyId: 1,
        contactId: null,
        role: "Test Role",
        description: "Test Description",
        status: "APPLIED",
        jobDetailsJson: "{}",
        createdAt: new Date().toISOString(),
      };

      prismaMock.job.update.mockResolvedValue(mockJob);

      const { updateJobStatus } = await import("@/actions/job");
      const result = await updateJobStatus(1, "APPLIED");

      expect(result).toEqual({ success: true });
      expect(prismaMock.job.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: "APPLIED" },
      });
    });
  });

  describe("deleteJob", () => {
    it("should delete a job", async () => {
      const mockJob = {
        id: 1,
        companyId: 1,
        contactId: null,
        role: "Test Role",
        description: "Test Description",
        status: "Draft",
        jobDetailsJson: "{}",
        createdAt: new Date().toISOString(),
      };

      prismaMock.job.delete.mockResolvedValue(mockJob);

      const { deleteJob } = await import("@/actions/job");
      const result = await deleteJob(1);

      expect(result).toEqual({ success: true });
      expect(prismaMock.job.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  describe("getResumeByJobId", () => {
    it("should return resume for a job", async () => {
      const mockResume = {
        id: 1,
        jobId: 1,
        contentJson: JSON.stringify(sampleTailoredResume),
        lastEdited: new Date().toISOString(),
        template: "modern-minimal",
        pageFormat: "letter",
        fontSize: "medium",
        fontFamily: "Inter",
        themeId: "Default Blue",
        colors: "#3b82f6,#64748b,#8b5cf6,#1f2937,#ffffff",
      };

      prismaMock.resume.findFirst.mockResolvedValue(mockResume);

      const { getResumeByJobId } = await import("@/actions/job");
      const result = await getResumeByJobId(1);

      expect(result).toEqual(sampleTailoredResume);
      expect(prismaMock.resume.findFirst).toHaveBeenCalledWith({
        where: { jobId: 1 },
      });
    });

    it("should return null when resume does not exist", async () => {
      prismaMock.resume.findFirst.mockResolvedValue(null);

      const { getResumeByJobId } = await import("@/actions/job");
      const result = await getResumeByJobId(999);

      expect(result).toBeNull();
    });
  });

  describe("updateResume", () => {
    it("should update existing resume", async () => {
      prismaMock.resume.updateMany.mockResolvedValue({ count: 1 });

      const { updateResume } = await import("@/actions/job");
      const result = await updateResume(1, {
        ...sampleTailoredResume,
        summary: "Updated",
      });

      expect(result).toEqual({ success: true });
      expect(prismaMock.resume.updateMany).toHaveBeenCalled();
    });

    it("should update with updateMany even when no existing resume", async () => {
      prismaMock.resume.updateMany.mockResolvedValue({ count: 0 });

      const { updateResume } = await import("@/actions/job");
      const result = await updateResume(1, sampleTailoredResume);

      expect(result).toEqual({ success: true });
      expect(prismaMock.resume.updateMany).toHaveBeenCalled();
    });
  });

  describe("getCoverLetterByJobId", () => {
    it("should return cover letter for a job", async () => {
      const mockCoverLetter = {
        id: 1,
        jobId: 1,
        contentText: "Cover letter text",
        template: "professional-block",
        fontSize: "medium",
        fontFamily: "Inter",
        lineHeight: "normal",
        colors: "#3b82f6,#64748b,#8b5cf6,#1f2937,#ffffff",
        provider: null,
        model: null,
        customPrompt: null,
        generatedAt: null,
        version: 1,
        lastEdited: new Date().toISOString(),
        pageFormat: "a4",
      };

      prismaMock.coverLetter.findFirst.mockResolvedValue(mockCoverLetter);

      const { getCoverLetterByJobId } = await import("@/actions/job");
      const result = await getCoverLetterByJobId(1);

      expect(result).toEqual("Cover letter text");
    });
  });

  describe("updateCoverLetter", () => {
    it("should update existing cover letter", async () => {
      prismaMock.coverLetter.updateMany.mockResolvedValue({ count: 1 });

      const { updateCoverLetter } = await import("@/actions/job");
      const result = await updateCoverLetter(1, "Updated text");

      expect(result).toEqual({ success: true });
      expect(prismaMock.coverLetter.updateMany).toHaveBeenCalled();
    });
  });
});
