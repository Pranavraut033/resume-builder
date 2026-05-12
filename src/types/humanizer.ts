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
      })
    )
    .describe("Audit trail of every change made"),
});

export type HumanizerJSON = z.infer<typeof HumanizerSchema>;

export interface HumanizerPromptInput {
  content: string;
}
