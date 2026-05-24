import ReactMarkdown from "react-markdown";

import cn from "@/lib/cn";
import "@/styles/rte.css";

import { ChatToolResult } from "./ChatToolResult";
import { INTENT_META, type ChatMessage } from "./types";

interface ChatMessageProps {
  message: ChatMessage;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatMessageItem({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";

  // ── Tool result card ────────────────────────────────────────────────────
  if (isTool && message.toolResult) {
    return (
      <div className="px-4 py-1">
        <ChatToolResult
          content={message.content}
          intent={message.toolResult.intent}
          args={message.toolResult.args}
        />
        <p className="text-agent-on-surface-variant/60 mt-1 px-0.5 text-right text-[10px] tabular-nums">
          {formatTime(message.timestamp)}
        </p>
      </div>
    );
  }

  // ── User message ────────────────────────────────────────────────────────
  if (isUser) {
    return (
      <div className="flex flex-col items-end px-4 py-1">
        <p className="text-agent-on-surface bg-agent-surface max-w-[82%] rounded-xl rounded-br-xs! px-3 py-2 font-sans text-sm leading-relaxed">
          {message.content}
        </p>
        <p className="text-agent-on-surface-variant/50 mt-0.5 text-[10px] tabular-nums">
          {formatTime(message.timestamp)}
        </p>
      </div>
    );
  }

  // ── Assistant message ───────────────────────────────────────────────────
  const meta = message.intent ? INTENT_META[message.intent] : null;

  return (
    <div className="flex flex-col items-start px-4 py-1">
      {/* Intent badge */}
      {meta && (
        <span
          className="mb-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide"
          style={{
            background: meta.color,
            color: meta.onColor,
          }}
        >
          <span className={cn({ "animate-pulse": message.isStreaming })}>
            ✦
          </span>{" "}
          {meta.label}
        </span>
      )}

      {/* Content */}
      <div className="max-w-[92%]">
        {message.content || message.isStreaming ? (
          <p className={`rte-content min-h-0 space-y-2 font-sans text-sm`}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {message.isStreaming && (
              <span className="text-agent-primary ml-0.5 inline-block animate-pulse">
                ▋
              </span>
            )}
          </p>
        ) : message.isStreaming ? (
          /* Dots while waiting for first chunk */
          <span className="flex items-center gap-1 py-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="bg-agent-primary h-1.5 w-1.5 animate-bounce rounded-full"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </span>
        ) : null}

        {/* Inline error */}
        {message.error && (
          <p className="text-agent-error mt-1 text-xs">{message.error}</p>
        )}
      </div>

      <p className="text-agent-on-surface-variant/50 mt-0.5 text-[10px] tabular-nums">
        {formatTime(message.timestamp)}
      </p>
    </div>
  );
}
