import z from "zod";

import { JobDetailsJSON, ResumeJSON } from "./resume";

// Mirrors src/types/fitCheck.ts's shape (a single Zod schema + a plain
// prompt-input interface). "What do I change in the document?" — merges the
// old proofread_resume and analyze_ats purposes into one flat findings[]
// array: a finding with no quotable anchor in the resume doesn't belong
// here, it's a Fit Check gap instead.
//
// `v: z.literal(2)` replaces the old tolerant `.default()` back-compat
// parsing entirely: a stored blob that predates this shape simply fails to
// parse, and the caller re-runs the analysis rather than the schema trying
// to paper over a shape it no longer understands.

export const DocumentFindingKindSchema = z.enum([
  "correctness",
  "impact",
  "keyword",
  "duplication",
  "provenance",
  "title",
]);

export type DocumentFindingKind = z.infer<typeof DocumentFindingKindSchema>;

export const DocumentFindingSeveritySchema = z.enum([
  "error",
  "warning",
  "suggestion",
]);

export type DocumentFindingSeverity = z.infer<
  typeof DocumentFindingSeveritySchema
>;

export const DocumentFindingSchema = z.object({
  // JSON Pointer (see src/lib/resume/editor.ts::resumePathLines) naming the
  // exact leaf this finding lives at, verbatim from resumePathLines — every
  // finding has one, unlike the old ProofreadIssue.path which was optional.
  path: z.string(),
  // VERBATIM substring of the resume; required for auto-apply and for the
  // drawer to locate/highlight the exact text being critiqued.
  original: z.string(),
  // Replacement text; "" means delete.
  suggestion: z.string(),
  kind: DocumentFindingKindSchema,
  severity: DocumentFindingSeveritySchema,
  why: z.string(),
  // Which pass produced this finding. Security-relevant, not just
  // informational: downstream consumers (e.g. Chatbot.ts, via
  // guardDocumentAnalysis) auto-apply `source === "lint"` findings without
  // review, on the theory that a deterministic lint check is always safe to
  // apply unattended. The server re-stamps every LLM-submitted finding to
  // `source: "llm"` regardless of what the model sent, so a client can never
  // forge the "lint" label to sneak an unreviewed suggestion through as if
  // it were a deterministic fix — see src/mcp/guards.ts.
  source: z.enum(["lint", "llm"]).default("llm"),
});

export type DocumentFinding = z.infer<typeof DocumentFindingSchema>;

export const DocumentAnalysisSchema = z.object({
  v: z.literal(2),
  findings: z.array(DocumentFindingSchema),
  summary: z.string(),
});

export type DocumentAnalysisJSON = z.infer<typeof DocumentAnalysisSchema>;

export interface DocumentAnalysisPromptInput {
  // Full (non-compacted) resume — the LLM pass needs exact
  // whitespace/punctuation, which resumeJsonToCompactPositional strips.
  resumeFull: ResumeJSON;
  // Required, unlike the old ProofreadPromptInput's optional jobDetails: the
  // `keyword` and `title` finding kinds are both judged against the target
  // job, so there is no meaningful Deep Analysis without one.
  jobDetails: JobDetailsJSON;
  // Optional — gates the `provenance` finding kind, which only exists in
  // full mode and only when there's a base profile to diff against.
  baseProfile?: ResumeJSON | null;
}
