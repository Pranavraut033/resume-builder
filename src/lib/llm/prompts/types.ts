import { JobDetails, ResumeJSON } from "@/types/resume";

import type { ZodSchema } from "zod";

export interface PromptContext {
  baseProfile?: ResumeJSON | null;
  resume?: ResumeJSON | null;
  jobDetails?: JobDetails | null;
  jobDescription?: string;
  resumeText?: string;
  field?: string;
  additionalInstructions?: string;
  userInput?: string;
}

export type FieldType =
  | "summary"
  | "education_description"
  | "experience_description"
  | "projects"
  | "skills"
  | "achievements"
  | "generic";

// Note: We reuse all existing data types (ResumeJSON, JobDetails, etc.)
// Only creating NEW types for the template system infrastructure below:
export type PromptPurpose =
  | "generate_summary"
  | "generate_experience"
  | "generate_skills"
  | "generate_projects"
  | "generate_education"
  | "generate_tailored_resume"
  | "edit_resume_chat"
  | "generate_cover_letter"
  | "parse_job"
  | "parse_resume"
  | "analyze_ats"
  | "humanize_content";

/**
 * Dot/bracket path utility that produces autocompleteable paths through nested objects and arrays.
 * - Objects use dot notation: foo.bar.baz
 * - Arrays use bracket index with number placeholder: items[0].name -> represented as items[${number}].name
 */
type DotPathForKey<K extends string, V> =
  // Arrays: allow K, K[${number}], and nested K[${number}].child
  V extends readonly (infer U)[]
    ? `${K}` | `${K}[${number}]` | `${K}[${number}].${DotPath<U>}`
    : V extends (infer U)[]
      ? `${K}` | `${K}[${number}]` | `${K}[${number}].${DotPath<U>}`
      : // Objects: allow K and K.child
        V extends object
        ? `${K}` | `${K}.${DotPath<V>}`
        : // Primitives: just K
          `${K}`;

/**
 * Generate dot/bracket paths for a given type T.
 * Example outputs include: "resume", "resume.summary", "resume.skills[${number}].name"
 */
type DotPath<T> = {
  [K in Extract<keyof NonNullable<T>, string>]: DotPathForKey<
    K,
    NonNullable<T>[K]
  >;
}[Extract<keyof NonNullable<T>, string>];

/**
 * Context path in dot/bracket notation derived from PromptContext
 * Examples: "resume.summary", "jobData.requirements.education", "resume.skills[${number}].name", "jobDescription"
 */
export type ContextPath = DotPath<PromptContext>;

/**
 * Template definition with Handlebars syntax and optional Zod schema for structured output
 */
export interface PromptTemplate {
  id: string; // Unique identifier
  description?: string;
  fieldType?: FieldType;
  guidelines?: string[]; // Field-specific guidelines
  intent?: string; // Field-specific intent
  outputSchema?: ZodSchema; // Optional Zod schema for structured JSON output validation
  purpose: PromptPurpose; // From existing enum
  requiredContext: ContextPath[]; // Dot-notation paths
  systemPrompt: string; // Handlebars template for system prompt
  userPrompt: string; // Handlebars template for user prompt
}

/**
 * Resolved prompt ready for execution
 */
export interface ResolvedPrompt {
  estimatedTokens: number;
  outputSchema?: ZodSchema; // Optional schema from template
  purpose: PromptPurpose;
  systemPrompt: string; // Fully resolved
  userPrompt: string; // Fully resolved
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
