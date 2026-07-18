"use server";

import { Prisma, Profile } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { normalizeSkills, ResumeJSON } from "@/types/resume";

export type ProfileSummary = {
  id: number;
  label: string;
  name: string;
  email: string;
};

/**
 * List all profiles (id + label + contact name/email for display)
 */
export async function getAllProfiles(): Promise<ProfileSummary[]> {
  const profiles = await prisma.profile.findMany({
    select: { id: true, label: true, name: true, email: true },
    orderBy: { createdAt: "asc" },
  });
  return profiles;
}

/**
 * Check if a base profile exists
 */
export async function hasProfile(): Promise<boolean> {
  const profile = await prisma.profile.findFirst();
  return profile !== null && profile.name !== "" && profile.email !== "";
}

/**
 * Get the first profile (backward-compat helper)
 */
export async function getProfile(): Promise<
  (ResumeJSON & { label: string }) | null
> {
  const profile = await prisma.profile.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!profile) return null;
  return profileDataToResumeJson(profile);
}

/**
 * Get a specific profile by id. Falls back to the first profile when id is null.
 */
export async function getProfileById(
  id: number | null | undefined
): Promise<(ResumeJSON & { label: string }) | null> {
  const profile = id
    ? await prisma.profile.findUnique({ where: { id } })
    : await prisma.profile.findFirst({ orderBy: { createdAt: "asc" } });

  if (!profile) return null;

  return profileDataToResumeJson(profile);
}

/**
 * Create a brand-new profile with the given label. Returns the new profile id.
 */
export async function createProfile(
  label: string,
  resumeJson?: Partial<ResumeJSON>
): Promise<{ id: number }> {
  const now = new Date().toISOString();
  const profile = await prisma.profile.create({
    data: {
      label: label.trim() || "New Profile",
      name: resumeJson?.header?.name ?? "",
      email: resumeJson?.header?.email ?? "",
      phone: resumeJson?.header?.phone ?? null,
      location: resumeJson?.header?.location ?? null,
      linkedin: resumeJson?.header?.linkedin ?? null,
      github: resumeJson?.header?.github ?? null,
      website: resumeJson?.header?.website ?? null,
      summary: resumeJson?.summary ?? null,
      skillsJson: JSON.stringify(resumeJson?.skills ?? []),
      experienceJson: JSON.stringify(resumeJson?.experience ?? []),
      projectsJson: JSON.stringify(resumeJson?.projects ?? []),
      educationJson: JSON.stringify(resumeJson?.education ?? []),
      certificationsJson: JSON.stringify(resumeJson?.certifications ?? []),
      publicationsJson: resumeJson?.publications
        ? JSON.stringify(resumeJson.publications)
        : null,
      languagesJson: resumeJson?.languages
        ? JSON.stringify(resumeJson.languages)
        : null,
      volunteerJson: resumeJson?.volunteer
        ? JSON.stringify(resumeJson.volunteer)
        : null,
      awardsJson: resumeJson?.awards ? JSON.stringify(resumeJson.awards) : null,
      createdAt: now,
      updatedAt: now,
    },
  });
  return { id: profile.id };
}

/**
 * Update an existing profile's resume data and optional label.
 */
export async function updateProfile(
  id: number,
  resumeJson: ResumeJSON,
  label?: string
): Promise<{ success: boolean }> {
  const data: Prisma.ProfileUpdateInput = {
    ...resumeJsonToProfileData(resumeJson),
    updatedAt: new Date().toISOString(),
  };
  if (label !== undefined) data.label = label.trim() || "Profile";
  await prisma.profile.update({ where: { id }, data });
  return { success: true };
}

/**
 * Delete a profile by id. Cannot delete if it is the last profile.
 */
export async function deleteProfile(
  id: number
): Promise<{ success: boolean; error?: string }> {
  const count = await prisma.profile.count();
  if (count <= 1) {
    return { success: false, error: "Cannot delete the last profile." };
  }
  await prisma.profile.delete({ where: { id } });
  return { success: true };
}

// TODO: need to handle json parsing errors and validation here, currently assumes data is always valid
function profileDataToResumeJson(
  profile: Profile
): ResumeJSON & { label: string } {
  return {
    label: profile.label,
    header: {
      name: profile.name,
      email: profile.email,
      headline: "",
      phone: profile.phone || null,
      location: profile.location || null,
      linkedin: profile.linkedin || null,
      github: profile.github || null,
      website: profile.website || null,
    },
    summary: profile.summary || "",
    experience: JSON.parse(profile.experienceJson),
    projects: JSON.parse(profile.projectsJson),
    skills: normalizeSkills(JSON.parse(profile.skillsJson)),
    education: JSON.parse(profile.educationJson),
    certifications: JSON.parse(profile.certificationsJson),
    publications: profile.publicationsJson
      ? JSON.parse(profile.publicationsJson)
      : [],
    languages: profile.languagesJson ? JSON.parse(profile.languagesJson) : [],
    volunteer: profile.volunteerJson ? JSON.parse(profile.volunteerJson) : [],
    awards: profile.awardsJson ? JSON.parse(profile.awardsJson) : [],
    sectionLayout: null,
  } satisfies ResumeJSON & { label: string };
}

// TODO: need to handle json parsing errors and validation here, currently assumes data is always valid
function resumeJsonToProfileData(
  resumeJson: ResumeJSON
): Omit<Prisma.ProfileCreateInput, "id" | "createdAt" | "updatedAt"> {
  return {
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
  };
}

/**
 * Save or update the base profile (backward-compat: upserts first profile)
 */
export async function saveProfile(
  resumeJson: ResumeJSON
): Promise<{ success: boolean }> {
  const existing = await prisma.profile.findFirst({
    orderBy: { createdAt: "asc" },
  });
  const now = new Date().toISOString();

  const data = {
    ...resumeJsonToProfileData(resumeJson),
    updatedAt: now,
  };

  if (existing)
    await prisma.profile.update({ where: { id: existing.id }, data });
  else await prisma.profile.create({ data: { ...data, createdAt: now } });

  return { success: true };
}
