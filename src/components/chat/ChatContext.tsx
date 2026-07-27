"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useJobPageContext } from "@/contexts/JobPageContext";
import { areJsonValuesEqual } from "@/lib";
import ResumeChatBot from "@/lib/llm/chat-bot/Chatbot";
import { trackTokenUsage } from "@/lib/llm/tokenTracker";
import { useModelStore } from "@/store/modelStore";
import { ATSAnalysisJSON, ResumeSchema } from "@/types/resume";

import { type ViewMode } from "./ChatPanel";
import { type ChatMessage } from "./types";

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function now() {
  return new Date();
}

interface ChatContextType {
  messages: ChatMessage[];
  input: string;
  isLoading: boolean;
  isProviderReady: boolean;
  providerError: string | null;
  retryProviderInit: () => void;
  atsAnalysis: ATSAnalysisJSON | null;
  defaultView: ViewMode;
  setInput: (value: string) => void;
  handleSend: () => void;
  retryMessage: (id: string) => void;
  resetSession: () => void;
  setDefaultView: (view: ViewMode) => void;
  fixMissingKeywords: (keywords: string[]) => Promise<void>;
  fixAllAtsIssues: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatContextProvider({ children }: { children: ReactNode }) {
  const {
    resume,
    profile,
    atsAnalysis: initialAtsAnalysis,
    job,
    coverLetter,
    customization,
    updateResumeState,
    updateCoverLetterState,
    undoResume,
    saveToDb,
  } = useJobPageContext();

  const { activeModelPair } = useModelStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProviderReady, setIsProviderReady] = useState(false);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [atsAnalysis, setAtsAnalysis] = useState<ATSAnalysisJSON | null>(
    initialAtsAnalysis
  );
  const botRef = useRef<ResumeChatBot | null>(null);
  const hasOpenedOnce = useRef(false);
  const [defaultView, setDefaultView] = useState<ViewMode>(
    !activeModelPair ? "settings" : "chat"
  );

  const retryProviderInit = useCallback(() => {
    setProviderError(null);
    setRetryNonce((n) => n + 1);
  }, []);

  // Constructs the bot once per model selection (or retry) — NOT on every
  // resume/job.details/profile change. Rebuilding on every resume edit would
  // wipe chatHistory each time the chatbot itself makes an edit; the effects
  // below keep the bot's resume/JD in sync without losing conversation memory.
  useEffect(() => {
    if (!activeModelPair) return;

    hasOpenedOnce.current = true;
    setIsProviderReady(false);
    setProviderError(null);

    const [providerType, model] = activeModelPair;
    const bot = new ResumeChatBot(
      providerType,
      model,
      resume,
      job.details,
      profile,
      coverLetter
    );
    bot.setAtsAnalysis(initialAtsAnalysis);
    botRef.current = bot;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (bot.isProviderReady()) {
        setIsProviderReady(true);
        clearInterval(interval);
      } else if (attempts > 50) {
        clearInterval(interval);
        setProviderError(
          `Couldn't connect to ${providerType}. Check your API key/settings and retry.`
        );
      }
    }, 100);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModelPair, retryNonce]);

  useEffect(() => {
    if (!botRef.current) return;
    const currentResume = botRef.current.getResume();
    if (areJsonValuesEqual(currentResume, resume)) return;
    botRef.current.setResume(resume);
  }, [resume]);

  useEffect(() => {
    if (!botRef.current) return;
    botRef.current.setCoverLetter(coverLetter);
  }, [coverLetter]);

  useEffect(() => {
    if (!activeModelPair || !hasOpenedOnce.current) return;
    const [providerType, model] = activeModelPair;
    botRef.current?.initializeSession(model, resume, job.details, providerType);
  }, [activeModelPair, resume, job.details]);

  const resetSession = useCallback(() => {
    botRef.current?.resetSession(resume, job.details);
    setMessages([]);
    setInput("");
  }, [resume, job.details]);

  const updateResumeStates = useCallback(
    (data: unknown, note: string) => {
      const updatedResume = ResumeSchema.parse(data);
      updateResumeState(updatedResume, note);
      botRef.current?.setResume(updatedResume);
      // Persist AI edits immediately (updateResumeAction snapshots the prior
      // version), instead of leaving them stranded in memory until a manual save.
      saveToDb("resume", updatedResume, customization);
    },
    [updateResumeState, saveToDb, customization]
  );

  const fixMissingKeywords = useCallback(
    async (keywords: string[]) => {
      if (!botRef.current || !activeModelPair || isLoading) return;
      const [providerType, model] = activeModelPair;
      setIsLoading(true);
      try {
        const stream = botRef.current.fixMissingKeywords(keywords, {
          provider: providerType,
          model,
        });
        for await (const event of stream) {
          if (event.type === "tool_result" && event.intent === "edit") {
            const usage = event.args.usage;
            trackTokenUsage(usage);
            updateResumeStates(event.args.updatedResume, event.args.note);
            setMessages((prev) => [
              ...prev,
              {
                id: makeId(),
                role: "tool",
                content: event.args.summary ?? "",
                toolResult: { intent: event.intent, args: event.args },
                timestamp: now(),
              },
            ]);
          }
          if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: "assistant",
            content: "",
            timestamp: now(),
            error:
              err instanceof Error
                ? err.message
                : "Failed to fix missing keywords",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [activeModelPair, isLoading, updateResumeStates]
  );

  const fixAllAtsIssues = useCallback(async () => {
    if (!botRef.current || !activeModelPair) return;
    if (isLoading) {
      // Unlike fixMissingKeywords, we don't silently no-op here — a caller
      // showing a success toast for a fix that never ran would be worse than
      // a clear rejection (see plan's "known trap" note).
      throw new Error("Already busy — wait for the current action to finish.");
    }
    if (!atsAnalysis) {
      throw new Error("Generate an ATS analysis before fixing all issues.");
    }
    const [providerType, model] = activeModelPair;
    setIsLoading(true);
    try {
      const stream = botRef.current.fixAllAtsIssues(atsAnalysis, {
        provider: providerType,
        model,
      });
      for await (const event of stream) {
        if (event.type === "tool_result" && event.intent === "fix_ats") {
          const usage = event.args.usage;
          trackTokenUsage(usage);
          updateResumeStates(event.args.updatedResume, event.args.note);
          setMessages((prev) => [
            ...prev,
            {
              id: makeId(),
              role: "tool",
              content: event.args.summary ?? "",
              toolResult: { intent: event.intent, args: event.args },
              timestamp: now(),
            },
          ]);
        }
        if (event.type === "error") {
          throw new Error(event.message);
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          content: "",
          timestamp: now(),
          error:
            err instanceof Error ? err.message : "Failed to fix ATS issues",
        },
      ]);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [activeModelPair, isLoading, atsAnalysis, updateResumeStates]);

  const updateCoverLetterStates = useCallback(
    (updatedCoverLetter: string) => {
      updateCoverLetterState(updatedCoverLetter);
      botRef.current?.setCoverLetter(updatedCoverLetter);
      saveToDb("coverLetter", updatedCoverLetter, customization);
    },
    [updateCoverLetterState, saveToDb, customization]
  );

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!botRef.current || !activeModelPair || isLoading || !userText.trim())
        return;

      const [providerType, model] = activeModelPair;
      setIsLoading(true);

      const userId = makeId();
      const assistantId = makeId();
      // Tracks whichever message id currently represents this turn — starts as
      // the assistant placeholder, and becomes the tool-result message id once
      // a tool_result event replaces it (so "done" can attach usage to it).
      let currentId = assistantId;

      setMessages((prev) => [
        ...prev,
        { id: userId, role: "user", content: userText, timestamp: now() },
        {
          id: assistantId,
          role: "assistant",
          content: "",
          isStreaming: true,
          timestamp: now(),
        },
      ]);

      try {
        const stream = botRef.current.chat(userText, {
          provider: providerType,
          model,
        });

        for await (const event of stream) {
          switch (event.type) {
            case "intent":
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === currentId ? { ...m, intent: event.intent } : m
                )
              );
              break;

            case "status":
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === currentId ? { ...m, statusText: event.text } : m
                )
              );
              break;

            case "chunk":
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === currentId
                    ? {
                        ...m,
                        content: m.content + event.text,
                        statusText: undefined,
                      }
                    : m
                )
              );
              break;

            case "tool_result": {
              const toolId = makeId();
              currentId = toolId;
              setMessages((prev) =>
                prev
                  .filter((m) => m.id !== assistantId)
                  .concat({
                    id: toolId,
                    role: "tool",
                    content:
                      event.intent === "edit" ||
                      event.intent === "tailor" ||
                      event.intent === "regenerate" ||
                      event.intent === "fix_ats"
                        ? (event.args.summary ?? "")
                        : event.intent === "proofread"
                          ? event.args.note
                          : "",
                    toolResult: { intent: event.intent, args: event.args },
                    timestamp: now(),
                  })
              );

              switch (event.intent) {
                case "ats":
                  setAtsAnalysis(event.args.atsAnalysis);
                  setDefaultView("ats");
                  break;
                case "edit":
                case "tailor":
                case "regenerate":
                case "fix_ats":
                  updateResumeStates(event.args.updatedResume, event.args.note);
                  break;
                case "proofread":
                  if (event.args.updatedResume) {
                    updateResumeStates(event.args.updatedResume, event.args.note);
                  }
                  break;
                case "cover_letter":
                case "humanize":
                  updateCoverLetterStates(event.args.updatedCoverLetter);
                  break;
                case "undo":
                  undoResume();
                  break;
              }
              break;
            }

            case "done":
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === currentId
                    ? { ...m, isStreaming: false, usage: event.usage }
                    : m
                )
              );
              break;

            case "error":
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === currentId
                    ? { ...m, isStreaming: false, error: event.message }
                    : m
                )
              );
              break;
          }
        }
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === currentId
              ? {
                  ...m,
                  isStreaming: false,
                  error:
                    err instanceof Error ? err.message : "Something went wrong",
                }
              : m
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      activeModelPair,
      isLoading,
      updateResumeStates,
      updateCoverLetterStates,
      undoResume,
    ]
  );

  const handleSend = useCallback(() => {
    const userText = input.trim();
    if (!userText) return;
    setInput("");
    void sendMessage(userText);
  }, [input, sendMessage]);

  const retryMessage = useCallback(
    (id: string) => {
      const failedIndex = messages.findIndex((m) => m.id === id);
      if (failedIndex === -1 || !messages[failedIndex].error) return;

      const priorUser = [...messages.slice(0, failedIndex)]
        .reverse()
        .find((m) => m.role === "user");
      if (!priorUser) return;

      setMessages((prev) => prev.filter((m) => m.id !== id));
      void sendMessage(priorUser.content);
    },
    [messages, sendMessage]
  );

  return (
    <ChatContext.Provider
      value={{
        messages,
        input,
        isLoading,
        isProviderReady,
        providerError,
        retryProviderInit,
        atsAnalysis,
        defaultView,
        setInput,
        handleSend,
        retryMessage,
        resetSession,
        setDefaultView,
        fixMissingKeywords,
        fixAllAtsIssues,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext(silent: true): ChatContextType | null;

export function useChatContext(silent?: false): ChatContextType;

export function useChatContext(silent?: boolean): ChatContextType | null {
  const context = useContext(ChatContext);

  if (!context && !silent) {
    throw new Error("useChatContext must be used within ChatContextProvider");
  }

  return context;
}
