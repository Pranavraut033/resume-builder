/**
 * Prompt Template System Types
 * Defines core interfaces for the Handlebars-based prompt template system
 */

import { PromptPurpose } from "@/lib/promptSystem";

import type { ZodSchema } from "zod";

// Note: We reuse all existing data types (ResumeJSON, JobDetails, etc.)
// Only creating NEW types for the template system infrastructure below:

/**
 * Context path in dot notation
 * Examples: "resume.summary", "jobData.job.job_title", "resume.skills[0]"
 */
export type ContextPath = string;

/**
 * Template definition with Handlebars syntax and optional Zod schema for structured output
 */
export interface PromptTemplate {
  id: string; // Unique identifier
  purpose: PromptPurpose; // From existing enum
  systemPrompt: string; // Handlebars template for system prompt
  userPrompt: string; // Handlebars template for user prompt
  requiredContext: ContextPath[]; // Dot-notation paths
  description?: string;
  outputSchema?: ZodSchema; // Optional Zod schema for structured JSON output validation
}

/**
 * Field-specific prompt variant with optional schema
 */
export interface FieldPromptTemplate {
  id: string;
  fieldType: "summary" | "education_description" | "experience_description" | "achievements";
  intent: string;
  guidelines: string[];
  systemPrompt: string; // Handlebars template
  userPrompt: string; // Handlebars template
  requiredContext: ContextPath[];
  outputSchema?: ZodSchema; // Optional Zod schema for field-specific output validation
}

/**
 * Resolved prompt ready for execution
 */
export interface ResolvedPrompt {
  systemPrompt: string; // Fully resolved
  userPrompt: string; // Fully resolved
  purpose: PromptPurpose;
  estimatedTokens: number;
  outputSchema?: ZodSchema; // Optional schema from template
}

/**
 * Context extraction result
 * Note: data will contain existing types like ResumeJSON, JobDetails, etc.
 */
export interface ShapedContext {
  data: Record<string, unknown>; // Minimal shaped context (contains ResumeJSON, JobDetails, etc.)
  paths: ContextPath[]; // Paths that were extracted
  unused: ContextPath[]; // Paths that were NOT found in input
}
