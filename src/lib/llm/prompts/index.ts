/**
 * Prompt Template System Entry Point
 * Centralized template library with Handlebars-based templates
 */

// Import types
export * from "./types";
export * from "./resolver";
export * from "./registry";
export * from "./validation";
export * from "./documentation";

// Import all templates to trigger registration
import "./templates/field-summary";
import "./templates/field-experience";
import "./templates/field-skills";
import "./templates/field-projects";
import "./templates/education";
import "./templates/parsing";
import "./templates/ats";
import "./templates/resume-tailoring";
import "./templates/cover-letter";

// Re-export registry instance
export { templateRegistry } from "./registry";

// Convenience functions

import {
  resumeJsonToCompactPositional,
  jobDetailsToCompactPositional,
  atsAnalysisToCompactPositional,
} from "@/types/resume";

import { templateRegistry } from "./registry";
import { resolveTemplate } from "./resolver";
import { PromptContext, PromptPurpose, ResolvedPrompt } from "./types";

/**
 * Get and resolve template by purpose
 */
export function getPromptByPurpose(
  purpose: PromptPurpose,
  context: PromptContext
): ResolvedPrompt {
  const template = templateRegistry.getByPurpose(purpose);

  if (!template) {
    throw new Error(`No template found for purpose: ${purpose}`);
  }

  return resolveTemplate(template, normalizedFieldsToString(context));
}

function normalizedFieldsToString(
  context: PromptContext
): Partial<Record<keyof PromptContext, string | undefined>> {
  return {
    ...context,
    baseProfile: context.baseProfile
      ? resumeJsonToCompactPositional(context.baseProfile)
      : "",
    resume: context.resume ? resumeJsonToCompactPositional(context.resume) : "",
    jobDetails: context.jobDetails
      ? jobDetailsToCompactPositional(context.jobDetails)
      : "",
    atsAnalysis: context.atsAnalysis
      ? atsAnalysisToCompactPositional(context.atsAnalysis)
      : "",
  };
}

export class PromptSystem {
  private static labels: Record<PromptPurpose, string> = {
    analyze_ats: "ATS Analysis",
    generate_cover_letter: "Cover Letter Generation",
    generate_education: "Education Summary Generation",
    generate_experience: "Experience Description Generation",
    generate_projects: "Project Description Generation",
    generate_skills: "Skills Generation",
    generate_summary: "Professional Summary Generation",
    generate_tailored_resume: "Tailored Resume Generation",
    parse_job: "Job Description Parsing",
    parse_resume: "Resume Parsing",
    humanize_content: "Content Humanization",
    generate_text: "General Text Generation",
  };

  /**
   * Generate a unified prompt for a given purpose
   * Now uses the Handlebars template system under the hood
   */
  static generatePrompt(
    purpose: PromptPurpose,
    context: PromptContext
  ): ResolvedPrompt {
    return getPromptByPurpose(purpose, context);
  }

  /**
   * Format prompt for display to user
   */
  static formatPromptForDisplay(prompt: ResolvedPrompt): string {
    return `System Prompt:\n${prompt.systemPrompt}\n\nUser Prompt:\n${prompt.userPrompt}`;
  }

  /**
   * Get purpose label for display
   */
  static getPurposeLabel(purpose: PromptPurpose): string {
    return this.labels[purpose];
  }
}
