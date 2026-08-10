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
 * Tool-calling (KB retrieval): the model can search the bundled interview
 * playbook (`playbook.ts`) on its own judgment via `search_interview_playbook`.
 * There is no existing multi-turn tool-result round trip elsewhere in this
 * codebase — the only other tool-calling call site (`Chatbot.ts`'s
 * `runEditIntent`) is single-shot (forced tool call → app executes it →
 * done). Each turn/debrief here instead runs a small, bounded "Phase A"
 * loop (`runPlaybookToolRound`, non-streamed, `toolChoice: "auto"`,
 * capped rounds) so the model can call the tool, see the result, and either
 * call it again or stop — before any text is streamed to the UI. This is
 * required because streamed tool-call events only arrive after all text
 * deltas: if a call site streamed first and discovered a tool call after
 * the fact, any text already shown to the user would have to be retroactively
 * discarded. Splitting into a non-streamed "decide whether to search" phase
 * and a separate streamed "produce the final text" phase avoids that.
 *
 * This requires the message array to carry the richer `PromptMessage` from
 * `@pranavraut033/llm-core` (with a `"tool"` role and `assistant.toolCalls`)
 * rather than the app-local, narrowed `PromptMessage` in `@/types/llm`
 * (`"system"|"user"|"assistant"` only, plain `content: string`) — the
 * app-local type has no way to represent a tool-call round trip.
 */
import { LLMProvider, PromptMessage, textOnly } from "@pranavraut033/llm-core";
import z from "zod";

import { trackTokenUsage } from "@/lib/llm/tokenTracker";
import { createLogger } from "@/lib/logger";
import {
  InterviewFeedbackJSON,
  InterviewTranscriptJSON,
} from "@/types/interview";
import { LLMGenerationOptions, ToolCall, ToolDefinition } from "@/types/llm";
import {
  JobDetailsJSON,
  jobDetailsToCompactPositional,
  ResumeJSON,
  resumeJsonToCompactPositional,
} from "@/types/resume";

import {
  buildSearchPlaybookTool,
  loadInterviewPlaybook,
  searchPlaybook,
} from "./playbook";

import type { ResolvedPrompt } from "@pranavraut033/llm-core/prompts";

const logger = createLogger("MockInterview");

/** Hard cap on Phase-A tool-call rounds per turn/debrief — bounds cost and
 * guards against a model that keeps calling the tool indefinitely. */
const MAX_TOOL_ROUNDS = 2;

interface ToolRoundOutcome {
  messages: PromptMessage[];
  /**
   * Text from the round that returned no tool call. When the model never
   * touched the playbook this is already a complete turn, so the caller can
   * use it directly instead of paying for a second generation.
   */
  finalText: string;
  usedTool: boolean;
}

/**
 * Phase A of the two-phase turn design: a small, bounded loop of
 * non-streamed `runLLM` calls with the playbook search tool offered
 * (`toolChoice: "auto"`, never forced). If the model returns a tool call,
 * the exact call is echoed back as an `assistant` message (per the
 * provider-layer contract — never invent a different id/name/arguments),
 * followed by a `tool` message carrying the search result, and the loop
 * continues. As soon as a round returns no tool call (the common case),
 * the loop stops immediately — most turns pay for only one extra
 * non-streamed call, not the full `maxRounds`.
 *
 * Shared by `getNextInterviewTurn` (Phase A ahead of the streamed answer)
 * and `generateInterviewFeedback` (one round ahead of the structured
 * debrief call).
 */
async function runPlaybookToolRound(
  provider: LLMProvider,
  model: string,
  messages: PromptMessage[],
  tool: ToolDefinition,
  executeTool: (query: string) => string,
  options: LLMGenerationOptions,
  maxRounds: number = MAX_TOOL_ROUNDS
): Promise<ToolRoundOutcome> {
  // Strip `onUsage` from the spread options below: `LLMGenerationOptions`
  // types it as an optional callback, but the non-streamed `runLLM`
  // overload we need here (`stream?: false; onUsage?: never`) requires it
  // be genuinely absent from the argument's type, not just possibly
  // `undefined` at runtime.
  const { onUsage: _onUsage, ...restOptions } = options;

  let current = messages;
  let usedTool = false;

  for (let round = 0; round < maxRounds; round++) {
    const { result, toolCalls, usage } = await provider.runLLM(current, {
      ...restOptions,
      model,
      tools: [tool],
      toolChoice: "auto",
      stream: false,
    });

    // The non-streamed overload can't take `onUsage` (stripped above), so
    // report this round's tokens from the returned result instead — otherwise
    // every Phase-A call would be invisible to the app's token analytics.
    if (usage) void trackTokenUsage(usage);

    if (!toolCalls || toolCalls.length === 0) {
      return { messages: current, finalText: result ?? "", usedTool };
    }
    usedTool = true;

    const toolCall = toolCalls[0];
    const query = extractQueryArgument(toolCall);
    const toolResult = executeTool(query);

    current = [
      ...current,
      { role: "assistant", content: result, toolCalls: [toolCall] },
      {
        role: "tool",
        content: toolResult,
        toolCallId: toolCall.id,
        toolName: toolCall.name,
      },
    ];
  }

  return { messages: current, finalText: "", usedTool };
}

function extractQueryArgument(toolCall: ToolCall): string {
  const args = toolCall.arguments;
  if (args && typeof args === "object" && "query" in args) {
    const query = (args as Record<string, unknown>).query;
    if (typeof query === "string") return query;
  }
  return "";
}

/** Collects the content of every `tool`-role message in `messages` — used to
 * fold Phase-A search results into a plain prompt string for
 * `runStructuredLLM`, which takes system/user prompt strings, not a message
 * array. */
function collectToolResults(messages: PromptMessage[]): string[] {
  return messages
    .filter(
      (message): message is Extract<PromptMessage, { role: "tool" }> =>
        message.role === "tool"
    )
    .map((message) => message.content);
}

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
 * Produces the interviewer's next turn (an acknowledgment of the prior
 * answer plus the next question, or the opening question when `history` is
 * empty) as a stream of text chunks. Two phases:
 *
 * - Phase A (`runPlaybookToolRound`, non-streamed, bounded): lets the model
 *   search the interview playbook if it judges that would sharpen this
 *   turn's question. Runs entirely during the caller's
 *   "interviewer_thinking" phase, before anything is shown to the user.
 * - Phase B (streamed, no tools offered): the actual turn text, piped
 *   through `textOnly()` exactly as before — this is the only phase that
 *   ever streams to the UI, so nothing shown to the user is ever discarded
 *   because a tool call was discovered mid-stream.
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
  let messages: PromptMessage[] = [
    { role: "system", content: systemPrompt },
    ...history,
  ];

  try {
    const sections = await loadInterviewPlaybook();
    const tool = buildSearchPlaybookTool(sections);
    const outcome = await runPlaybookToolRound(
      provider,
      model,
      messages,
      tool,
      (query) => searchPlaybook(sections, query),
      options
    );

    // The model answered without reaching for the playbook, so Phase A
    // already produced a complete turn — reuse it rather than paying for a
    // second full generation. Nothing is lost by not streaming it: the caller
    // buffers the whole turn before speaking it aloud anyway.
    if (!outcome.usedTool && outcome.finalText.trim()) {
      yield outcome.finalText;
      return;
    }

    messages = outcome.messages;
  } catch (err) {
    // Playbook grounding is an optional enhancement. A missing/failed asset,
    // or a provider that rejects `tools`, must not take the whole interview
    // down with it — fall through to an ungrounded turn.
    logger.warn("Playbook tool round failed; continuing without KB grounding", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const stream = provider.runLLM(messages, { ...options, model, stream: true });

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
 *
 * Before building that call, runs one bounded playbook-tool round
 * (`runPlaybookToolRound`, shared with `getNextInterviewTurn`) so the model
 * can ground specific weaknesses/behavioral/technical feedback in the
 * playbook if it judges that would help. `runStructuredLLM` takes a
 * system/user prompt string pair, not a message array, so any retrieved
 * section text is folded into `userPrompt` as a clearly labeled block
 * rather than threaded through as raw tool messages. If the model never
 * calls the tool, `userPrompt` is unchanged from before this cluster.
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

  let userPrompt = `Full interview transcript:
---
${transcriptText}
---

Write a debrief with:
- summary: a short overall assessment of the candidate's performance in this interview
- strengths: specific things the candidate did well, each as its own concise point
- improvements: specific, actionable things the candidate should work on, each as its own concise point`;

  // Same optional-enhancement rule as `getNextInterviewTurn`: if the playbook
  // can't be loaded or the provider rejects tool calls, still produce a
  // debrief — just an ungrounded one.
  try {
    const sections = await loadInterviewPlaybook();
    const tool = buildSearchPlaybookTool(sections);

    const toolRoundMessages: PromptMessage[] = [
      { role: "system", content: feedbackSystemPrompt },
      {
        role: "user",
        content: `${userPrompt}

Before writing the debrief, you may call ${tool.name} if specific playbook guidance on the candidate's weaknesses, their behavioral answers, or their technical performance would sharpen your feedback. Only call it if it would genuinely help — otherwise proceed straight to the debrief.`,
      },
    ];

    const { messages: roundedMessages } = await runPlaybookToolRound(
      provider,
      model,
      toolRoundMessages,
      tool,
      (query) => searchPlaybook(sections, query),
      options
    );

    const retrieved = collectToolResults(roundedMessages).join("\n\n---\n\n");
    if (retrieved) {
      userPrompt = `${userPrompt}

Relevant playbook guidance:
---
${retrieved}
---`;
    }
  } catch (err) {
    logger.warn(
      "Playbook tool round failed; writing debrief without KB grounding",
      {
        error: err instanceof Error ? err.message : String(err),
      }
    );
  }

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
