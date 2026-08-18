import { LLMProvider, textOnly } from "@pranavraut033/llm-core";

import { LLMUsageInfo } from "@/actions/tokenUsage";
import { ProviderFactory } from "@/lib/llm/providers";
import logger from "@/lib/logger";
import { applyProofreadFixes } from "@/lib/proofread/applyFixes";
import { applyResumeOps, ResumeOp } from "@/lib/resume/editor";
import { useModelStore } from "@/store/modelStore";
import {
  DocumentAnalysisJSON,
  DocumentFinding,
} from "@/types/documentAnalysis";
import { FitCheckJSON } from "@/types/fitCheck";
import { HumanizerJSON } from "@/types/humanizer";
import {
  ProviderType,
  LLMResult,
  LLMGenerationOptions,
  ReasoningEffort,
  PromptMessage,
} from "@/types/llm";
import {
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
import { readLeafAtPath, countOccurrences } from "@/lib/proofread/applyFixes";
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
  [IntentLabel.DeepAnalysis]: "Reading your resume like an editor…",
  [IntentLabel.AlignTerms]: "Aligning your resume's wording with the job…",
  [IntentLabel.FitCheck]: "Checking how you fit this role…",
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
      intent: IntentLabel.DeepAnalysis;
      args: {
        analysis: DocumentAnalysisJSON;
        // Only present when the lint-sourced findings were auto-applied —
        // see the "deep_analysis" case's doc comment below.
        updatedResume?: ResumeJSON;
        usage: LLMUsageInfo;
        note: string;
      };
    }
  | {
      type: "tool_result";
      // Never mutates the resume — kept out of the shared
      // "regenerate" | "tailor" | "edit" | "align_terms" branch above on
      // purpose.
      intent: IntentLabel.FitCheck;
      args: { analysis: FitCheckJSON; usage: LLMUsageInfo; note: string };
    }
  | {
      type: "tool_result";
      intent: Extract<ToolIntent, "regenerate" | "tailor" | "edit">;
      args: {
        updatedResume: ResumeJSON;
        usage: LLMUsageInfo;
        note: string;
        summary?: string;
        /** Count of ops that couldn't be applied (schema-invalid path/value) — lets the UI show a friendly warning instead of silently looking identical to a full success. */
        rejectedCount?: number;
      };
    }
  | {
      type: "tool_result";
      // No LLM call of its own (see `alignResumeTerms`'s doc comment) —
      // `usage` is only present when the caller had to run a fresh
      // analyzeDocument first to get findings to align.
      intent: IntentLabel.AlignTerms;
      args: {
        updatedResume: ResumeJSON;
        usage?: LLMUsageInfo;
        note: string;
        summary?: string;
        /** Count of findings that couldn't be applied — either rejected by applyResumeOps, or filtered out for failing the additive-only check. */
        rejectedCount?: number;
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

// ── align_terms: additive-only term alignment ──────────────────────────────
//
// Mirrors src/mcp/guards.ts's `guardAlignOps`/`normalizeTokens` (kept in
// sync BY HAND — that server-side guard can't import this, it must never
// call an LLM and this module reaches into provider calls elsewhere): the
// finding is additive-only iff its `original`'s normalized word-token set is
// a STRICT SUBSET of its `suggestion`'s — i.e. the finding may only ADD an
// alternate surface form (an acronym, an expansion) on top of what's already
// there, never rewrite or replace the substance. A finding whose suggestion
// is "" (a deletion) is never additive by definition.
//
// Deep Analysis findings already carry a concrete `path` + `suggestion` (see
// templates/deep-analysis.ts's own worked examples, e.g. a CPA-acronym
// keyword finding), so unlike the old fix_ats flow this never re-prompts the
// model to re-derive ops from scratch — it filters and applies what
// analyzeDocument already produced.
function normalizeTokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  );
}

function isStrictSubset(a: Set<string>, b: Set<string>): boolean {
  if (a.size >= b.size) return false;
  for (const token of a) if (!b.has(token)) return false;
  return true;
}

function isAdditiveFinding(finding: DocumentFinding): boolean {
  if (!finding.suggestion) return false;
  return isStrictSubset(
    normalizeTokens(finding.original),
    normalizeTokens(finding.suggestion)
  );
}

/**
 * Resolve one additive finding into a verified ResumeOp against the CURRENT
 * resume — never trusts `finding.original` as ground truth for what's
 * actually at `finding.path` right now, and never overwrites a whole leaf
 * just because `suggestion` is the new value.
 *
 * `original` is documented (documentAnalysis.ts) as a VERBATIM SUBSTRING of
 * the resume, not necessarily the entire leaf — the acronym rule in
 * deep-analysis.ts explicitly expects findings like this to "fold into"
 * existing content (e.g. `original: "CPA"` inside a longer bullet). A naive
 * `{op:"replace", value: finding.suggestion}` would silently delete
 * everything else sharing that leaf whenever `original` isn't the whole
 * field. So a non-empty `original` gets the same splice-with-occurrence-
 * check treatment as applyFixes.ts's lint auto-apply: read the CURRENT leaf
 * text, require `original` to appear in it EXACTLY ONCE, and substitute only
 * that occurrence. Returns null (finding dropped, never a bad write) if the
 * leaf can't be read or the match isn't unique.
 *
 * An empty `original` is the one genuine exception — a brand-new insertion
 * (e.g. path "/skills/-") has no existing leaf to splice into, so it's a
 * real "add" with the suggestion as the whole new value.
 */
function resolveAlignOp(
  resume: ResumeJSON,
  finding: DocumentFinding
): ResumeOp | null {
  if (finding.original === "") {
    return { op: "add", path: finding.path, value: finding.suggestion };
  }

  const text = readLeafAtPath(resume, finding.path);
  if (text === null) return null;
  if (countOccurrences(text, finding.original) !== 1) return null;

  return {
    op: "replace",
    path: finding.path,
    value: text.replace(finding.original, finding.suggestion),
  };
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
  private documentAnalysis: DocumentAnalysisJSON | null = null;
  private fitCheck: FitCheckJSON | null = null;

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

  setDocumentAnalysis(analysis: DocumentAnalysisJSON | null) {
    this.documentAnalysis = analysis;
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
   * Resolves the lite/full prompt-depth preference the same way
   * resolveReasoningEffort/resolveTemperature/resolveTopP do. Only
   * `deep_analysis` reads this (see
   * src/lib/llm/prompts/templates/deep-analysis.ts's `{{#if fullMode}}`
   * block) — `align_terms` reuses whatever analysis is already cached
   * rather than resolving it again.
   */
  private resolvePromptDepth(options: ChatBotOptions): "lite" | "full" {
    return useModelStore
      .getState()
      .getPromptDepth(options.provider, options.model);
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
            atsAnalysis: this.documentAnalysis,
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
      case "deep_analysis": {
        logger.info(
          "ResumeChatBot",
          `Running deep analysis — intent: ${intent}`
        );

        yield { type: "status", text: "Reading your resume like an editor…" };

        const fullMode = this.resolvePromptDepth(options) === "full";
        const { result, usage } = await domainOps.analyzeDocument(
          this.provider,
          {
            resumeFull: this.resume,
            jobDetails: this.jobDetails,
            baseProfile: this.baseProfile,
          },
          { ...this.callOptions(options), fullMode }
        );

        this.documentAnalysis = result;

        // Only auto-apply the deterministic lint-sourced findings — those
        // are safe, mechanical fixes (stray artifacts, spacing, brand
        // casing, etc). Everything the LLM judged (including provenance and
        // content-quality findings) is reported but left for the user to
        // review in the Deep Analysis panel.
        const lintFindings = result.findings.filter(
          (finding) => finding.source === "lint"
        );
        const {
          resume: updatedResume,
          applied,
          unapplied,
        } = applyProofreadFixes(this.resume, lintFindings);

        const reviewCount = result.findings.length - applied.length;
        const note =
          applied.length > 0
            ? `Auto-fixed ${applied.length} formatting issue(s); ${reviewCount} more need your review in the Deep Analysis panel.`
            : reviewCount > 0
              ? `Found ${reviewCount} issue(s) that need your review in the Deep Analysis panel — nothing was auto-applied.`
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
          `Deep analysis complete — ${result.findings.length} finding(s), ${applied.length} auto-applied, ${unapplied.length} unapplied lint fix(es), usage: ${JSON.stringify(usage)}`
        );

        yield {
          type: "tool_result",
          intent,
          args: {
            analysis: result,
            updatedResume: applied.length > 0 ? updatedResume : undefined,
            usage,
            note,
          },
        };
        yield { type: "done", usage };
        return;
      }
      case "fit_check": {
        logger.info(
          "ResumeChatBot",
          `Checking fit for this role — intent: ${intent}`
        );

        yield { type: "status", text: "Checking how you fit this role…" };

        const { result, usage } = await domainOps.analyzeFit(
          this.provider,
          {
            resume: this.resume,
            jobDetails: this.jobDetails,
          },
          this.callOptions(options)
        );

        this.fitCheck = result;

        this.pushToHistory("chat", userMessage, {
          role: "assistant",
          content: `[${intent} applied]`,
        });

        logger.info(
          "ResumeChatBot",
          `Fit check complete — ${result.gaps.length} gap(s), fit_level: ${result.fit_level}, usage: ${JSON.stringify(usage)}`
        );

        yield {
          type: "tool_result",
          intent: IntentLabel.FitCheck,
          args: {
            analysis: result,
            usage,
            note: result.verdict,
          },
        };
        yield { type: "done", usage };
        return;
      }
      case "align_terms": {
        logger.info(
          "ResumeChatBot",
          `Aligning resume terms — intent: ${intent}`
        );

        let analysisUsage: LLMUsageInfo | undefined;
        let analysis = this.documentAnalysis;
        if (!analysis) {
          yield {
            type: "status",
            text: "Reading your resume like an editor…",
          };
          const fullMode = this.resolvePromptDepth(options) === "full";
          const { result, usage } = await domainOps.analyzeDocument(
            this.provider,
            {
              resumeFull: this.resume,
              jobDetails: this.jobDetails,
              baseProfile: this.baseProfile,
            },
            { ...this.callOptions(options), fullMode }
          );
          this.documentAnalysis = result;
          analysis = result;
          analysisUsage = usage;
        }

        yield {
          type: "status",
          text: "Aligning your resume's wording with the job…",
        };

        this.pushToHistory("chat", userMessage, {
          role: "assistant",
          content: `[${intent} applied]`,
        });

        yield* this.alignResumeTerms(analysis.findings, analysisUsage);
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
   * One-click "align resume terminology to the job": filters `findings` down
   * to the additive-only ones (see `isAdditiveFinding` above — every op may
   * only ADD an alternate surface form, never rewrite substance) and applies
   * them directly. No LLM call: Deep Analysis findings already carry a
   * concrete `path` + `suggestion`, so unlike the old fixMissingKeywords/
   * fixAllAtsIssues pair there's nothing left to re-derive — `priorUsage`
   * (if the caller just ran a fresh analyzeDocument to get `findings`) is
   * passed straight through since this step itself costs nothing.
   *
   * Pass `analysis.findings` for "align everything additive", or a
   * caller-filtered subset (e.g. only the findings a user checked in the
   * Deep Analysis panel) for a narrower selection.
   */
  async *alignResumeTerms(
    findings: DocumentFinding[],
    priorUsage?: LLMUsageInfo
  ): AsyncGenerator<ChatStreamEvent> {
    const usage = priorUsage;
    const additive = findings.filter(isAdditiveFinding);

    if (additive.length === 0) {
      yield {
        type: "tool_result",
        intent: IntentLabel.AlignTerms,
        args: {
          updatedResume: this.resume,
          usage,
          note: "No additive term alignments found — every remaining finding would change substance, not just terminology.",
          rejectedCount: findings.length,
        },
      };
      yield { type: "done", usage };
      return;
    }

    // Resolved and applied one finding at a time (not a single batch built
    // from the original resume) so two findings targeting the same leaf
    // compose correctly — the second finding's occurrence check must see
    // the first finding's already-spliced text, not the pre-edit original.
    let workingResume = this.resume;
    const applied: ResumeOp[] = [];
    const rejected: { op: ResumeOp; reason: string }[] = [];

    for (const finding of additive) {
      const op = resolveAlignOp(workingResume, finding);
      if (!op) {
        rejected.push({
          op: { op: "replace", path: finding.path, value: finding.suggestion },
          reason:
            "original text not found (or not unique) at this path in the current resume",
        });
        continue;
      }

      const result = applyResumeOps(workingResume, [op]);
      if (result.rejected.length > 0) {
        rejected.push({ op, reason: result.rejected[0].reason });
        continue;
      }

      workingResume = result.resume;
      applied.push(op);
    }

    const updatedResume = workingResume;
    if (applied.length > 0) {
      this.resume = updatedResume;
    }

    const note = buildOpsNote("Term alignment", applied, rejected);
    logger.info("ResumeChatBot", note);

    const summary =
      applied.length > 0
        ? `Term alignment: updated ${applied.length} item${applied.length === 1 ? "" : "s"}`
        : "Term alignment: no changes could be applied";

    yield {
      type: "tool_result",
      intent: IntentLabel.AlignTerms,
      args: {
        updatedResume,
        usage,
        note,
        summary,
        rejectedCount: rejected.length + (findings.length - additive.length),
      },
    };
    yield { type: "done", usage };
  }
}

// TODO: yield LLM usage separately. Right now we merge the usage from the initial prompt to extract tool args and the final tool call that applies the edits, but it would be good to yield them separately so we can track how much usage is coming from the "thinking" part of the LLM vs the actual "doing" part of calling the tool.

export default ResumeChatBot;
