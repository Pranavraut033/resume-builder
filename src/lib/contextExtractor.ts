/**
 * Context Extractor for AI Field Generation
 * Extracts only the minimal required fields for each generation type
 * to reduce token usage while maintaining context quality
 */

import { ResumeJSON, JobDetailsJSON } from "@/types/resume";

export interface ExtractedContext {
  field: string;
  currentContent?: string;
  context: Record<string, unknown>;
}

/**
 * Extract minimal context for professional summary generation
 */
export function extractSummaryContext(
  resume: ResumeJSON,
  jobDetails?: JobDetailsJSON
): ExtractedContext {
  const context: Record<string, unknown> = {};

  // Add current role/title if available (from most recent experience)
  if (resume.experience && resume.experience.length > 0) {
    const latestExp = resume.experience[0];
    if (latestExp.role) {
      context.currentRole = latestExp.role;
    }
  }

  // Add years of experience
  if (resume.experience && resume.experience.length > 0) {
    const yearsExp = resume.experience.length;
    context.yearsOfExperience = yearsExp;
  }

  // Add key skills (top 5, primary-tier first)
  if (resume.skills && resume.skills.length > 0) {
    context.keySkills = [
      ...resume.skills.filter((s) => s.tier === "primary"),
      ...resume.skills.filter((s) => s.tier !== "primary"),
    ]
      .slice(0, 5)
      .map((s) => s.name);
  }

  // Add target job title if available from job
  if (jobDetails?.job?.job_title) {
    context.targetJobTitle = jobDetails.job.job_title;
  }

  return {
    field: "summary",
    currentContent: resume.summary,
    context,
  };
}

/**
 * Extract minimal context for education summary generation
 */
export function extractEducationContext(
  education: ResumeJSON["education"],
  index: number
): ExtractedContext {
  const edu = education?.[index];
  const context: Record<string, unknown> = {};

  if (edu) {
    if (edu.degree) context.degree = edu.degree;
    if (edu.field) context.fieldOfStudy = edu.field;
    if (edu.institution) context.institution = edu.institution;
    if (edu.gpa) context.gpa = edu.gpa;
  }

  return {
    field: `education_${index}_summary`,
    currentContent: undefined, // Education doesn't have a description field
    context,
  };
}

/**
 * Extract minimal context for work experience description
 */
export function extractExperienceContext(
  experience: ResumeJSON["experience"],
  index: number,
  jobDetails?: JobDetailsJSON,
  resume?: ResumeJSON
): ExtractedContext {
  const exp = experience?.[index];
  const context: Record<string, unknown> = {};

  if (exp) {
    if (exp.company) context.company = exp.company;
    if (exp.role) context.jobTitle = exp.role;
    if (exp.startDate && exp.endDate) {
      context.duration = `${exp.startDate} - ${exp.endDate}`;
    }
  }

  // Add relevant skills from resume (primary-tier first)
  if (resume?.skills && resume.skills.length > 0) {
    context.relevantSkills = [
      ...resume.skills.filter((s) => s.tier === "primary"),
      ...resume.skills.filter((s) => s.tier !== "primary"),
    ]
      .slice(0, 5)
      .map((s) => s.name);
  }

  // Add job title for context
  if (jobDetails?.job?.job_title) {
    context.targetJobTitle = jobDetails.job.job_title;
  }

  return {
    field: `experience_${index}_description`,
    currentContent: exp?.description,
    context,
  };
}

/**
 * Extract minimal context for achievements/accomplishments
 */
export function extractAchievementsContext(
  experience: ResumeJSON["experience"],
  index: number,
  jobDetails?: JobDetailsJSON
): ExtractedContext {
  const exp = experience?.[index];
  const context: Record<string, unknown> = {};

  if (exp) {
    if (exp.role) context.jobTitle = exp.role;
    if (exp.company) context.company = exp.company;
  }

  // Add job title for context
  if (jobDetails?.job?.job_title) {
    context.targetJobTitle = jobDetails.job.job_title;
  }

  const achievementsText = exp?.achievements?.join("\n") || "";

  return {
    field: `experience_${index}_achievements`,
    currentContent: achievementsText,
    context,
  };
}

/**
 * Serialize context to minimal JSON string for prompt
 */
export function serializeContextForPrompt(context: ExtractedContext): string {
  return JSON.stringify(
    {
      field: context.field,
      currentContent: context.currentContent || "[empty]",
      context: context.context,
    },
    null,
    2
  );
}
