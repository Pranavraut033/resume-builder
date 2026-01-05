/**
 * Simplified Unified Prompt System
 * Single template for all field-level generation with minimal context
 * Optimized for token usage
 *
 * Now powered by the Handlebars-based template system.
 */

import { getFieldPrompt } from "@/lib/prompts";

import {
  ExtractedContext,
  serializeContextForPrompt,
} from "./contextExtractor";

export interface FieldGenerationPrompt {
  systemPrompt: string;
  userPrompt: string;
}

type FieldType =
  | "summary"
  | "education_description"
  | "experience_description"
  | "achievements";

/**
 * Generate a minimal context prompt for field generation
 * Now uses the Handlebars template system under the hood
 */
export function generateFieldPrompt(
  fieldType: FieldType,
  context: ExtractedContext
): FieldGenerationPrompt {
  try {
    // Prepare context for template system
    const templateContext = {
      field: {
        currentContent: context.currentContent || "",
      },
      context: {
        currentRole: context.currentRole,
        yearsOfExperience: context.yearsOfExperience,
        keySkills: context.keySkills,
        targetJobTitle: context.targetJobTitle,
        degree: context.degree,
        field: context.field,
        school: context.school,
        gpa: context.gpa,
        role: context.role,
        company: context.company,
        dateRange: context.dateRange,
        relevantSkills: context.relevantSkills,
        keyMetrics: context.keyMetrics,
      },
    };

    // Use the new template system
    const resolved = getFieldPrompt(fieldType, templateContext as Record<string, unknown>);

    return {
      systemPrompt: resolved.systemPrompt,
      userPrompt: resolved.userPrompt,
    };
  } catch (error) {
    console.error(`Error generating field prompt for ${fieldType}:`, error);

    // Fallback to basic prompt if template system fails
    return {
      systemPrompt: "You are an expert resume writer helping optimize specific resume sections.",
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
