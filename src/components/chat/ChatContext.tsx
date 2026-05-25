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
  atsAnalysis: ATSAnalysisJSON | null;
  defaultView: ViewMode;
  setInput: (value: string) => void;
  handleSend: () => void;
  resetSession: () => void;
  setDefaultView: (view: ViewMode) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatContextProvider({ children }: { children: ReactNode }) {
  const {
    resume,
    profile,
    atsAnalysis: initialAtsAnalysis,
    job,
    updateResumeState,
  } = useJobPageContext();

  const { activeModelPair } = useModelStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProviderReady, setIsProviderReady] = useState(false);
  const [atsAnalysis, setAtsAnalysis] = useState<ATSAnalysisJSON | null>(
    initialAtsAnalysis
  );
  const botRef = useRef<ResumeChatBot | null>(null);
  const hasOpenedOnce = useRef(false);
  const [defaultView, setDefaultView] = useState<ViewMode>(
    !activeModelPair ? "settings" : "chat"
  );

  useEffect(() => {
    if (!activeModelPair) return;

    hasOpenedOnce.current = true;

    const [providerType, model] = activeModelPair;
    const bot = new ResumeChatBot(
      providerType,
      model,
      resume,
      job.details,
      profile
    );
    botRef.current = bot;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (bot.isProviderReady()) {
        setIsProviderReady(true);
        clearInterval(interval);
      } else if (attempts > 50) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [, activeModelPair, resume, job.details, profile]);

  useEffect(() => {
    if (!botRef.current) return;
    const currentResume = botRef.current.getResume();
    if (areJsonValuesEqual(currentResume, resume)) return;
    botRef.current.setResume(resume);
  }, [resume]);

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
    },
    [updateResumeState]
  );

  const handleSend = useCallback(async () => {
    if (!botRef.current || !activeModelPair || isLoading || !input.trim())
      return;

    const [providerType, model] = activeModelPair;
    const userText = input.trim();
    setInput("");
    setIsLoading(true);

    const userId = makeId();
    const assistantId = makeId();

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
                m.id === assistantId ? { ...m, intent: event.intent } : m
              )
            );
            break;

          case "chunk":
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + event.text }
                  : m
              )
            );
            break;

          case "tool_result": {
            const toolId = makeId();
            setMessages((prev) =>
              prev
                .filter((m) => m.id !== assistantId)
                .concat({
                  id: toolId,
                  role: "tool",
                  content:
                    event.intent !== "ats" ? (event.args.summary ?? "") : "",
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
                updateResumeStates(event.args.updatedResume, event.args.note);
                break;
            }
            break;
          }

          case "done":
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, isStreaming: false } : m
              )
            );
            break;

          case "error":
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
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
          m.id === assistantId
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
  }, [activeModelPair, input, isLoading, updateResumeStates]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        input,
        isLoading,
        isProviderReady,
        atsAnalysis,
        defaultView,
        setInput,
        handleSend,
        resetSession,
        setDefaultView,
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
