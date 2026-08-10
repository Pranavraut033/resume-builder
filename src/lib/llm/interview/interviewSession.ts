/**
 * Mock interview LLM module.
 *
 * Standalone, `domainOps.ts`-style free functions — deliberately does NOT
 * import or use `Chatbot.ts`/`ResumeChatBot`. That class's `chat()` always
 * runs resume-domain intent classification first and has no way to accept a
 * custom system prompt, so this module goes straight through the same
 * lower-level primitives it's built on instead
 * (`ProviderFactory.getInstance()` → `provider.runLLM()`/`runStructuredLLM()`
 * → `textOnly()`).
 *
 * v1 scope cut (explicit product decision): no knowledge-base integration,
 * no tool-calling — a plain system prompt only. `getNextInterviewTurn`
 * forwards the caller's full `LLMGenerationOptions` (which already supports
 * `tools`/`toolChoice`) straight through to `runLLM`, so a future KB/search
 * tool can be added purely by the caller passing those options — no
 * signature change needed here.
 */
import { LLMProvider, textOnly } from "@pranavraut033/llm-core";
import z from "zod";

import {
  InterviewFeedbackJSON,
  InterviewTranscriptJSON,
} from "@/types/interview";
import { LLMGenerationOptions, PromptMessage } from "@/types/llm";
import {
  JobDetailsJSON,
  jobDetailsToCompactPositional,
  ResumeJSON,
  resumeJsonToCompactPositional,
} from "@/types/resume";

import type { ResolvedPrompt } from "@pranavraut033/llm-core/prompts";

export interface BuildInterviewSystemPromptInput {
  jobDetails: JobDetailsJSON;
  resume: ResumeJSON;
  /** Resolved tone-preset fragment, e.g. `resolveInterviewStyleGuide(styleId)`. */
  styleGuide: string;
  /** Free-text instructions from the candidate, threaded independently of `styleGuide`. */
  customInstructions?: string;
}

/**
 * Builds the system prompt for a mock-interview session. Voice-to-voice:
 * the interviewer's replies are spoken aloud via TTS and the candidate's
 * replies arrive as STT transcripts, so the persona is instructed to write
 * plain spoken sentences (no markdown/lists), ask one question at a time,
 * and briefly acknowledge each answer before moving on.
 */
export function buildInterviewSystemPrompt({
  jobDetails,
  resume,
  styleGuide,
  customInstructions,
}: BuildInterviewSystemPromptInput): string {
  const jobText = jobDetailsToCompactPositional(jobDetails);
  const resumeText = resumeJsonToCompactPositional(resume);
  const jobTitle = jobDetails.job.job_title || "this role";

  return `You are an experienced interviewer conducting a spoken mock interview with a candidate for the ${jobTitle} position.

This conversation is voice-to-voice: everything you write is converted to speech and read aloud to the candidate, and the candidate's spoken answers are transcribed back to you as text. Because of that:
- Never use markdown, bullet points, numbered lists, headings, asterisks, or any other visual formatting — write only plain, natural spoken sentences.
- Ask exactly ONE question at a time, then stop and wait for the candidate's answer. Never stack multiple questions in one turn.
- Before asking your next question, briefly acknowledge what the candidate just said (a short sentence, not a summary) so the conversation flows naturally, then transition into the next question.
- Keep your own turns short — a brief acknowledgment plus one question, never a monologue.
- Never repeat a question you have already asked in this conversation.

Base your questions on this job posting:
---
${jobText}
---

And this candidate's resume:
---
${resumeText}
---

Tone and interviewing style for this session:
${styleGuide}
${customInstructions ? `\nAdditional instructions from the candidate for this session:\n${customInstructions}` : ""}

Ask realistic interview questions for this role — a mix of background/experience, behavioral, and role-relevant technical or situational questions grounded in the job and resume above.`;
}

/**
 * Streams the interviewer's next turn (an acknowledgment of the prior
 * answer plus the next question, or the opening question when `history` is
 * empty). `options` is forwarded to `runLLM` as-is — including any future
 * `tools`/`toolChoice` a caller adds — so this signature never needs to
 * change to support that.
 *
 * Caller owns appending the returned text and the candidate's next answer
 * to `history` between calls.
 */
export async function* getNextInterviewTurn(
  provider: LLMProvider,
  model: string,
  systemPrompt: string,
  history: PromptMessage[],
  options: LLMGenerationOptions
): AsyncGenerator<string> {
  const stream = provider.runLLM(
    [{ role: "system", content: systemPrompt }, ...history],
    { ...options, model, stream: true }
  );

  yield* textOnly(stream);
}

const InterviewFeedbackOutputSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
});

function transcriptToText(transcript: InterviewTranscriptJSON): string {
  return transcript
    .map(
      (turn) =>
        `${turn.role === "interviewer" ? "Interviewer" : "Candidate"}: ${turn.text}`
    )
    .join("\n");
}

/**
 * One final call at session end — evaluates the full transcript and returns
 * structured debrief feedback. Uses `runStructuredLLM` directly with a
 * hand-built `ResolvedPrompt` (rather than routing through the app's
 * Handlebars `PromptSystem`/`PROMPT_PURPOSES` registry, which is a closed
 * union owned outside this module) since `runStructuredLLM` only reads
 * `systemPrompt`/`userPrompt`/`purpose` off that object — no template
 * registration is required to use it.
 */
export async function generateInterviewFeedback(
  provider: LLMProvider,
  model: string,
  systemPrompt: string,
  transcript: InterviewTranscriptJSON,
  options: LLMGenerationOptions
): Promise<InterviewFeedbackJSON> {
  const transcriptText = transcriptToText(transcript);

  const feedbackSystemPrompt = `${systemPrompt}

The mock interview above has ended. You are now writing a private debrief for the candidate, not speaking to them — normal written prose is fine here, this text is displayed on screen, not spoken aloud.

Evaluate the candidate's performance across the full transcript: how well they answered, how specific and concrete their examples were, and how well they matched what the role needs. Be honest and specific — vague praise or vague criticism is not useful feedback.`;

  const userPrompt = `Full interview transcript:
---
${transcriptText}
---

Write a debrief with:
- summary: a short overall assessment of the candidate's performance in this interview
- strengths: specific things the candidate did well, each as its own concise point
- improvements: specific, actionable things the candidate should work on, each as its own concise point`;

  const prompt: ResolvedPrompt = {
    estimatedTokens: Math.ceil(
      (feedbackSystemPrompt.length + userPrompt.length) / 4
    ),
    purpose: "interview_feedback",
    systemPrompt: feedbackSystemPrompt,
    userPrompt,
  };

  const { result } = await provider.runStructuredLLM(
    prompt,
    { ...options, model },
    InterviewFeedbackOutputSchema,
    "InterviewFeedbackOutput"
  );

  return result;
}
