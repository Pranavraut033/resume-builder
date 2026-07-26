import { LLMProvider, textOnly } from "@pranavraut033/llm-core";

import { LLMUsageInfo } from "@/actions/tokenUsage";
import { ProviderFactory } from "@/lib/llm/providers";
import logger from "@/lib/logger";
import { HumanizerJSON } from "@/types/humanizer";
import { ProviderType, LLMResult, PromptMessage } from "@/types/llm";
import {
  ATSAnalysisJSON,
  JobDetailsJSON,
  jobDetailsToCompactPositional,
  ResumeJSON,
  resumeJsonToCompactPositional,
  ResumeSchema,
} from "@/types/resume";

import {
  buildEditFieldPrompt,
  INTENT_CLASSIFIER_PROMPT,
  INTERVIEW_PROMPT,
  QUESTION_PROMPT,
} from "./prompts";
import * as domainOps from "../domainOps";
import { PromptSystem } from "../prompts";
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
  buildKeywordMappingPrompt,
  groupMappingsByField,
  KeywordMappingSchema,
} from "./prompts/keywordMappingPrompt";
import { FieldEdit, RESUME_TOOLS, validateEditFieldArgs } from "./tools";

export type ChatBotOptions = {
  provider: ProviderType;
  model: string;
};

// per-intent status narration shown immediately after intent classification
const INTENT_STATUS_TEXT: Record<IntentLabel, string> = {
  [IntentLabel.Edit]: "Editing your resume…",
  [IntentLabel.Regenerate]: "Rebuilding your resume…",
  [IntentLabel.Tailor]: "Tailoring to the job…",
  [IntentLabel.Ats]: "Analyzing ATS compatibility…",
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
  | { type: "chunk"; text: string } // interview / question text chunks
  | {
      type: "tool_result";
      intent: IntentLabel.Ats;
      args: { atsAnalysis: ATSAnalysisJSON; usage: LLMUsageInfo };
    }
  | {
      type: "tool_result";
      intent: Extract<ToolIntent, "regenerate" | "tailor" | "edit">;
      args: {
        updatedResume: ResumeJSON;
        usage: LLMUsageInfo;
        note: string;
        summary?: string;
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
      options,
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
      { model: options.model, maxTokens: 5, temperature: 0 }
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

  applyEdits(resume: ResumeJSON, edits: FieldEdit[]): { resume: ResumeJSON } {
    const seen = new Set<string>();

    let updated = { ...resume };

    for (const edit of edits) {
      if (seen.has(edit.field)) {
        console.warn(
          `Duplicate edit for field "${edit.field}" — last one wins`
        );
      }
      seen.add(edit.field);

      // Validate against the Zod schema for this field before applying
      const fieldSchema = ResumeSchema.shape[edit.field];
      const parsed = fieldSchema.safeParse(edit.updated_content);
      if (!parsed.success) {
        throw new Error(
          `Model returned invalid content for field "${edit.field}": ` +
            parsed.error.message
        );
      }

      updated = { ...updated, [edit.field]: parsed.data };
    }

    return { resume: updated };
  }

  async *chat(
    userInput: string,
    options: ChatBotOptions
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

      const stream = textOnly(
        this.provider.runLLM(messages, {
          model: options.model,
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
          { model: options.model }
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
          { model: options.model }
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

        const { result, usage } = await domainOps.generateCoverLetter(
          this.provider,
          {
            jobDetails: this.jobDetails,
            resume: this.resume,
            customInstructions: userMessage.content,
            styleGuide: undefined,
          },
          { model: options.model }
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
          { model: options.model }
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
        { model: options.model, maxTokens: 500 },
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
      {
        model: options.model,
        tools: [tool],
        toolChoice: {
          type: "tool",
          name: tool.name,
        },
      }
    );

    if (!toolCalls || toolCalls.length === 0) {
      logger.error("ResumeChatBot", "LLM returned no tool calls");
      throw new Error(
        "LLM did not return any tool calls for an intent that requires it"
      );
    }

    const args = toolCalls?.[0].arguments;

    validateEditFieldArgs(args);

    logger.info(
      "ResumeChatBot",
      `Tool call received — ${args.edits.length} fields: ${String(args.edits.map((a) => a.field).join(", "))}`
    );

    const { resume: updatedResume } = this.applyEdits(this.resume, args.edits);

    const note = `Edit applied to resume field: ${String(args.edits.map((a) => a.field).join(", "))}`;

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
   * One-click ATS keyword fix: intelligently maps each missing keyword to the
   * most appropriate resume field(s) based on existing content, then applies
   * targeted edits via the edit_fields tool — without fabricating experience.
   *
   * Flow:
   *  1. Keyword mapping LLM call  — decides which field each keyword belongs to
   *  2. Build EditFieldOutput     — groups by field with per-keyword instructions
   *  3. edit_fields tool call     — applies the edits via buildEditFieldPrompt
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
      const jd = jobDetailsToCompactPositional(this.jobDetails);

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
          { model: options.model, maxTokens: 800 },
          KeywordMappingSchema,
          "KeywordMappingSchema"
        );

      if (mapping.mappings.length === 0) {
        logger.warn(
          "ResumeChatBot",
          "fixMissingKeywords — no honest keyword anchors found; nothing to edit"
        );
        yield { type: "done" };
        return;
      }

      logger.info(
        "ResumeChatBot",
        `fixMissingKeywords — mapped to fields: ${[...new Set(mapping.mappings.map((m) => m.field))].join(", ")}`
      );

      // Step 2: Build EditFieldOutput grouped by field (skips extractFieldsToEdit)
      const fieldEdits = groupMappingsByField(mapping.mappings);
      const editFieldOutput = { edits: fieldEdits };

      // Step 3: Build system prompt and call the edit_fields tool
      const systemPrompt = buildEditFieldPrompt(
        this.resume,
        editFieldOutput,
        jd
      );
      const tool = RESUME_TOOLS.edit;

      const messages: PromptMessage[] = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            "Apply the keyword edits as instructed. Return all edited fields in full.",
        },
      ];

      const { toolCalls, usage: editUsage } = await this.provider.runLLM(
        messages,
        {
          model: options.model,
          tools: [tool],
          toolChoice: { type: "tool", name: tool.name },
        }
      );

      if (!toolCalls || toolCalls.length === 0) {
        throw new Error("LLM did not return any tool calls for keyword fix");
      }

      const args = toolCalls[0].arguments;
      validateEditFieldArgs(args);

      const { resume: updatedResume } = this.applyEdits(
        this.resume,
        args.edits
      );
      const note = `Keyword fix applied to: ${args.edits.map((e) => e.field).join(", ")}`;

      logger.info("ResumeChatBot", note);

      yield {
        type: "tool_result",
        intent: IntentLabel.Edit,
        args: {
          updatedResume,
          usage: mergeLLMUsageInfo(mappingUsage, editUsage),
          note,
          summary: args.change_summary,
        },
      };
      yield { type: "done" };
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
}

// TODO: yield LLM usage separately. Right now we merge the usage from the initial prompt to extract tool args and the final tool call that applies the edits, but it would be good to yield them separately so we can track how much usage is coming from the "thinking" part of the LLM vs the actual "doing" part of calling the tool.

export default ResumeChatBot;
