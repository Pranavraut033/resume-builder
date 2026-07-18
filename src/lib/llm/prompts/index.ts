/**
 * Prompt Template System Entry Point
 * Centralized template library with Handlebars-based templates.
 *
 * The generic registry/resolver/validation engine lives in
 * `@pranavraut033/llm-core/prompts`; this module keeps the domain layer —
 * concrete templates, `PromptContext`/`PromptPurpose`, and `PromptSystem`'s
 * compact-positional context normalization.
 */

// Import types
export * from "./types";
export * from "./registry";
export {
  resolveTemplate,
  shapeContext,
  estimateTokens,
  validateTemplate,
  validateTemplateResponse,
  validateOrThrow,
  getValidationSummary,
} from "@pranavraut033/llm-core/prompts";
export type {
  ValidationResult,
  ValidationError,
} from "@pranavraut033/llm-core/prompts";
// export * from "./documentation";

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
import "./templates/humanizer";

// Re-export registry instance
export { templateRegistry } from "./registry";

// Convenience functions

import {
  resumeJsonToCompactPositional,
  jobDetailsToCompactPositional,
  atsAnalysisToCompactPositional,
} from "@/types/resume";
import { resolveTemplate } from "@pranavraut033/llm-core/prompts";

import { templateRegistry } from "./registry";
import { sanitizeUntrustedText } from "./sanitize";
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
): Record<string, unknown> {
  return {
    ...context,
    // Free-text fields interpolated verbatim (unescaped `{{{...}}}`) into
    // `---`-fenced prompt blocks by the templates in ./templates/*.ts. The
    // *CompactPositional serializers already sanitize their own output (see
    // @/types/resume), so only the fields that flow straight from the raw
    // context need sanitizing here — this is the single chokepoint before
    // Handlebars (noEscape:true) sees them. See ./sanitize.ts.
    jobDescription: sanitizeUntrustedText(context.jobDescription),
    resumeText: sanitizeUntrustedText(context.resumeText),
    additionalInstructions: sanitizeUntrustedText(
      context.additionalInstructions
    ),
    userInput: sanitizeUntrustedText(context.userInput),
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
    // Small scalar anchors for templates that need to name the role/company
    // in a sentence — the compact-positional strings above are deliberately
    // unstructured (token-size optimization), so templates can't dot-path
    // into them (e.g. `{{jobDetails.job.job_title}}` never resolves). These
    // are single-line, JD-derived, and interpolated unfenced, but routing
    // them through the same sanitizer is free since we're already here.
    jobTitle: sanitizeUntrustedText(context.jobDetails?.job.job_title) ?? "",
    companyName:
      sanitizeUntrustedText(context.jobDetails?.company.company_name) ?? "",
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
    extract_fields_to_edit: "Extract Fields to Edit",
    fix_missing_keywords: "Keyword Mapping",
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
