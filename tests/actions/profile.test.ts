import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock, resetPrismaMock } from "../mocks/prisma";
import { sampleBaseProfile } from "../fixtures/data";

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
        resumeJson: JSON.stringify(sampleBaseProfile),
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };

      prismaMock.profile.findFirst.mockResolvedValue(mockProfile);

      const { getProfile } = await import("@/actions/profile");
      const result = await getProfile();

      expect(result).toEqual(sampleBaseProfile);
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
      });
    });
  });

  describe("saveProfile", () => {
    it("should create new profile when none exists", async () => {
      prismaMock.profile.findFirst.mockResolvedValue(null);
      prismaMock.profile.create.mockResolvedValue({
        id: 1,
        resumeJson: JSON.stringify(sampleBaseProfile),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const { saveProfile } = await import("@/actions/profile");
      const result = await saveProfile(sampleBaseProfile);

      expect(result).toEqual({ success: true });
      expect(prismaMock.profile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          resumeJson: JSON.stringify(sampleBaseProfile),
        }),
      });
    });

    it("should update existing profile", async () => {
      const existingProfile = {
        id: 1,
        resumeJson: JSON.stringify({
          ...sampleBaseProfile,
          summary: "Old summary",
        }),
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      };

      prismaMock.profile.findFirst.mockResolvedValue(existingProfile);
      prismaMock.profile.update.mockResolvedValue({
        ...existingProfile,
        resumeJson: JSON.stringify(sampleBaseProfile),
        updatedAt: new Date().toISOString(),
      });

      const { saveProfile } = await import("@/actions/profile");
      const result = await saveProfile(sampleBaseProfile);

      expect(result).toEqual({ success: true });
      expect(prismaMock.profile.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          resumeJson: JSON.stringify(sampleBaseProfile),
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
        resumeJson: JSON.stringify(profileWithComplexData),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const { saveProfile } = await import("@/actions/profile");
      const result = await saveProfile(profileWithComplexData);

      expect(result).toEqual({ success: true });

      const callArg = prismaMock.profile.create.mock.calls[0][0];
      const savedJson = JSON.parse(callArg.data.resumeJson);
      expect(savedJson).toEqual(profileWithComplexData);
    });
  });
});
