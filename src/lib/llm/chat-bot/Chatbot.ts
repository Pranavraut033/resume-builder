import { LLMUsageInfo } from "@/actions/tokenUsage";
import { ProviderFactory } from "@/lib/llm/providers";
import logger from "@/lib/logger";
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
import { PromptSystem } from "../prompts";
import { mergeLLMUsageInfo } from "../tokenTracker";
import { EditFieldOutputSchema } from "./prompts/extractFieldsToEdit";
import {
  IntentLabel,
  isToolIntent,
  ToolIntent,
} from "./prompts/intentClassifier";
import { FieldEdit, RESUME_TOOLS, validateEditFieldArgs } from "./tools";
import { LLMProvider } from "../providers/LLMProvider";

export type ChatBotOptions = {
  provider: ProviderType;
  model: string;
};

// what chat() yields to the caller
export type ChatStreamEvent =
  | { type: "intent"; intent: IntentLabel }
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
  | { type: "error"; message: string }
  | { type: "done" };

type ChatHistoryLabel = "intent" | "chat";

class ResumeChatBot {
  protected model: string;
  protected provider: LLMProvider | null = null;

  // stateful per-session data
  protected resume: ResumeJSON;
  protected jobDetails: JobDetailsJSON;
  private baseProfile: ResumeJSON;
  protected chatHistory: Record<ChatHistoryLabel, PromptMessage[]> = {
    chat: [],
    intent: [],
  };

  constructor(
    providerType: ProviderType,
    model: string,
    resume: ResumeJSON,
    jobDetails: JobDetailsJSON,
    baseProfile: ResumeJSON
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
  }

  setResume(resume: ResumeJSON) {
    this.resume = resume;
  }

  setJobDescription(jd: JobDetailsJSON) {
    this.jobDetails = jd;
  }

  resetSession(resume: ResumeJSON, jobDetails: JobDetailsJSON) {
    this.chatHistory = { chat: [], intent: [] };
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
  // ── Intent classification ─────────────────────────────────────────────────

  async classifyIntent(
    userInput: string,
    options: ChatBotOptions
  ): Promise<LLMResult<IntentLabel>> {
    this.isSessionInitialized();

    return this.provider.runLLM(
      [
        { role: "system", content: INTENT_CLASSIFIER_PROMPT },
        ...this.getHistory("intent"),
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
      const { result: intent } = await this.classifyIntent(userInput, options);

      logger.info("ResumeChatBot", `Intent classified: ${intent}`);
      yield { type: "intent", intent };

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

      const stream = this.provider.runLLM(messages, {
        model: options.model,
        maxTokens: 2000,
        stream: true,
        onUsage: (usage) => {
          logger.info(
            "ResumeChatBot",
            `Usage for intent ${intent}: ${JSON.stringify(usage)}`
          );
        },
      });

      for await (const chunk of stream) {
        fullResponse += chunk;
        chunkCount++;
        yield { type: "chunk", text: chunk };
      }

      if (intent === "other") {
        // For "other" intent, we want to accumulate the full response and user message as training data to help the model learn to classify better over time
        this.pushToHistory(
          "intent",
          { role: "user", content: userInput },
          { role: "assistant", content: fullResponse }
        );

        logger.warn(
          "ResumeChatBot",
          "LLM failed to classify intent, defaulting to 'other'"
        );
      } else {
        this.resetHistory("intent");
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

      yield { type: "done" };
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
      case "regenerate":
      case "tailor": {
        logger.info(
          "ResumeChatBot",
          `Generating resume — intent: ${intent}, baseProfile: ${intent === IntentLabel.Regenerate ? "original" : "current"}`
        );

        const { result, usage } = await this.provider.generateResume(
          {
            baseProfile:
              intent === IntentLabel.Regenerate
                ? this.baseProfile
                : this.resume,
            jobDetails: this.jobDetails,
            atsAnalysis: null,
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
            note: `Resume ${intent === IntentLabel.Regenerate ? "Regenerated based on original profile" : "Tailored based on current profile"}`,
          },
        };
        yield { type: "done" };
        return;
      }
      case "ats": {
        logger.info(
          "ResumeChatBot",
          `Providing ATS advice — intent: ${intent}`
        );

        const { result, usage } = await this.provider.analyzeATS(
          {
            resume: this.resume,
            jobDetails: this.jobDetails,
          },
          { model: options.model }
        );

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
        yield { type: "done" };
        return;
      }
      case "edit": {
        yield* this.runEditIntent(messages, userMessage, options);
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
    yield {
      type: "tool_result",
      intent: IntentLabel.Edit,
      args: {
        updatedResume,
        usage: mergeLLMUsageInfo(extractUsage, editUsage),
        note,
        summary: args.change_summary,
      },
    };

    this.pushToHistory("chat", userMessage, {
      role: "assistant",
      content: `[${IntentLabel.Edit} applied]`,
    });

    yield { type: "done" };
    return;
  }
}

// TODO: yield LLM usage separately. Right now we merge the usage from the initial prompt to extract tool args and the final tool call that applies the edits, but it would be good to yield them separately so we can track how much usage is coming from the "thinking" part of the LLM vs the actual "doing" part of calling the tool.

export default ResumeChatBot;
