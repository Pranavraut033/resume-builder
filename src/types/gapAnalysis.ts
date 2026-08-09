import z from "zod";

import { ResumeOp } from "@/lib/resume/editor";

import { JobDetailsJSON, ResumeJSON, SkillSchema } from "./resume";

// Mirrors src/types/proofread.ts's shape (a single Zod schema + inferred
// type + a plain prompt-input interface). "ATS gap analysis on steroids" —
// unlike analyze_ats (keyword/format scoring), this reads the resume against
// the JD as a hiring manager would: substantive fit, not string matching.

export const GapFitLevelSchema = z.enum([
  "strong",
  "stretch",
  "reach",
  "mismatch",
]);

export type GapFitLevel = z.infer<typeof GapFitLevelSchema>;

export const GapSeveritySchema = z.enum(["blocking", "major", "minor"]);

export type GapSeverity = z.infer<typeof GapSeveritySchema>;

// "missing" (the resume shows no evidence of this at all) and "seniority"
// (the resume shows the capability but not at the level the role needs) can
// never be closed by a text edit — see the superRefine below, which is the
// schema-level enforcement of that rule.
export const GapTypeSchema = z.enum([
  "missing",
  "understated",
  "unquantified",
  "seniority",
  "domain",
]);

export type GapType = z.infer<typeof GapTypeSchema>;

// Same value union as AtsFixMappingSchema (src/lib/llm/chat-bot/prompts/
// keywordMappingPrompt.ts) — a resume fix only ever writes a string
// leaf/array item or a whole skill entry.
export const GapResumeFixSchema = z.object({
  op: z.enum(["replace", "add", "remove"]),
  path: z.string(),
  value: z.union([z.string(), SkillSchema]).nullable(),
});

export type GapResumeFix = z.infer<typeof GapResumeFixSchema>;

export const GapSchema = z.object({
  requirement: z.string(),
  severity: GapSeveritySchema,
  gap_type: GapTypeSchema,
  evidence_in_resume: z.string().nullable(),
  solution: z.string(),
  resume_fix: GapResumeFixSchema.nullable(),
});

export type Gap = z.infer<typeof GapSchema>;

export const GapStrengthSchema = z.object({
  requirement: z.string(),
  evidence: z.string(),
});

export type GapStrength = z.infer<typeof GapStrengthSchema>;

export const GapAnalysisSchema = z
  .object({
    fit_level: GapFitLevelSchema,
    verdict: z.string(),
    gaps: z.array(GapSchema),
    // .min(1) so the model can't skip the honest close — every analysis must
    // end with at least one genuinely evidence-based strength.
    strengths: z.array(GapStrengthSchema).min(1),
  })
  .superRefine((data, ctx) => {
    data.gaps.forEach((gap, index) => {
      if (
        gap.resume_fix !== null &&
        (gap.gap_type === "missing" || gap.gap_type === "seniority")
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["gaps", index, "resume_fix"],
          message: `resume_fix must be null when gap_type is "${gap.gap_type}" — a text edit cannot fabricate absent experience or seniority.`,
        });
      }
    });
  });

export type GapAnalysisJSON = z.infer<typeof GapAnalysisSchema>;

export interface GapAnalysisPromptInput {
  resume: ResumeJSON;
  jobDetails: JobDetailsJSON;
}

/**
 * Convert the gaps that carry a resume_fix into plain ResumeOp[] ready for
 * applyResumeOps — the direct analogue of mappingsToResumeOps in
 * src/lib/llm/chat-bot/prompts/keywordMappingPrompt.ts. Gaps with a null
 * resume_fix (missing/seniority gaps, or any gap the model judged unfixable
 * by text alone) are skipped; order is preserved.
 */
export function gapFixesToResumeOps(gaps: Gap[]): ResumeOp[] {
  return gaps
    .filter((gap): gap is Gap & { resume_fix: GapResumeFix } =>
      Boolean(gap.resume_fix)
    )
    .map(({ resume_fix }) => {
      const { op, path, value } = resume_fix;
      if (op === "remove") return { op, path };
      return { op, path, value };
    });
}
