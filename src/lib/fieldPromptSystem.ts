/**
 * Simplified Unified Prompt System
 * Single template for all field-level generation with minimal context
 * Optimized for token usage
 *
 * Now powered by the Handlebars-based template system.
 */

import { getPromptByPurpose } from "@/lib/llm/prompts";
import { PromptPurpose } from "@/lib/llm/prompts";
import { FieldType } from "@/lib/llm/prompts/types";

import {
  ExtractedContext,
  serializeContextForPrompt,
} from "./contextExtractor";

export interface FieldGenerationPrompt {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Map field types to prompt purposes
 */
function getPromptPurpose(fieldType: FieldType): PromptPurpose {
  const fieldPurposeMap: Record<FieldType, PromptPurpose> = {
    summary: "generate_summary",
    education_description: "generate_education",
    experience_description: "generate_experience",
    projects: "generate_projects",
    skills: "generate_skills",
    achievements: "generate_experience",
  };

  return fieldPurposeMap[fieldType] || "generate_summary";
}

/**
 * Generate a minimal context prompt for field generation
 * Now uses the Handlebars template system under the hood
 */
export function generateFieldPrompt(
  fieldType: FieldType,
  context: ExtractedContext
): FieldGenerationPrompt {
  try {
    const extracted = context.context || {};

    // Prepare context for template system
    const templateContext = {
      field: {
        currentContent: context.currentContent || "",
      },
      context: {
        currentRole: extracted.currentRole,
        yearsOfExperience: extracted.yearsOfExperience,
        keySkills: extracted.keySkills,
        targetJobTitle: extracted.targetJobTitle,
        degree: extracted.degree,
        field: extracted.fieldOfStudy,
        school: extracted.institution,
        gpa: extracted.gpa,
        role: extracted.jobTitle,
        company: extracted.company,
        dateRange: extracted.duration,
        relevantSkills: extracted.relevantSkills,
        keyMetrics: extracted.keyMetrics,
      },
    };

    // Use the new template system - get template by purpose
    const purpose = getPromptPurpose(fieldType);
    const resolved = getPromptByPurpose(
      purpose,
      templateContext as Record<string, unknown>
    );

    return {
      systemPrompt: resolved.systemPrompt,
      userPrompt: resolved.userPrompt,
    };
  } catch (error) {
    console.error(`Error generating field prompt for ${fieldType}:`, error);

    // Fallback to basic prompt if template system fails
    return {
      systemPrompt:
        "You are an expert resume writer helping optimize specific resume sections.",
      userPrompt: `Improve the following content:\n\n${context.currentContent || "[empty]"}\n\nContext:\n${serializeContextForPrompt(context)}`,
    };
  }
}

/**
 * Format prompt for tooltip display
 */
export function formatPromptForTooltip(prompt: FieldGenerationPrompt): string {
  return `System: ${prompt.systemPrompt}\n\nUser: ${prompt.userPrompt}`;
}
