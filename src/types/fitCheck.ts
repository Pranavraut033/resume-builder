import z from "zod";

import { JobDetailsJSON, ResumeJSON } from "./resume";

// Mirrors src/types/documentAnalysis.ts's shape (a single Zod schema + a
// plain prompt-input interface). "Should I apply, and what's blocking me?" —
// unlike analyze_document (which says which line to change), this is a
// judgment call on whether the fit is worth pursuing at all.
//
// `v: z.literal(2)` replaces the old tolerant `.default()` back-compat
// parsing entirely: a stored blob that predates this shape simply fails to
// parse, and the caller re-runs the analysis rather than the schema trying
// to paper over a shape it no longer understands.

export const FitLevelSchema = z.enum([
  "strong",
  "stretch",
  "reach",
  "mismatch",
]);

export type FitLevel = z.infer<typeof FitLevelSchema>;

// Evidence strength, not impact — deliberately not named "severity". It
// answers "how sure am I this knocks the candidate out", which sits next to
// (but is a different axis from) Gap.severity below, which measures how bad
// the gap is once it's confirmed to exist.
export const KnockoutConfidenceSchema = z.enum([
  "confirmed",
  "likely",
  "unknown",
]);

export type KnockoutConfidence = z.infer<typeof KnockoutConfidenceSchema>;

export const KnockoutRiskSchema = z.object({
  requirement: z.string(),
  confidence: KnockoutConfidenceSchema,
  evidence: z.string(),
  advice: z.string(),
});

export type KnockoutRisk = z.infer<typeof KnockoutRiskSchema>;

export const GapSeveritySchema = z.enum(["blocking", "major", "minor"]);

export type GapSeverity = z.infer<typeof GapSeveritySchema>;

// Only 3 values, down from the old 5 ("understated"/"unquantified" moved to
// Deep Analysis findings, since both are text-level edits, not fit
// judgments). "missing" and "seniority" can never be closed by a text edit;
// "domain" can legitimately also produce a Deep Analysis reframing finding
// for the same underlying issue — that overlap is intentional, see the plan.
export const GapTypeSchema = z.enum(["missing", "seniority", "domain"]);

export type GapType = z.infer<typeof GapTypeSchema>;

export const GapSchema = z.object({
  requirement: z.string(),
  severity: GapSeveritySchema,
  gap_type: GapTypeSchema,
  evidence_in_resume: z.string().nullable(),
  solution: z.string(),
});

export type Gap = z.infer<typeof GapSchema>;

export const StrengthSchema = z.object({
  requirement: z.string(),
  evidence: z.string(),
});

export type Strength = z.infer<typeof StrengthSchema>;

export const FitCheckSchema = z.object({
  v: z.literal(2),
  fit_level: FitLevelSchema,
  // 2–3 blunt sentences — this is the honest, no-hedging read, not a
  // restatement of the gaps below.
  verdict: z.string(),
  knockout_risks: z.array(KnockoutRiskSchema),
  gaps: z.array(GapSchema),
  // .min(1) so the model can't skip the honest close — every analysis must
  // end with at least one genuinely evidence-based strength.
  strengths: z.array(StrengthSchema).min(1),
});

export type FitCheckJSON = z.infer<typeof FitCheckSchema>;

export interface FitCheckPromptInput {
  resume: ResumeJSON;
  jobDetails: JobDetailsJSON;
}
