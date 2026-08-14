import { LLMProvider, textOnly } from "@pranavraut033/llm-core";

import { LLMUsageInfo } from "@/actions/tokenUsage";
import { ProviderFactory } from "@/lib/llm/providers";
import logger from "@/lib/logger";
import { applyProofreadFixes } from "@/lib/proofread/applyFixes";
import { applyResumeOps, ResumeOp } from "@/lib/resume/editor";
import { useModelStore } from "@/store/modelStore";
import { GapAnalysisJSON } from "@/types/gapAnalysis";
import { HumanizerJSON } from "@/types/humanizer";
import {
  ProviderType,
  LLMResult,
  LLMGenerationOptions,
  ReasoningEffort,
  PromptMessage,
} from "@/types/llm";
import { ProofreadIssue } from "@/types/proofread";
import {
  ATSAnalysisJSON,
  JobDetailsJSON,
  jobDetailsToCompactPositional,
  ResumeJSON,
  resumeJsonToCompactPositional,
} from "@/types/resume";

import {
  buildEditFieldPrompt,
  INTENT_CLASSIFIER_PROMPT,
  INTERVIEW_PROMPT,
  QUESTION_PROMPT,
} from "./prompts";
import * as domainOps from "../domainOps";
import { PromptSystem } from "../prompts";
import {
  resolveCoverLetterStyleGuide,
  resolveDefaultCoverLetterStyle,
} from "../prompts/coverLetterStyles";
import { mergeLLMUsageInfo } from "../tokenTracker";
import {
  PipelineStageEvent,
  runTailoringPipeline as runPipeline,
} from "./pipeline/pipeline";
import { EditFieldOutputSchema } from "./prompts/extractFieldsToEdit";
import {
  IntentLabel,
  isToolIntent,
  ToolIntent,
} from "./prompts/intentClassifier";
import {
  AtsFixMappingSchema,
  buildAtsFixPrompt,
  buildKeywordMappingPrompt,
  mappingsToResumeOps,
} from "./prompts/keywordMappingPrompt";
import { RESUME_TOOLS, validateEditResumeArgs } from "./tools";

export type ChatBotOptions = {
  provider: ProviderType;
  model: string;
  reasoningEffort?: ReasoningEffort;
  temperature?: number;
  topP?: number;
};

// per-intent status narration shown immediately after intent classification
const INTENT_STATUS_TEXT: Record<IntentLabel, string> = {
  [IntentLabel.Edit]: "Editing your resume…",
  [IntentLabel.Regenerate]: "Rebuilding your resume…",
  [IntentLabel.Tailor]: "Tailoring to the job…",
  [IntentLabel.Ats]: "Analyzing ATS compatibility…",
  [IntentLabel.FixAts]: "Applying ATS fixes…",
  [IntentLabel.GapAnalysis]: "Analyzing your fit for this role…",
  [IntentLabel.Proofread]: "Proofreading your resume…",
  [IntentLabel.Interview]: "Preparing interview prep…",
  [IntentLabel.Question]: "Answering…",
  [IntentLabel.CoverLetter]: "Rewriting your cover letter…",
  [IntentLabel.Humanize]: "Removing AI-sounding phrasing…",
  [IntentLabel.Undo]: "Reverting last change…",
  [IntentLabel.Other]: "Answering…",
};

// what chat() yields to the caller
export type ChatStreamEvent =
  | { type: "intent"; intent: IntentLabel }
  | { type: "status"; text: string }
  // "tailor"/"regenerate" rewrite the whole resume — chat() stops here
  // instead of running them until re-invoked with confirmed: true.
  | {
      type: "confirm_required";
      intent: Extract<ToolIntent, "tailor" | "regenerate">;
    }
  | { type: "chunk"; text: string } // interview / question text chunks
  | {
      type: "tool_result";
      intent: IntentLabel.Ats;
      args: { atsAnalysis: ATSAnalysisJSON; usage: LLMUsageInfo };
    }
  | {
      type: "tool_result";
      // Never mutates the resume — kept out of the shared
      // "regenerate" | "tailor" | "edit" | "fix_ats" branch above on purpose.
      intent: IntentLabel.GapAnalysis;
      args: { analysis: GapAnalysisJSON; usage: LLMUsageInfo; note: string };
    }
  | {
      type: "tool_result";
      intent: Extract<ToolIntent, "regenerate" | "tailor" | "edit" | "fix_ats">;
      args: {
        updatedResume: ResumeJSON;
        usage: LLMUsageInfo;
        note: string;
        summary?: string;
        /** Count of ops the model produced that couldn't be applied (schema-invalid path/value) — lets the UI show a friendly warning + retry instead of silently looking identical to a full success. */
        rejectedCount?: number;
      };
    }
  | {
      type: "tool_result";
      intent: IntentLabel.Proofread;
      args: {
        issues: ProofreadIssue[];
        summary: string;
        updatedResume?: ResumeJSON;
        usage: LLMUsageInfo;
        note: string;
      };
    }
  | {
      type: "tool_result";
      intent: IntentLabel.CoverLetter;
      args: { updatedCoverLetter: string; usage: LLMUsageInfo; note: string };
    }
  | {
      type: "tool_result";
      intent: IntentLabel.Humanize;
      args: {
        updatedCoverLetter: string;
        changes: HumanizerJSON["changes"];
        usage: LLMUsageInfo;
        note: string;
      };
    }
  | {
      type: "tool_result";
      intent: IntentLabel.Undo;
      args: { usage?: LLMUsageInfo; note: string };
    }
  | { type: "error"; message: string }
  | { type: "done"; usage?: LLMUsageInfo };

type ChatHistoryLabel = "chat";

/**
 * Build a human-readable note for a tool_result event out of applyResumeOps'
 * applied/rejected lists — a rejected op is reported inline instead of
 * throwing and aborting the whole chat turn.
 */
function buildOpsNote(
  label: string,
  applied: ResumeOp[],
  rejected: { op: ResumeOp; reason: string }[]
): string {
  const parts: string[] = [];

  parts.push(
    applied.length > 0
      ? `${label} applied to: ${applied.map((op) => op.path).join(", ")}`
      : `${label}: no changes could be applied`
  );

  if (rejected.length > 0) {
    const reasons = rejected
      .map((r) => `${r.op.path} (${r.reason})`)
      .join("; ");
    parts.push(`${rejected.length} change(s) could not be applied: ${reasons}`);
  }

  return parts.join(" — ");
}

class ResumeChatBot {
  protected model: string;
  protected provider: LLMProvider | null = null;

  // stateful per-session data
  protected resume: ResumeJSON;
  protected jobDetails: JobDetailsJSON;
  private baseProfile: ResumeJSON;
  private coverLetter: string;
  protected chatHistory: Record<ChatHistoryLabel, PromptMessage[]> = {
    chat: [],
  };
  private atsAnalysis: ATSAnalysisJSON | null = null;
  private gapAnalysis: GapAnalysisJSON | null = null;

  constructor(
    providerType: ProviderType,
    model: string,
    resume: ResumeJSON,
    jobDetails: JobDetailsJSON,
    baseProfile: ResumeJSON,
    coverLetter: string = ""
  ) {
    this.getProvider(providerType)
      .then((provider) => {
        this.provider = provider;
      })
      .catch((err) => {
        logger.error(
          "ResumeChatbot",
          "Failed to initialize ResumeChatBot session",
          err
        );
      });

    this.baseProfile = baseProfile;
    this.model = model;
    this.resume = resume;
    this.jobDetails = jobDetails;
    this.coverLetter = coverLetter;
  }

  setResume(resume: ResumeJSON) {
    this.resume = resume;
  }

  setCoverLetter(coverLetter: string) {
    this.coverLetter = coverLetter;
  }

  setJobDescription(jd: JobDetailsJSON) {
    this.jobDetails = jd;
  }

  setAtsAnalysis(analysis: ATSAnalysisJSON | null) {
    this.atsAnalysis = analysis;
  }

  resetSession(resume: ResumeJSON, jobDetails: JobDetailsJSON) {
    this.chatHistory = { chat: [] };
    this.resume = resume;
    this.jobDetails = jobDetails;
  }

  getResume() {
    return this.resume;
  }

  async initializeSession(
    model: string,
    resume: ResumeJSON,
    jobDetails: JobDetailsJSON,
    providerType: ProviderType
  ) {
    this.model = model;
    this.resume = resume;
    this.jobDetails = jobDetails;
    this.provider = await this.getProvider(providerType);
  }

  private async getProvider(providerType: ProviderType): Promise<LLMProvider> {
    const llmProvider = await ProviderFactory.getInstance(providerType);
    if (!llmProvider) throw new Error(`Provider ${providerType} not available`);

    return llmProvider;
  }

  isSessionInitialized(): asserts this is { provider: LLMProvider } {
    if (!this.isProviderReady()) {
      throw new Error(
        "Session not initialized with provider yet. Please wait for provider to load."
      );
    }
  }

  isProviderReady(): this is { provider: LLMProvider } {
    return this.provider !== null;
  }

  /**
   * Defaults `reasoningEffort` from the model-selector's per-model
   * preference (src/store/modelStore.ts) when the caller didn't set one
   * explicitly — same behavior as LLMService.
   */
  private resolveReasoningEffort(
    options: ChatBotOptions
  ): ReasoningEffort | undefined {
    return (
      options.reasoningEffort ??
      useModelStore
        .getState()
        .getReasoningEffort(options.provider, options.model) ??
      undefined
    );
  }

  /**
   * Defaults `temperature` from the model-selector's per-model preference
   * when the caller didn't set one explicitly — same behavior as
   * LLMService's `withTemperature`.
   */
  private resolveTemperature(options: ChatBotOptions): number | undefined {
    return (
      options.temperature ??
      useModelStore
        .getState()
        .getTemperature(options.provider, options.model) ??
      undefined
    );
  }

  /**
   * Defaults `topP` from the model-selector's per-model preference — same
   * pattern as `resolveTemperature`.
   */
  private resolveTopP(options: ChatBotOptions): number | undefined {
    return (
      options.topP ??
      useModelStore.getState().getTopP(options.provider, options.model) ??
      undefined
    );
  }

  /**
   * Merges call-specific options (maxTokens, tools, etc.) with the model +
   * reasoning effort + temperature + topP for this turn. `extra` is spread
   * last so an explicit override in a specific call site (e.g.
   * `classifyIntent`'s deterministic `temperature: 0`) always wins over the
   * stored preference.
   */
  private callOptions<T extends Partial<LLMGenerationOptions> = object>(
    options: ChatBotOptions,
    extra: T = {} as T
  ): T & {
    model: string;
    reasoningEffort?: ReasoningEffort;
    temperature?: number;
    topP?: number;
  } {
    const reasoningEffort = this.resolveReasoningEffort(options);
    const temperature = this.resolveTemperature(options);
    const topP = this.resolveTopP(options);

    return {
      model: options.model,
      ...(reasoningEffort ? { reasoningEffort } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
      ...(topP !== undefined ? { topP } : {}),
      ...extra,
    };
  }

  // ── Multi-agent tailoring pipeline ────────────────────────────────────────
  // Chains the four agents (requirements → rewrite → verify → score) with a
  // bounded verification loop. Kept separate from chat() intent routing.
  async *runTailoringPipeline(
    options: ChatBotOptions
  ): AsyncGenerator<PipelineStageEvent> {
    this.isSessionInitialized();
    for await (const event of runPipeline(this.provider, {
      resume: this.resume,
      jobDetails: this.jobDetails,
      options: this.callOptions(options),
    })) {
      // adopt the tailored resume into session state so later chat turns see it
      if (event.stage === "done") this.resume = event.updatedResume;
      yield event;
    }
  }

  // ── Intent classification ─────────────────────────────────────────────────

  async classifyIntent(
    userInput: string,
    options: ChatBotOptions
  ): Promise<LLMResult<IntentLabel>> {
    this.isSessionInitialized();

    return this.provider.runLLM(
      [
        { role: "system", content: INTENT_CLASSIFIER_PROMPT },
        { role: "user", content: userInput },
      ],
      this.callOptions(options, {
        maxTokens: 5,
        temperature: 0,
        // INTENT_CLASSIFIER_PROMPT is a large, static system prompt re-sent
        // on every turn — cache it (Anthropic; other providers ignore this
        // option, and OpenAI caches >=1024-token prefixes automatically).
        cacheControl: "system",
      })
    ) as Promise<LLMResult<IntentLabel>>;
  }

  // ── System prompt builder ─────────────────────────────────────────────────

  private buildSystemPromptMap() {
    const resume = resumeJsonToCompactPositional(this.resume);
    const jd = jobDetailsToCompactPositional(this.jobDetails);

    function replacePlaceholders(template: string) {
      return template.replace("{{resume}}", resume).replace("{{jd}}", jd);
    }

    return {
      [IntentLabel.Interview]: replacePlaceholders(INTERVIEW_PROMPT),
      [IntentLabel.Question]: replacePlaceholders(QUESTION_PROMPT),
      [IntentLabel.Other]: replacePlaceholders(QUESTION_PROMPT),
    } as const;
  }

  private getHistory(intent: ChatHistoryLabel): PromptMessage[] {
    return this.chatHistory[intent];
  }

  private pushToHistory(label: ChatHistoryLabel, ...messages: PromptMessage[]) {
    this.chatHistory[label].push(...messages);
  }

  private resetHistory(label: ChatHistoryLabel) {
    this.chatHistory[label] = [];
  }

  /**
   * Apply a batch of path-targeted ops to `resume`. Never throws — a bad op
   * (invalid path, schema-invalid result) lands in `rejected` with a reason
   * and every other op still gets a chance to apply.
   */
  applyEdits(
    resume: ResumeJSON,
    ops: ResumeOp[]
  ): {
    resume: ResumeJSON;
    applied: ResumeOp[];
    rejected: { op: ResumeOp; reason: string }[];
  } {
    return applyResumeOps(resume, ops);
  }

  async *chat(
    userInput: string,
    options: ChatBotOptions,
    confirmed = false
  ): AsyncGenerator<ChatStreamEvent> {
    this.isSessionInitialized();

    logger.info("ResumeChatBot", `chat() started — model: ${options.model}`);

    try {
      // 1. classify
      yield { type: "status", text: "Thinking…" };
      const { result: intent, usage: classifyUsage } =
        await this.classifyIntent(userInput, options);

      logger.info("ResumeChatBot", `Intent classified: ${intent}`);
      yield { type: "intent", intent };

      // "tailor"/"regenerate" rewrite the whole resume — require an explicit
      // confirm before running them, unlike a targeted "edit".
      if (
        !confirmed &&
        (intent === IntentLabel.Tailor || intent === IntentLabel.Regenerate)
      ) {
        yield { type: "confirm_required", intent };
        return;
      }

      yield { type: "status", text: INTENT_STATUS_TEXT[intent] };

      const map = this.buildSystemPromptMap();
      const history = this.getHistory("chat");
      const userMessage: PromptMessage = { role: "user", content: userInput };

      const messages: PromptMessage[] = [...history, userMessage];

      logger.info(
        "ResumeChatBot",
        `History depth: ${history.length} message(s) for intent "${intent}"`
      );

      // 2a. tool-calling intents — no text goes to chat
      if (isToolIntent(intent)) {
        yield* this.runToolIntent(intent, userMessage, options, messages);
        return;
      }

      // 2b. text intents — stream chunks to chat
      messages.unshift({ role: "system", content: map[intent] });
      this.pushToHistory("chat", userMessage);

      logger.info("ResumeChatBot", `Streaming response — intent: ${intent}`);

      let fullResponse = "";
      let chunkCount = 0;
      let streamUsage: LLMUsageInfo | undefined;

      const reasoningEffort = this.resolveReasoningEffort(options);

      const stream = textOnly(
        this.provider.runLLM(messages, {
          model: options.model,
          ...(reasoningEffort ? { reasoningEffort } : {}),
          maxTokens: 2000,
          stream: true,
          onUsage: (usage) => {
            logger.info(
              "ResumeChatBot",
              `Usage for intent ${intent}: ${JSON.stringify(usage)}`
            );
            streamUsage = usage;
          },
        })
      );

      for await (const chunk of stream) {
        fullResponse += chunk;
        chunkCount++;
        yield { type: "chunk", text: chunk };
      }

      if (intent === "other") {
        logger.warn(
          "ResumeChatBot",
          "LLM failed to classify intent, defaulting to 'other'"
        );
      } else {
        logger.info(
          "ResumeChatBot",
          `LLM response complete for intent "${intent}" — ${chunkCount} chunk(s), ${fullResponse.length} chars`
        );
      }

      logger.info(
        "ResumeChatBot",
        `Stream complete — ${chunkCount} chunk(s), ${fullResponse.length} chars`
      );

      this.pushToHistory("chat", userMessage, {
        role: "assistant",
        content: fullResponse,
      });

      const mergedUsage =
        classifyUsage && streamUsage
          ? mergeLLMUsageInfo(classifyUsage, streamUsage)
          : (classifyUsage ?? streamUsage);

      yield { type: "done", usage: mergedUsage };
    } catch (err) {
      logger.error(
        "ResumeChatBot",
        `chat() error: ${err instanceof Error ? err.message : String(err)}`
      );
      yield {
        type: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  private async *runToolIntent(
    intent: ToolIntent,
    userMessage: PromptMessage,
    options: ChatBotOptions,
    messages: PromptMessage[] = []
  ): AsyncGenerator<ChatStreamEvent> {
    this.isSessionInitialized();

    switch (intent) {
      case "regenerate": {
        logger.info(
          "ResumeChatBot",
          `Generating resume — intent: ${intent}, baseProfile: original`
        );

        yield {
          type: "status",
          text: "Rebuilding from your base profile…",
        };

        const { result, usage } = await domainOps.generateResume(
          this.provider,
          {
            baseProfile: this.baseProfile,
            jobDetails: this.jobDetails,
            atsAnalysis: this.atsAnalysis,
          },
          this.callOptions(options)
        );

        this.pushToHistory("chat", userMessage, {
          role: "assistant",
          content: `[${intent} applied]`,
        });

        logger.info(
          "ResumeChatBot",
          `Resume generated — usage: ${JSON.stringify(usage)}`
        );

        yield {
          type: "tool_result",
          intent: intent,
          args: {
            updatedResume: result,
            usage,
            note: "Resume regenerated based on original profile",
          },
        };
        yield { type: "done", usage };
        return;
      }
      case "tailor": {
        yield* this.runTailorIntent(userMessage, options);
        return;
      }
      case "ats": {
        logger.info(
          "ResumeChatBot",
          `Providing ATS advice — intent: ${intent}`
        );

        yield { type: "status", text: "Analyzing ATS compatibility…" };

        const { result, usage } = await domainOps.analyzeATS(
          this.provider,
          {
            resume: this.resume,
            jobDetails: this.jobDetails,
          },
          this.callOptions(options)
        );

        this.atsAnalysis = result;

        this.pushToHistory("chat", userMessage, {
          role: "assistant",
          content: `[${intent} applied]`,
        });

        logger.info(
          "ResumeChatBot",
          `ATS advice provided — usage: ${JSON.stringify(usage)}`
        );

        yield {
          type: "tool_result",
          intent: intent,
          args: { atsAnalysis: result, usage },
        };
        yield { type: "done", usage };
        return;
      }
      case "gap_analysis": {
        logger.info(
          "ResumeChatBot",
          `Analyzing resume-vs-JD gaps — intent: ${intent}`
        );

        yield { type: "status", text: "Analyzing your fit for this role…" };

        const { result, usage } = await domainOps.analyzeResumeGaps(
          this.provider,
          {
            resume: this.resume,
            jobDetails: this.jobDetails,
          },
          this.callOptions(options)
        );

        this.gapAnalysis = result;

        this.pushToHistory("chat", userMessage, {
          role: "assistant",
          content: `[${intent} applied]`,
        });

        logger.info(
          "ResumeChatBot",
          `Gap analysis complete — ${result.gaps.length} gap(s), usage: ${JSON.stringify(usage)}`
        );

        yield {
          type: "tool_result",
          intent: IntentLabel.GapAnalysis,
          args: {
            analysis: result,
            usage,
            note: result.verdict,
          },
        };
        yield { type: "done", usage };
        return;
      }
      case "fix_ats": {
        logger.info("ResumeChatBot", `Fixing ATS issues — intent: ${intent}`);

        let analysisUsage: LLMUsageInfo | undefined;
        let analysis = this.atsAnalysis;
        if (!analysis) {
          yield { type: "status", text: "Analyzing ATS compatibility…" };
          const { result, usage } = await domainOps.analyzeATS(
            this.provider,
            { resume: this.resume, jobDetails: this.jobDetails },
            this.callOptions(options)
          );
          this.atsAnalysis = result;
          analysis = result;
          analysisUsage = usage;
        }

        yield { type: "status", text: "Applying ATS fixes…" };

        this.pushToHistory("chat", userMessage, {
          role: "assistant",
          content: `[${intent} applied]`,
        });

        yield* this.fixAllAtsIssues(analysis, options, analysisUsage);
        return;
      }
      case "proofread": {
        logger.info("ResumeChatBot", `Proofreading resume — intent: ${intent}`);

        yield { type: "status", text: "Proofreading your resume…" };

        const { result, usage } = await domainOps.proofreadResume(
          this.provider,
          {
            resumeFull: this.resume,
            jobDetails: this.jobDetails,
            baseProfile: this.baseProfile,
          },
          this.callOptions(options)
        );

        // Only auto-apply the deterministic lint-sourced findings — those are
        // safe, mechanical fixes (stray artifacts, spacing, etc). Everything
        // the LLM judged (including errors and the provenance group) is
        // reported but left for the user to review in the Proofread drawer.
        const lintIssues = result.issues.filter(
          (issue) => issue.source === "lint"
        );
        const {
          resume: updatedResume,
          applied,
          unapplied,
        } = applyProofreadFixes(this.resume, lintIssues);

        const reviewCount = result.issues.length - applied.length;
        const note =
          applied.length > 0
            ? `Auto-fixed ${applied.length} formatting issue(s); ${reviewCount} more need your review in the Proofread panel.`
            : reviewCount > 0
              ? `Found ${reviewCount} issue(s) that need your review in the Proofread panel — nothing was auto-applied.`
              : "No issues found.";

        if (applied.length > 0) {
          this.resume = updatedResume;
        }

        this.pushToHistory("chat", userMessage, {
          role: "assistant",
          content: `[${intent} applied]`,
        });

        logger.info(
          "ResumeChatBot",
          `Proofread complete — ${result.issues.length} issue(s), ${applied.length} auto-applied, ${unapplied.length} unapplied lint fix(es), usage: ${JSON.stringify(usage)}`
        );

        yield {
          type: "tool_result",
          intent,
          args: {
            issues: result.issues,
            summary: result.summary,
            updatedResume: applied.length > 0 ? updatedResume : undefined,
            usage,
            note,
          },
        };
        yield { type: "done", usage };
        return;
      }
      case "edit": {
        yield* this.runEditIntent(messages, userMessage, options);
        return;
      }
      case "cover_letter": {
        logger.info(
          "ResumeChatBot",
          `Rewriting cover letter — intent: ${intent}`
        );

        yield { type: "status", text: "Rewriting your cover letter…" };

        // The style picked in the generate modal is never persisted (it's a
        // one-shot generation param, not stored on the job), so a chat
        // rewrite can't recover the user's original choice. Re-derive the
        // region-appropriate default instead of silently reverting a German
        // anschreiben letter to the standard English structure — see
        // resolveDefaultCoverLetterStyle.
        const { result, usage } = await domainOps.generateCoverLetter(
          this.provider,
          {
            jobDetails: this.jobDetails,
            resume: this.resume,
            customInstructions: userMessage.content,
            styleGuide: resolveCoverLetterStyleGuide(
              resolveDefaultCoverLetterStyle(this.jobDetails)
            ),
          },
          this.callOptions(options)
        );

        this.pushToHistory("chat", userMessage, {
          role: "assistant",
          content: `[${intent} applied]`,
        });

        logger.info(
          "ResumeChatBot",
          `Cover letter rewritten — usage: ${JSON.stringify(usage)}`
        );

        yield {
          type: "tool_result",
          intent: intent,
          args: {
            updatedCoverLetter: result,
            usage,
            note: "Cover letter rewritten based on your instructions",
          },
        };
        yield { type: "done", usage };
        return;
      }
      case "humanize": {
        logger.info(
          "ResumeChatBot",
          `Humanizing cover letter — intent: ${intent}`
        );

        yield { type: "status", text: "Removing AI-sounding phrasing…" };

        const { result, usage } = await domainOps.humanizeContent(
          this.provider,
          this.coverLetter,
          this.callOptions(options)
        );

        this.pushToHistory("chat", userMessage, {
          role: "assistant",
          content: `[${intent} applied]`,
        });

        logger.info(
          "ResumeChatBot",
          `Cover letter humanized — usage: ${JSON.stringify(usage)}`
        );

        yield {
          type: "tool_result",
          intent: intent,
          args: {
            updatedCoverLetter: result.rewritten,
            changes: result.changes,
            usage,
            note: "Cover letter rewritten to sound more natural",
          },
        };
        yield { type: "done", usage };
        return;
      }
      case "undo": {
        logger.info("ResumeChatBot", `Undo requested — intent: ${intent}`);

        // No LLM call — the UI layer owns the resume history stack (see
        // ResumeHistory/undoResume). We deliberately do NOT push this turn
        // to chat history: nothing was said to the model, so there's no
        // assistant turn to remember.
        yield {
          type: "tool_result",
          intent: intent,
          args: { note: "Reverting last change" },
        };
        yield { type: "done" };
        return;
      }
    }
  }

  private async *runEditIntent(
    messages: PromptMessage[],
    userMessage: PromptMessage,
    options: ChatBotOptions
  ): AsyncGenerator<ChatStreamEvent> {
    this.isSessionInitialized();
    // now intent = IntentLabel.Edit so we fall through to the edit flow which requires
    // an LLM call to get tool args, then another call to apply the tool result
    const tool = RESUME_TOOLS.edit;

    logger.info("ResumeChatBot", `Calling LLM with tool: ${tool.name}`);
    const prompt = PromptSystem.generatePrompt("extract_fields_to_edit", {
      userInput: userMessage.content,
    });

    yield {
      type: "status",
      text: "Working out which sections to change…",
    };

    // First we run the LLM to extract which fields to edit based on the user instruction
    const { result, usage: extractUsage } =
      await this.provider.runStructuredLLM(
        prompt,
        this.callOptions(options, { maxTokens: 500 }),
        EditFieldOutputSchema,
        "EditFieldOutputSchema"
      );

    const systemPrompt = buildEditFieldPrompt(
      this.resume,
      result,
      jobDetailsToCompactPositional(this.jobDetails)
    );

    messages.unshift({ role: "system", content: systemPrompt });

    yield { type: "status", text: "Writing the edit…" };

    // For edit_field we need to run the LLM to get the tool args, then apply the tool result to update resume state
    const { toolCalls, usage: editUsage } = await this.provider.runLLM(
      messages,
      this.callOptions(options, {
        tools: [tool],
        toolChoice: {
          type: "tool",
          name: tool.name,
        },
      })
    );

    if (!toolCalls || toolCalls.length === 0) {
      logger.error("ResumeChatBot", "LLM returned no tool calls");
      throw new Error(
        "LLM did not return any tool calls for an intent that requires it"
      );
    }

    const args = toolCalls?.[0].arguments;

    validateEditResumeArgs(args);

    logger.info(
      "ResumeChatBot",
      `Tool call received — ${args.ops.length} op(s): ${args.ops.map((o) => o.path).join(", ")}`
    );

    const {
      resume: updatedResume,
      applied,
      rejected,
    } = this.applyEdits(this.resume, args.ops);

    const note = buildOpsNote("Edit", applied, rejected);

    logger.info("ResumeChatBot", note);
    const editIntentUsage = mergeLLMUsageInfo(extractUsage, editUsage);
    yield {
      type: "tool_result",
      intent: IntentLabel.Edit,
      args: {
        updatedResume,
        usage: editIntentUsage,
        note,
        summary: args.change_summary,
        rejectedCount: rejected.length,
      },
    };

    this.pushToHistory("chat", userMessage, {
      role: "assistant",
      content: `[${IntentLabel.Edit} applied]`,
    });

    yield { type: "done", usage: editIntentUsage };
    return;
  }

  /**
   * Tailor intent — routes through the multi-agent pipeline (requirements →
   * rewrite → verify-against-original → score) instead of the single-shot
   * generateResume call, so tailored bullets get the anti-hallucination check.
   * Pipeline stage events are surfaced as status-line chunks in the same chat
   * bubble, ending in the usual tool_result the UI already knows how to apply.
   */
  private async *runTailorIntent(
    userMessage: PromptMessage,
    options: ChatBotOptions
  ): AsyncGenerator<ChatStreamEvent> {
    this.isSessionInitialized();

    for await (const event of this.runTailoringPipeline(options)) {
      switch (event.stage) {
        case "requirements":
          yield {
            type: "status",
            text: `Extracted ${event.requirements.length} job requirement(s)…`,
          };
          break;
        case "rewrite":
          yield {
            type: "status",
            text: `Rewriting bullets (pass ${event.iteration})…`,
          };
          break;
        case "verify":
          yield {
            type: "status",
            text:
              event.flags.length === 0
                ? "Verified against your original resume — no unsupported claims."
                : `Found ${event.flags.length} unsupported claim(s), rewriting again…`,
          };
          break;
        case "score":
          yield {
            type: "status",
            text: `ATS score: ${event.before} → ${event.after}`,
          };
          break;
        case "done": {
          this.pushToHistory("chat", userMessage, {
            role: "assistant",
            content: "[tailor applied]",
          });

          yield {
            type: "tool_result",
            intent: IntentLabel.Tailor,
            args: {
              updatedResume: event.updatedResume,
              usage: event.usage,
              note: `Resume tailored to job (ATS ${event.atsBefore} → ${event.atsAfter})`,
            },
          };
          yield { type: "done", usage: event.usage };
          return;
        }
        case "error":
          yield { type: "error", message: event.message };
          return;
      }
    }
  }

  /**
   * Shared second half of the "map findings → path-targeted ops" flow used by
   * both fixMissingKeywords and fixAllAtsIssues: apply the ops the mapping
   * call already produced. `notePrefix` labels the resulting note (e.g.
   * "Keyword fix" vs "ATS fix"); `usage` is the total usage of the mapping
   * call(s) that produced `ops` — there is no further LLM call here, `ops`
   * are applied directly via applyResumeOps, and any rejected op is surfaced
   * in the note instead of throwing and aborting the turn.
   */
  private async *applyFieldChanges(
    ops: ResumeOp[],
    notePrefix: string,
    usage: LLMUsageInfo,
    resultIntent: Extract<ToolIntent, "edit" | "fix_ats"> = IntentLabel.Edit
  ): AsyncGenerator<ChatStreamEvent> {
    this.isSessionInitialized();

    const {
      resume: updatedResume,
      applied,
      rejected,
    } = this.applyEdits(this.resume, ops);

    if (applied.length > 0) {
      this.resume = updatedResume;
    }

    const note = buildOpsNote(notePrefix, applied, rejected);

    logger.info("ResumeChatBot", note);

    // No LLM-authored change_summary for this path (ops come from a mapping
    // call, not a conversational tool call) — synthesize a friendly one so
    // the UI has something better than the raw path-list note to show.
    const summary =
      applied.length > 0
        ? `${notePrefix}: updated ${applied.length} item${applied.length === 1 ? "" : "s"}`
        : `${notePrefix}: no changes could be applied`;

    yield {
      type: "tool_result",
      intent: resultIntent,
      args: {
        updatedResume,
        usage,
        note,
        summary,
        rejectedCount: rejected.length,
      },
    };
    yield { type: "done", usage };
  }

  /**
   * One-click ATS keyword fix: intelligently maps each missing keyword to
   * path-targeted edit ops based on existing content, then applies them
   * directly — without fabricating experience.
   *
   * Flow:
   *  1. Keyword mapping LLM call — maps each keyword to op(s) targeting real paths
   *  2. applyFieldChanges        — applies the ops via applyResumeOps directly
   */
  async *fixMissingKeywords(
    keywords: string[],
    options: ChatBotOptions
  ): AsyncGenerator<ChatStreamEvent> {
    this.isSessionInitialized();

    if (keywords.length === 0) {
      yield { type: "done" };
      return;
    }

    try {
      // Step 1: Map each keyword to the best field(s) in the resume
      const mappingPrompt = buildKeywordMappingPrompt(
        this.resume,
        keywords,
        this.jobDetails
      );

      logger.info(
        "ResumeChatBot",
        `fixMissingKeywords — mapping ${keywords.length} keyword(s) to fields`
      );

      const { result: mapping, usage: mappingUsage } =
        await this.provider.runStructuredLLM(
          mappingPrompt,
          this.callOptions(options, { maxTokens: 800 }),
          AtsFixMappingSchema,
          "AtsFixMappingSchema"
        );

      if (mapping.ops.length === 0) {
        logger.warn(
          "ResumeChatBot",
          "fixMissingKeywords — no honest keyword anchors found; nothing to edit"
        );
        yield { type: "done" };
        return;
      }

      logger.info(
        "ResumeChatBot",
        `fixMissingKeywords — mapped to paths: ${mapping.ops.map((m) => m.path).join(", ")}`
      );

      // Step 2: apply the mapped ops directly
      yield* this.applyFieldChanges(
        mappingsToResumeOps(mapping.ops),
        "Keyword fix",
        mappingUsage
      );
    } catch (err) {
      logger.error(
        "ResumeChatBot",
        `fixMissingKeywords error: ${err instanceof Error ? err.message : String(err)}`
      );
      yield {
        type: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * One-click "fix everything the ATS analysis found": maps every missing
   * keyword, improvement suggestion, knockout risk, and title-alignment note
   * to path-targeted op(s) that can honestly address it, then applies them
   * in one pass via the same applyFieldChanges flow as fixMissingKeywords.
   */
  async *fixAllAtsIssues(
    analysis: ATSAnalysisJSON,
    options: ChatBotOptions,
    priorUsage?: LLMUsageInfo
  ): AsyncGenerator<ChatStreamEvent> {
    this.isSessionInitialized();

    const hasFindings =
      analysis.keyword_analysis.some((k) => k.match_type === "missing") ||
      analysis.improvements.length > 0 ||
      analysis.knockout_risks.length > 0 ||
      analysis.title_alignment.verdict !== "aligned";

    if (!hasFindings) {
      yield { type: "done", usage: priorUsage };
      return;
    }

    try {
      const mappingPrompt = buildAtsFixPrompt(
        this.resume,
        analysis,
        this.jobDetails
      );

      logger.info(
        "ResumeChatBot",
        "fixAllAtsIssues — mapping ATS findings to fields"
      );

      const { result: mapping, usage: mappingUsage } =
        await this.provider.runStructuredLLM(
          mappingPrompt,
          this.callOptions(options, { maxTokens: 1500 }),
          AtsFixMappingSchema,
          "AtsFixMappingSchema"
        );

      const usage = priorUsage
        ? mergeLLMUsageInfo(priorUsage, mappingUsage)
        : mappingUsage;

      if (mapping.ops.length === 0) {
        logger.warn(
          "ResumeChatBot",
          "fixAllAtsIssues — no honest anchors found for any finding; nothing to edit"
        );
        yield { type: "done", usage };
        return;
      }

      logger.info(
        "ResumeChatBot",
        `fixAllAtsIssues — mapped to paths: ${mapping.ops.map((m) => m.path).join(", ")}`
      );

      yield* this.applyFieldChanges(
        mappingsToResumeOps(mapping.ops),
        "ATS fix",
        usage,
        IntentLabel.FixAts
      );
    } catch (err) {
      logger.error(
        "ResumeChatBot",
        `fixAllAtsIssues error: ${err instanceof Error ? err.message : String(err)}`
      );
      yield {
        type: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
}

// TODO: yield LLM usage separately. Right now we merge the usage from the initial prompt to extract tool args and the final tool call that applies the edits, but it would be good to yield them separately so we can track how much usage is coming from the "thinking" part of the LLM vs the actual "doing" part of calling the tool.

export default ResumeChatBot;
