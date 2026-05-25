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
  const { chatSnapPosition: snapPosition, setChatSnapPosition } =
    useJobPageContext();

  const {
    defaultView,
    messages,
    isLoading,
    isProviderReady,
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

  const onSnapPositionChange = useCallback(
    (pos: "left" | "right" | "undocked") => {
      setChatSnapPosition(pos);
      if (pos === "undocked" && onClose) onClose();
    },
    [onClose, setChatSnapPosition]
  );

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
      className="flex flex-col overflow-hidden"
      style={{
        ...(isDocked
          ? { width: "100%", height: "100%" }
          : {
              width: 360,
              height: 520,
              borderRadius: "0.75rem",
              border: "1px solid var(--color-agent-outline-variant)",
              boxShadow: "var(--shadow-agent-modal)",
            }),
        background: "var(--color-agent-surface-lowest)",
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
        {/* Snap position controls — only shown when the snap prop is wired up */}
        <>
          <button
            type="button"
            title="Snap left"
            onClick={() => onSnapPositionChange("left")}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              {
                "bg-agent-primary text-agent-on-primary":
                  snapPosition === "left",
                "text-agent-on-surface-variant bg-transparent":
                  snapPosition !== "left",
              }
            )}
          >
            <Icon name="panelLeft" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Snap right"
            onClick={() => onSnapPositionChange("right")}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              {
                "bg-agent-primary text-agent-on-primary":
                  snapPosition === "right",
                "text-agent-on-surface-variant bg-transparent":
                  snapPosition !== "right",
              }
            )}
          >
            <Icon name="panelRight" className="h-3.5 w-3.5" />
          </button>
          {isDocked && (
            <button
              type="button"
              title="Undock panel"
              onClick={() => onSnapPositionChange("undocked")}
              className="text-agent-on-surface-variant hover:bg-agent-surface-high flex h-7 w-7 items-center justify-center rounded-md transition-colors"
            >
              <Icon name="panelLeftClose" className="h-3.5 w-3.5" />
            </button>
          )}
        </>
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
            className="hover:bg-agent-surface-high flex h-7 w-7 items-center justify-center rounded-md transition-colors"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            <Icon name="x" className="h-3.5 w-3.5" />
          </button>
        )}
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
          <ModelSelector className="w-full" />

          <p
            className="mt-6 mb-4 text-xs leading-relaxed"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
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
                Using <ModelSelector variant="minimal" />. Type your message and
                hit enter to send.
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
