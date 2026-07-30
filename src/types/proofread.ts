import z from "zod";

import { JobDetailsJSON, RESUME_FIELD_NAMES, ResumeJSON } from "./resume";

// Mirrors src/types/humanizer.ts's shape (a single Zod schema + inferred
// type + a plain prompt-input interface), extended with the field/category
// taxonomy described in the proofread plan.

export const PROOFREAD_CATEGORIES = [
  // Mechanical (lint owns; LLM may also report)
  "stray_artifact",
  "spacing",
  "contact_format",
  "url_casing",
  "date_format",
  "bullet_punctuation",
  "placeholder_text",
  "exact_duplicate_bullet",
  // Judgment (LLM owns)
  "spelling",
  "grammar",
  "punctuation",
  "capitalization",
  "tense_consistency",
  "terminology_consistency",
  "truncated_fragment",
  "duplicate_content",
  "redundant_phrasing",
  "repeated_sentence_opener",
  "keyword_stuffing",
  "generic_filler",
  "weak_verb",
  "passive_voice",
  "first_person_pronoun",
  "run_on_sentence",
  "acronym_undefined",
  "unquantified_claim",
  "job_mismatch",
  // Provenance (LLM owns, requires baseProfile)
  "unsupported_addition",
  "altered_fact",
  "dropped_detail",
  // Fallback
  "other",
] as const;

export type ProofreadCategory = (typeof PROOFREAD_CATEGORIES)[number];

export const ProofreadIssueSchema = z.object({
  field: z.enum(RESUME_FIELD_NAMES),
  category: z.enum(PROOFREAD_CATEGORIES),
  severity: z.enum(["error", "warning", "suggestion"]),
  // Human-readable, e.g. "Experience → Acme Corp → bullet 2".
  location: z.string(),
  // VERBATIM substring from the resume; required for auto-apply.
  original: z.string(),
  // Replacement text; "" when the fix is a deletion.
  suggestion: z.string(),
  explanation: z.string(),
  // Which pass produced this finding.
  source: z.enum(["lint", "llm"]).default("llm"),
  // JSON Pointer (see src/lib/resume/editor.ts::resumePathLines) naming the
  // exact leaf this issue lives at, when derivable. Enables a scoped
  // path-based apply instead of a serialized-JSON string replace; optional
  // for backward compat with findings that predate this field.
  path: z.string().optional(),
});

export type ProofreadIssue = z.infer<typeof ProofreadIssueSchema>;

export const ProofreadSchema = z.object({
  issues: z.array(ProofreadIssueSchema).default([]),
  summary: z.string(),
});

export type ProofreadJSON = z.infer<typeof ProofreadSchema>;

export interface ProofreadPromptInput {
  // Full (non-compacted) resume — the LLM pass needs exact
  // whitespace/punctuation, which resumeToCompactPositional strips.
  resumeFull: ResumeJSON;
  jobDetails?: JobDetailsJSON | null;
  baseProfile?: ResumeJSON | null;
}
