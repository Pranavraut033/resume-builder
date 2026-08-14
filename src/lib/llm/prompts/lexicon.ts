/**
 * Shared word-lists interpolated into more than one prompt template. Kept
 * here instead of inlined per-template so the membership can't drift between
 * copies (it had: humanizer.ts's AI-verb list used to differ from
 * resume-tailoring.ts's and cover-letter.ts's).
 */

// Stock verbs recruiters read as an AI tell. Comma-joined for interpolation
// into a sentence ("Avoid spearheaded, leveraged, ...").
export const AI_TELL_VERBS =
  "spearheaded, leveraged, orchestrated, utilized, championed";
