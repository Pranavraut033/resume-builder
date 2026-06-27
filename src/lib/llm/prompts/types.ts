import { ATSAnalysisJSON, JobDetailsJSON, ResumeJSON } from "@/types/resume";

import type {
  PromptTemplate as CorePromptTemplate,
  ResolvedPrompt as CoreResolvedPrompt,
  ContextPath as CoreContextPath,
  ShapedContext as CoreShapedContext,
} from "@pranavraut033/llm-core/prompts";

export interface PromptContext {
  baseProfile?: ResumeJSON | null;
  resume?: ResumeJSON | null;
  jobDetails?: JobDetailsJSON | null;
  atsAnalysis?: ATSAnalysisJSON | null;
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
export const PROMPT_PURPOSES = [
  "generate_text",
  "generate_summary",
  "generate_experience",
  "generate_skills",
  "generate_projects",
  "generate_education",
  "generate_tailored_resume",
  "generate_cover_letter",
  "parse_job",
  "parse_resume",
  "analyze_ats",
  "humanize_content",
  "extract_fields_to_edit",
  "fix_missing_keywords",
] as const;

export type PromptPurpose = (typeof PROMPT_PURPOSES)[number];

// The dot/bracket path machinery, `PromptTemplate`, `ResolvedPrompt`, and
// `ShapedContext` are domain-agnostic and now live in
// `@pranavraut033/llm-core/prompts` — these aliases specialize them to this
// app's `PromptContext`/`PromptPurpose` vocabulary.

/**
 * Context path in dot/bracket notation derived from PromptContext
 * Examples: "resume.summary", "jobData.requirements.education", "resume.skills[${number}].name", "jobDescription"
 */
export type ContextPath = CoreContextPath<PromptContext>;

/**
 * Template definition with Handlebars syntax and optional Zod schema for structured output
 */
export type PromptTemplate = CorePromptTemplate<PromptContext, PromptPurpose>;

/**
 * Resolved prompt ready for execution
 */
export type ResolvedPrompt = CoreResolvedPrompt<PromptPurpose>;

/**
 * Context extraction result
 * Note: data will contain existing types like ResumeJSON, JobDetails, etc.
 */
export type ShapedContext = CoreShapedContext<PromptContext>;
