import { describe, it, expect, beforeEach, vi } from "vitest";

import { sampleBaseProfile } from "../fixtures/data";
import { prismaMock, resetPrismaMock } from "../mocks/prisma";

// Mock revalidatePath
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Profile Actions", () => {
  beforeEach(() => {
    resetPrismaMock();
  });

  describe("getProfile", () => {
    it("should return existing profile", async () => {
      const mockProfile = {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        phone: null,
        location: null,
        linkedin: null,
        github: null,
        website: null,
        summary: "Test summary",
        skillsJson: '["JavaScript","TypeScript"]',
        experienceJson: "[]",
        projectsJson: "[]",
        educationJson: "[]",
        certificationsJson: "[]",
        publicationsJson: null,
        languagesJson: null,
        volunteerJson: null,
        awardsJson: null,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };

      prismaMock.profile.findFirst.mockResolvedValue(mockProfile);

      const { getProfile } = await import("@/actions/profile");
      const result = await getProfile();

      expect(result.header.name).toBe("John Doe");
      expect(result.header.email).toBe("john@example.com");
      expect(result.summary).toBe("Test summary");
      expect(prismaMock.profile.findFirst).toHaveBeenCalled();
    });

    it("should return default profile structure when no profile exists", async () => {
      prismaMock.profile.findFirst.mockResolvedValue(null);

      const { getProfile } = await import("@/actions/profile");
      const result = await getProfile();

      expect(result).toEqual({
        header: { name: "", email: "" },
        summary: "",
        experience: [],
        projects: [],
        skills: [],
        education: [],
        certifications: [],
        publications: [],
        languages: [],
        volunteer: [],
        awards: [],
      });
    });
  });

  describe("saveProfile", () => {
    it("should create new profile when none exists", async () => {
      prismaMock.profile.findFirst.mockResolvedValue(null);
      prismaMock.profile.create.mockResolvedValue({
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        phone: null,
        location: null,
        linkedin: null,
        github: null,
        website: null,
        summary: "Test summary",
        skillsJson: '["JavaScript"]',
        experienceJson: "[]",
        projectsJson: "[]",
        educationJson: "[]",
        certificationsJson: "[]",
        publicationsJson: null,
        languagesJson: null,
        volunteerJson: null,
        awardsJson: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const { saveProfile } = await import("@/actions/profile");
      const result = await saveProfile(sampleBaseProfile);

      expect(result).toEqual({ success: true });
      expect(prismaMock.profile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: sampleBaseProfile.header.name,
          email: sampleBaseProfile.header.email,
        }),
      });
    });

    it("should update existing profile", async () => {
      const existingProfile = {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        phone: null,
        location: null,
        linkedin: null,
        github: null,
        website: null,
        summary: "Old summary",
        skillsJson: "[]",
        experienceJson: "[]",
        projectsJson: "[]",
        educationJson: "[]",
        certificationsJson: "[]",
        publicationsJson: null,
        languagesJson: null,
        volunteerJson: null,
        awardsJson: null,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };

      prismaMock.profile.findFirst.mockResolvedValue(existingProfile);
      prismaMock.profile.update.mockResolvedValue({
        ...existingProfile,
        summary: sampleBaseProfile.summary,
        updatedAt: new Date().toISOString(),
      });

      const { saveProfile } = await import("@/actions/profile");
      const result = await saveProfile(sampleBaseProfile);

      expect(result).toEqual({ success: true });
      expect(prismaMock.profile.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          name: sampleBaseProfile.header.name,
          email: sampleBaseProfile.header.email,
        }),
      });
    });

    it("should handle JSON serialization correctly", async () => {
      const profileWithComplexData = {
        ...sampleBaseProfile,
        experience: [
          {
            company: "Test Company",
            role: "Engineer",
            startDate: "2020-01",
            endDate: "Present",
            description: "Led development of key features",
            achievements: ["Task 1", "Task 2"],
          },
        ],
      };

      prismaMock.profile.findFirst.mockResolvedValue(null);
      prismaMock.profile.create.mockResolvedValue({
        id: 1,
        name: profileWithComplexData.header.name,
        email: profileWithComplexData.header.email,
        phone: null,
        location: null,
        linkedin: null,
        github: null,
        website: null,
        summary: profileWithComplexData.summary,
        skillsJson: JSON.stringify(profileWithComplexData.skills),
        experienceJson: JSON.stringify(profileWithComplexData.experience),
        projectsJson: JSON.stringify(profileWithComplexData.projects),
        educationJson: JSON.stringify(profileWithComplexData.education),
        certificationsJson: JSON.stringify(
          profileWithComplexData.certifications
        ),
        publicationsJson: null,
        languagesJson: null,
        volunteerJson: null,
        awardsJson: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const { saveProfile } = await import("@/actions/profile");
      const result = await saveProfile(profileWithComplexData);

      expect(result).toEqual({ success: true });

      const callArg = prismaMock.profile.create.mock.calls[0][0];
      expect(callArg.data.experienceJson).toBe(
        JSON.stringify(profileWithComplexData.experience)
      );
    });
  });
});
