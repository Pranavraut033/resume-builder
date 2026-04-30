"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { ResumeJSON } from "@/types/resume";

/**
 * Check if a base profile exists
 */
export async function hasProfile(): Promise<boolean> {
  const profile = await prisma.profile.findFirst();
  return profile !== null && profile.name !== "" && profile.email !== "";
}

/**
 * Get the base profile (returns first profile or default structure)
 */
export async function getProfile(): Promise<ResumeJSON> {
  const profile = await prisma.profile.findFirst();

  if (!profile) {
    return {
      header: {
        name: "",
        email: "",
        phone: null,
        location: null,
        linkedin: null,
        github: null,
        website: null,
      },
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
    };
  }

  return {
    header: {
      name: profile.name,
      email: profile.email,
      phone: profile.phone || null,
      location: profile.location || null,
      linkedin: profile.linkedin || null,
      github: profile.github || null,
      website: profile.website || null,
    },
    summary: profile.summary || "",
    experience: JSON.parse(profile.experienceJson),
    projects: JSON.parse(profile.projectsJson),
    skills: JSON.parse(profile.skillsJson),
    education: JSON.parse(profile.educationJson),
    certifications: JSON.parse(profile.certificationsJson),
    publications: profile.publicationsJson
      ? JSON.parse(profile.publicationsJson)
      : [],
    languages: profile.languagesJson ? JSON.parse(profile.languagesJson) : [],
    volunteer: profile.volunteerJson ? JSON.parse(profile.volunteerJson) : [],
    awards: profile.awardsJson ? JSON.parse(profile.awardsJson) : [],
  };
}

/**
 * Save or update the base profile
 */
export async function saveProfile(
  resumeJson: ResumeJSON
): Promise<{ success: boolean }> {
  const now = new Date().toISOString();
  const existing = await prisma.profile.findFirst();

  const data = {
    name: resumeJson.header.name,
    email: resumeJson.header.email,
    phone: resumeJson.header.phone || null,
    location: resumeJson.header.location || null,
    linkedin: resumeJson.header.linkedin || null,
    github: resumeJson.header.github || null,
    website: resumeJson.header.website || null,
    summary: resumeJson.summary || null,
    skillsJson: JSON.stringify(resumeJson.skills),
    experienceJson: JSON.stringify(resumeJson.experience),
    projectsJson: JSON.stringify(resumeJson.projects),
    educationJson: JSON.stringify(resumeJson.education),
    certificationsJson: JSON.stringify(resumeJson.certifications),
    publicationsJson: resumeJson.publications
      ? JSON.stringify(resumeJson.publications)
      : null,
    languagesJson: resumeJson.languages
      ? JSON.stringify(resumeJson.languages)
      : null,
    volunteerJson: resumeJson.volunteer
      ? JSON.stringify(resumeJson.volunteer)
      : null,
    awardsJson: resumeJson.awards ? JSON.stringify(resumeJson.awards) : null,
    updatedAt: now,
  };

  if (!existing) {
    await prisma.profile.create({
      data: {
        ...data,
        createdAt: now,
      },
    });
  } else {
    await prisma.profile.update({
      where: { id: existing.id },
      data,
    });
  }

  revalidatePath("/profile");
  return { success: true };
}
