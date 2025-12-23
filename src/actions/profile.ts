"use server";

import { prisma } from "@/lib/prisma";
import { ResumeJSON } from "@/types/resume";
import { revalidatePath } from "next/cache";

/**
 * Get the base profile (returns first profile or default structure)
 */
export async function getProfile(): Promise<ResumeJSON> {
  const profile = await prisma.profile.findFirst();

  if (!profile) {
    return {
      header: { name: "", email: "" },
      summary: "",
      experience: [],
      projects: [],
      skills: [],
      education: [],
      certifications: [],
    };
  }

  return JSON.parse(profile.resumeJson) as ResumeJSON;
}

/**
 * Save or update the base profile
 */
export async function saveProfile(
  resumeJson: ResumeJSON,
): Promise<{ success: boolean }> {
  const now = new Date().toISOString();
  const existing = await prisma.profile.findFirst();

  if (!existing) {
    await prisma.profile.create({
      data: {
        resumeJson: JSON.stringify(resumeJson),
        createdAt: now,
        updatedAt: now,
      },
    });
  } else {
    await prisma.profile.update({
      where: { id: existing.id },
      data: {
        resumeJson: JSON.stringify(resumeJson),
        updatedAt: now,
      },
    });
  }

  revalidatePath("/profile");
  return { success: true };
}
