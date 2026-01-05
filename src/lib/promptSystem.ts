/**
 * Unified Prompt System
 * Centralized prompt management for all LLM operations
 *
 * Now powered by the Handlebars-based template system.
 * This file maintains backward compatibility while using the new template engine.
 */

import { getPromptByPurpose } from "@/lib/prompts";
import { ResumeJSON, JobDetails } from "@/types/resume";

export interface PromptContext {
  resume?: ResumeJSON | null;
  jobData?: JobDetails | null;
  jobDescription?: string;
  field?: string;
  additionalInstructions?: string;
}

export type PromptPurpose =
  | "generate_summary"
  | "generate_experience"
  | "generate_skills"
  | "generate_projects"
  | "generate_education"
  | "parse_job"
  | "parse_resume"
  | "analyze_ats";

export interface Prompt {
  purpose: PromptPurpose;
  systemPrompt: string;
  userPrompt: string;
  context: PromptContext;
}

class PromptSystem {
  /**
   * Generate a unified prompt for a given purpose
   * Now uses the Handlebars template system under the hood
   */
  static generatePrompt(
    purpose: PromptPurpose,
    context: PromptContext
  ): Prompt {
    try {
      // Use the new template system
      // Cast context to Record<string, unknown> for template system
      const resolved = getPromptByPurpose(purpose, context as Record<string, unknown>);

      return {
        purpose,
        systemPrompt: resolved.systemPrompt,
        userPrompt: resolved.userPrompt,
        context,
      };
    } catch (error) {
      console.error(`Error generating prompt for purpose ${purpose}:`, error);

      // Fallback to a basic prompt if template system fails
      return {
        purpose,
        systemPrompt: "You are an expert resume writer.",
        userPrompt: `Generate content for ${purpose}`,
        context,
      };
    }
  }

  /**
   * Format prompt for display to user
   */
  static formatPromptForDisplay(prompt: Prompt): string {
    return `System Prompt:\n${prompt.systemPrompt}\n\nUser Prompt:\n${prompt.userPrompt}`;
  }

  /**
   * Get purpose label for display
   */
  static getPurposeLabel(purpose: PromptPurpose): string {
    const labels: Record<PromptPurpose, string> = {
      generate_summary: "Professional Summary Generation",
      generate_experience: "Experience Description Generation",
      generate_skills: "Skills Generation",
      generate_projects: "Project Description Generation",
      generate_education: "Education Summary Generation",
      parse_job: "Job Description Parsing",
      parse_resume: "Resume Parsing",
      analyze_ats: "ATS Analysis",
    };
    return labels[purpose];
  }
}

export default PromptSystem;
