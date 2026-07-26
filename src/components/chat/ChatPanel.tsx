"use client";

import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";

import { ModelSelector } from "@/components/ModelSelector";
import { Icon } from "@/components/ui/Icon";
import { useJobPageContext } from "@/contexts/JobPageContext";
import cn from "@/lib/cn";

import { useChatContext } from "./ChatContext";
import { ChatMessageItem } from "./ChatMessage";
import ATSAnalysisPanel from "../job/ATSAnalysisPanel";
import { Button } from "../ui";

export type ViewMode = "chat" | "settings" | "ats";

interface ChatPanelProps {
  onClose?: () => void;
}

export function ChatPanel({ onClose: _close }: ChatPanelProps) {
  const { chatSnapPosition: snapPosition } = useJobPageContext();

  const {
    defaultView,
    messages,
    isLoading,
    isProviderReady,
    providerError,
    retryProviderInit,
    input,
    atsAnalysis,
    setInput: onInputChange,
    handleSend: onSend,
    resetSession,
  } = useChatContext();

  const isDocked = snapPosition !== undefined && snapPosition !== "undocked";
  const [view, setView] = useState<ViewMode>(defaultView);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const onClose = useCallback(() => {
    if (_close) _close();
    resetSession();
  }, [_close, resetSession]);

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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (canSend) onSend();
      }
    },
    [canSend, onSend]
  );

  return (
    <div
      className={cn(
        "bg-agent-surface-lowest flex flex-col overflow-hidden",
        isDocked
          ? "h-full w-full"
          : "border-agent-outline-variant shadow-agent-modal h-[520px] w-[360px] rounded-xl border"
      )}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="border-agent-outline-variant bg-agent-surface-low flex shrink-0 items-center gap-2 border-b px-4 py-3">
        <span className="text-agent-on-surface mr-auto font-mono text-sm font-semibold tracking-tight">
          Resume AI
        </span>
        {/*Ats analysis result is present, show an "ATS Analysis" badge in the header*/}
        {atsAnalysis && (
          <button
            type="button"
            title="View ATS analysis"
            onClick={() => setView((prev) => (prev === "ats" ? "chat" : "ats"))}
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
        {onClose && (
          <button
            type="button"
            title="Close"
            onClick={onClose}
            className="hover:bg-agent-surface-high text-agent-on-surface-variant flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          >
            <Icon name="x" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {view === "ats" && atsAnalysis && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ATSAnalysisPanel atsAnalysis={atsAnalysis} standalone />
        </div>
      )}
      {/* ── Settings view ───────────────────────────────────────────────── */}
      {view === "settings" && (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <p className="text-agent-on-surface-variant mb-4 text-xs font-semibold tracking-widest uppercase">
            Model
          </p>
          <ModelSelector className="w-full" />

          <p className="text-agent-on-surface-variant mt-6 mb-4 text-xs leading-relaxed">
            The selected model will be used for all chat operations in this
            session. Switch back to chat to start talking.
          </p>

          <Button
            type="button"
            className="w-full"
            onClick={() => setView("chat")}
          >
            Start Chatting
            <Icon name="sparkles" className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* ── Chat view ───────────────────────────────────────────────────── */}
      {view === "chat" && (
        <>
          {/* Message list */}
          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            {messages.length === 0 ? (
              <div className="text-agent-on-surface-variant flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
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
          <div className="border-agent-outline-variant shrink-0 border-t px-3 pt-2 pb-3">
            {isProviderReady ? (
              <p className="text-agent-on-surface-variant mb-2 text-[10px]">
                Using <ModelSelector variant="minimal" />.
              </p>
            ) : providerError ? (
              <p className="text-agent-error mb-2 flex items-center gap-2 text-[10px]">
                {providerError}
                <button
                  type="button"
                  onClick={retryProviderInit}
                  className="text-agent-primary font-semibold underline"
                >
                  Retry
                </button>
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
            <p className="text-agent-on-surface-variant mt-1.5 px-0.5 text-[10px] opacity-40">
              Enter to send · Shift+Enter for newline
            </p>
          </div>
        </>
      )}
    </div>
  );
}
