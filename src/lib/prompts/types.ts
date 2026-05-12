/**
 * Prompt Template System Types
 * Defines core interfaces for the Handlebars-based prompt template system
 */

import { FieldType, PromptPurpose } from "@/lib/llm/prompts";

import type { ZodSchema } from "zod";

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
  // Optional field configuration for field-specific templates
  fieldType?: FieldType;
  intent?: string; // Field-specific intent
  guidelines?: string[]; // Field-specific guidelines
}

// FieldPromptTemplate is no longer needed - use PromptTemplate with fieldType instead

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
