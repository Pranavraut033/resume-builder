import { DocumentAnalysisJSON } from "@/types/documentAnalysis";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

import type {
  PromptTemplate as CorePromptTemplate,
  ResolvedPrompt as CoreResolvedPrompt,
  ContextPath as CoreContextPath,
  ShapedContext as CoreShapedContext,
} from "@pranavraut033/llm-core/prompts";

export interface PromptContext {
  baseProfile?: ResumeJSON | null;
  resume?: ResumeJSON | null;
  // Full (non-compacted) resume — only the deep-analysis template uses this;
  // it needs exact whitespace/punctuation, which resumeToCompactPositional
  // strips. See normalizedFieldsToString in ./index.ts.
  resumeFull?: ResumeJSON | null;
  // Not a caller-supplied field — `normalizedFieldsToString` (./index.ts)
  // always derives this from `resumeFull` (one line per string leaf as an
  // RFC-6902 JSON Pointer, see src/lib/resume/editor.ts::resumePathLines).
  // Declared here purely so `requiredContext: ["resumeFull", "resumePathLines", ...]`
  // type-checks against `ContextPath<PromptContext>` — setting it directly
  // on a context object has no effect, it's always overwritten.
  resumePathLines?: string;
  jobDetails?: JobDetailsJSON | null;
  // Optional guidance-only context for generate_tailored_resume: "hints for
  // wording and ordering, never evidence of a qualification" (see that
  // template). Historically an ATS analysis; Deep Analysis is the successor
  // schema, so this is what now flows through — field name kept as-is since
  // resume-tailoring.ts (outside this cluster's scope) still reads it under
  // this key.
  atsAnalysis?: DocumentAnalysisJSON | null;
  jobDescription?: string;
  resumeText?: string;
  field?: string;
  additionalInstructions?: string;
  userInput?: string;
  styleGuide?: string;
  // App-authored DE/EU region guidance fragment, derived from `jobDetails`
  // by `normalizedFieldsToString` (see ./regionGuidance.ts) — not something
  // callers set directly.
  regionGuidance?: string;
  // lite/full prompt-depth switch (default full — see templates/deep-analysis.ts).
  // Vary the input, never the output: this only ever gates
  // `{{#if fullMode}}` blocks inside a template's Handlebars source, never a
  // parsed/structured field, so a lite result and a full result stay
  // byte-compatible with the same output schema.
  fullMode?: boolean;
}

// Note: We reuse all existing data types (ResumeJSON, JobDetails, etc.)
// Only creating NEW types for the template system infrastructure below:
export const PROMPT_PURPOSES = [
  "generate_text",
  "generate_tailored_resume",
  "generate_cover_letter",
  "parse_job",
  "parse_resume",
  "analyze_fit",
  "analyze_document",
  "humanize_content",
  "extract_fields_to_edit",
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
