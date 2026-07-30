import z from "zod";

export const HumanizerSchema = z.object({
  rewritten: z
    .string()
    .describe(
      "Humanized text with all original facts preserved and AI patterns removed"
    ),
  changes: z
    .array(
      z.object({
        original: z.string().describe("The original phrase or sentence"),
        replacement: z.string().describe("The rewritten version"),
        reason: z.string().describe("The AI pattern that was fixed"),
        // JSON Pointer (see src/lib/resume/editor.ts::resumePathLines) to
        // the exact resume leaf this change targets, when the humanizer was
        // run against a resume (as opposed to free-standing text like a
        // cover letter). Optional for backward compat with callers that
        // don't have a resume to path against.
        path: z.string().optional(),
      })
    )
    .describe("Audit trail of every change made"),
});

export type HumanizerJSON = z.infer<typeof HumanizerSchema>;

export interface HumanizerPromptInput {
  content: string;
}
