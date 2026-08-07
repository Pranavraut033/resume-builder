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
        // cover letter). null when there's no resume to path against.
        // OpenAI structured outputs require every field present and
        // disallow `.optional()` — nullable is the supported way to mark a
        // field as "may be absent": https://platform.openai.com/docs/guides/structured-outputs?api-mode=responses#all-fields-must-be-required
        path: z.string().nullable(),
      })
    )
    .describe("Audit trail of every change made"),
});

export type HumanizerJSON = z.infer<typeof HumanizerSchema>;

export interface HumanizerPromptInput {
  content: string;
}
