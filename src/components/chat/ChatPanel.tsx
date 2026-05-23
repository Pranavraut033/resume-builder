"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";

import { ModelSelector } from "@/components/ModelSelector";
import { Icon } from "@/components/ui/Icon";
import cn from "@/lib/cn";
import { useModelStore } from "@/store/modelStore";
import { ATSAnalysisJSON } from "@/types/resume";

import { ChatMessageItem } from "./ChatMessage";
import { type ChatMessage } from "./types";
import ATSAnalysisPanel from "../ATSAnalysisPanel";
import { Button } from "../ui";

export type ViewMode = "chat" | "settings" | "ats";

interface ChatPanelProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isProviderReady: boolean;
  input: string;
  atsAnalysis: ATSAnalysisJSON | null;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onClose: () => void;
  defaultView?: ViewMode;
}

export function ChatPanel({
  messages,
  isLoading,
  isProviderReady,
  input,
  atsAnalysis,
  onInputChange,
  onSend,
  onClose,
  defaultView = "chat",
}: ChatPanelProps) {
  const [view, setView] = useState<ViewMode>(defaultView);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeModelPair = useModelStore((state) => state.activeModelPair);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Switch to chat view when defaultView changes to 'chat'
  useEffect(() => {
    setView(defaultView);
  }, [defaultView]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  const canSend = !isLoading && isProviderReady && input.trim().length > 0;

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) onSend();
    }
  }

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl"
      style={{
        width: 360,
        height: 520,
        background: "var(--color-agent-surface-lowest)",
        border: "1px solid var(--color-agent-outline-variant)",
        boxShadow: "var(--shadow-agent-modal)",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="flex shrink-0 items-center gap-2 px-4 py-3"
        style={{
          borderBottom: "1px solid var(--color-agent-outline-variant)",
          background: "var(--color-agent-surface-low)",
        }}
      >
        <span
          className="mr-auto text-sm font-semibold tracking-tight"
          style={{
            color: "var(--color-agent-on-surface)",
            fontFamily: "var(--font-mono)",
          }}
        >
          Resume AI
        </span>
        {/*Ats analysis result is present, show an "ATS Analysis" badge in the header*/}
        {atsAnalysis && (
          <button
            type="button"
            title="View ATS analysis"
            onClick={() => setView("ats")}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              {
                "bg-agent-primary text-agent-on-primary": view === "ats",
                "text-agent-on-surface-variant bg-transparent": view !== "ats",
              }
            )}
          >
            <Icon name="cpu" className="h-3.5 w-3.5" />
          </button>
        )}
        {/* Settings toggle */}
        <button
          type="button"
          title="Settings"
          onClick={() =>
            setView((v) => (v === "settings" ? "chat" : "settings"))
          }
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            {
              "bg-agent-primary text-agent-on-primary": view === "settings",
              "text-agent-on-surface-variant bg-transparent":
                view !== "settings",
            }
          )}
        >
          <Icon name="settings" className="h-3.5 w-3.5" />
        </button>

        {/* Close */}
        <button
          type="button"
          title="Close"
          onClick={onClose}
          className="hover:bg-agent-surface-high flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          style={{ color: "var(--color-agent-on-surface-variant)" }}
        >
          <Icon name="x" className="h-3.5 w-3.5" />
        </button>
      </div>
      {view === "ats" && atsAnalysis && (
        <div className="flex-1 overflow-y-auto">
          <ATSAnalysisPanel atsAnalysis={atsAnalysis} standalone />
        </div>
      )}
      {/* ── Settings view ───────────────────────────────────────────────── */}
      {view === "settings" && (
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <p
            className="mb-4 text-xs font-semibold tracking-widest uppercase"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Model
          </p>
          <ModelSelector variant="compact" className="w-full" />

          <p
            className="mt-6 mb-4 text-xs leading-relaxed"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            The selected model will be used for all chat operations in this
            session. Switch back to chat to start talking.
          </p>

          <button
            type="button"
            onClick={() => setView("chat")}
            className="mt-2 flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
            style={{ color: "var(--color-agent-primary)" }}
          >
            <Icon name="arrowLeft" className="h-3 w-3" />
            Back to chat
          </button>
        </div>
      )}

      {/* ── Chat view ───────────────────────────────────────────────────── */}
      {view === "chat" && (
        <>
          {/* Message list */}
          <div className="flex-1 overflow-y-auto py-2">
            {messages.length === 0 ? (
              <div
                className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center"
                style={{ color: "var(--color-agent-on-surface-variant)" }}
              >
                <Icon
                  name="messageCircle"
                  className="mb-1 h-8 w-8 opacity-20"
                />
                <p className="text-xs leading-relaxed opacity-70">
                  Ask me to edit your resume, prep for interviews, or tailor it
                  to the job description.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <ChatMessageItem key={msg.id} message={msg} />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Input bar ─────────────────────────────────────────────── */}
          <div
            className="shrink-0 px-3 pt-2 pb-3"
            style={{
              borderTop: "1px solid var(--color-agent-outline-variant)",
            }}
          >
            {isProviderReady ? (
              <p className="text-agent-on-surface-variant mb-2 text-[10px]">
                Using {activeModelPair?.[1]} [{activeModelPair?.[0]}]{" "}
                <Button
                  size="sm"
                  onClick={() => setView("settings")}
                  className="p-0.5 px-1 text-[10px]"
                >
                  switch
                </Button>
              </p>
            ) : (
              <p className="text-agent-on-surface-variant mb-2 text-[10px]">
                Initializing model…
              </p>
            )}
            <div className="bg-agent-surface-container border-agent-outline-variant flex items-end gap-2 rounded-lg border px-3 py-2">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading || !isProviderReady}
                placeholder="Ask anything about your resume…"
                className="text-agent-on-surface max-h-30 flex-1 resize-none overflow-y-auto bg-transparent font-sans text-sm leading-relaxed outline-none placeholder:opacity-40 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={onSend}
                disabled={!canSend}
                className="bg-agent-primary text-agent-on-primary mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all disabled:opacity-30"
              >
                {isLoading ? (
                  <Icon
                    name="loaderCircle"
                    className="h-3.5 w-3.5 animate-spin"
                  />
                ) : (
                  <Icon name="arrowUp" className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
            <p
              className="mt-1.5 px-0.5 text-[10px]"
              style={{
                color: "var(--color-agent-on-surface-variant)",
                opacity: 0.4,
              }}
            >
              Enter to send · Shift+Enter for newline
            </p>
          </div>
        </>
      )}
    </div>
  );
}
