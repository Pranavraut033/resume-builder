/**
 * Mock interview tone/instruction presets.
 * Each style's `promptFragment` is spliced into the interview system prompt
 * (see `src/lib/llm/interview/interviewSession.ts`'s `buildInterviewSystemPrompt`)
 * to steer how the interviewer persona behaves — bluntness, warmth, pressure,
 * etc. Custom instructions are NOT a preset entry here — they're a separate
 * free-text field threaded independently into the same prompt builder,
 * mirroring how cover letters keep `customInstructions` apart from
 * `COVER_LETTER_STYLES` (see coverLetterStyles.ts).
 */

export interface InterviewStyle {
  label: string;
  description: string;
  promptFragment: string;
}

export const INTERVIEW_STYLES = {
  honest: {
    label: "Honest",
    description: "Blunt, unvarnished feedback — no cushioning.",
    promptFragment: `- Be direct and unvarnished. Do not soften a weak answer with false praise, and do not bury a real critique under compliments.
- If an answer is vague, unquantified, or dodges the question, say so plainly before moving on.
- Stay respectful and professional, but prioritize candor over comfort — the candidate is here to find out what actually needs work.`,
  },
  encouraging: {
    label: "Encouraging",
    description: "Warm and supportive, while still substantive.",
    promptFragment: `- Be warm and supportive in tone — acknowledge effort and highlight what the candidate did well before moving on.
- Frame gaps constructively (what to add or sharpen next time) rather than as failures.
- Stay substantive: encouragement should never come at the cost of asking real, probing questions — this is still a genuine practice interview, not a pep talk.`,
  },
  neutral: {
    label: "Neutral",
    description: "Plain, professional baseline tone.",
    promptFragment: `- Keep a plain, even, professional tone throughout — neither harsh nor effusive.
- Acknowledge each answer briefly and factually, then move to the next question.
- Ask standard interview questions the way a competent, businesslike interviewer would, without injecting extra warmth or extra pressure.`,
  },
  tough: {
    label: "Tough",
    description: "FAANG-style pressure test with follow-up probing.",
    promptFragment: `- Run this like a high-bar FAANG-style interview: push for specifics, and don't let a vague or high-level answer pass unchallenged.
- Follow up aggressively on weak or incomplete answers — ask for numbers, trade-offs, and concrete decisions the candidate personally made before accepting the answer and moving on.
- Maintain pressure throughout (tight, skeptical follow-ups) while staying professional — the goal is to stress-test the candidate's answers, not to be rude.`,
  },
} as const satisfies Record<string, InterviewStyle>;

export type InterviewStyleId = keyof typeof INTERVIEW_STYLES;

export const DEFAULT_INTERVIEW_STYLE: InterviewStyleId = "neutral";

export function resolveInterviewStyleGuide(id?: InterviewStyleId): string {
  return INTERVIEW_STYLES[id ?? DEFAULT_INTERVIEW_STYLE].promptFragment;
}
