"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { useJobPageContext } from "@/contexts/JobPageContext";
import { areJsonValuesEqual } from "@/lib";
import ResumeChatBot from "@/lib/llm/chat-bot/Chatbot";
import { useModelStore } from "@/store/modelStore";
import { ATSAnalysisJSON, ResumeSchema } from "@/types/resume";

import { ChatPanel, ViewMode } from "./ChatPanel";
import { type ChatMessage } from "./types";

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function now() {
  return new Date();
}

export function ChatFAB() {
  const {
    resume,
    profile,
    atsAnalysis: initialAtsAnalysis,
    job,
    updateResumeState,
  } = useJobPageContext();
  const { activeModelPair } = useModelStore();

  const [isOpen, setIsOpen] = useState(false);
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
    if (!isOpen || hasOpenedOnce.current || !activeModelPair) return;
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

    // The bot initialises its provider asynchronously in its constructor.
    // Poll until the provider field is non-null (max ~5 s).
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
  }, [isOpen, activeModelPair, resume, job.details, profile]);

  useEffect(() => {
    if (!botRef.current) return;
    const currentResume = botRef.current.getResume();
    if (areJsonValuesEqual(currentResume, resume)) return; // no changes, skip
    botRef.current.setResume(resume);
  }, [resume]);

  // ── Reinitialise when model changes ────────────────────────────────────
  useEffect(() => {
    if (!activeModelPair || !hasOpenedOnce.current) return;
    const [providerType, model] = activeModelPair;
    botRef.current?.initializeSession(model, resume, job.details, providerType);
  }, [activeModelPair, resume, job.details]);

  useEffect(() => {
    if (isOpen) return;

    botRef.current?.resetSession(resume, job.details);
  }, [isOpen, resume, job.details]);

  // ── Panel open/close ───────────────────────────────────────────────────
  function handleOpen() {
    setIsOpen(true);
  }

  function handleClose() {
    setIsOpen(false);
    setMessages([]);
    setInput("");
  }

  const updateResumeStates = useCallback(
    (data: unknown, note: string) => {
      const updatedResume = ResumeSchema.parse(data);
      updateResumeState(updatedResume, note);
      botRef.current?.setResume(updatedResume);
    },
    [updateResumeState]
  );

  // ── Send message ───────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!botRef.current || !activeModelPair || isLoading || !input.trim())
      return;

    const [providerType, model] = activeModelPair;

    const userText = input.trim();
    setInput("");
    setIsLoading(true);

    // Push user message
    const userId = makeId();
    const assistantId = makeId();

    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: userText, timestamp: now() },
      // Optimistic assistant placeholder
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
            // Replace the streaming placeholder with a finalised tool message
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
              case "regenerate": {
                updateResumeStates(event.args.updatedResume, event.args.note);
                break;
              }
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

  // ── Default panel view: settings if no model selected ──────────────────

  return (
    <div className="fixed right-6 bottom-6 z-50 flex flex-col items-end gap-3">
      {/* Floating panel */}
      <div
        className="origin-bottom-right transition-all duration-200"
        style={{
          opacity: isOpen ? 1 : 0,
          transform: isOpen
            ? "scale(1) translateY(0)"
            : "scale(0.95) translateY(8px)",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        {isOpen && (
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            isProviderReady={isProviderReady}
            input={input}
            atsAnalysis={atsAnalysis}
            onInputChange={setInput}
            onSend={handleSend}
            onClose={handleClose}
            defaultView={defaultView}
          />
        )}
      </div>

      {/* FAB */}
      <button
        type="button"
        title={isOpen ? "Close AI chat" : "Open AI chat"}
        onClick={isOpen ? handleClose : handleOpen}
        className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: isOpen
            ? "var(--color-agent-surface-high)"
            : "var(--color-agent-primary)",
          color: isOpen
            ? "var(--color-agent-on-surface)"
            : "var(--color-agent-on-primary)",
          boxShadow: "var(--shadow-agent-float)",
        }}
      >
        <Icon
          name={isOpen ? "circleX" : "sparkles"}
          className="h-5 w-5 transition-transform duration-200"
        />
      </button>
    </div>
  );
}
