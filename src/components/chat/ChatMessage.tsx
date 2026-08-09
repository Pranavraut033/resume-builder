import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

import { LLMUsageInfo } from "@/actions/tokenUsage";
import { Icon } from "@/components/ui/Icon";
import cn from "@/lib/cn";

import { useChatContext } from "./ChatContext";
import { ChatToolResult } from "./ChatToolResult";
import { INTENT_META, type ChatMessage } from "./types";

interface ChatMessageProps {
  message: ChatMessage;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatUsage(usage: LLMUsageInfo): string {
  const parts = [`${usage.promptTokens} in`, `${usage.completionTokens} out`];
  if (usage.costUSD) parts.push(`$${usage.costUSD.toFixed(4)}`);
  return parts.join(" · ");
}

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const onCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      title="Copy message"
      onClick={onCopy}
      className="text-agent-on-surface-variant/60 hover:text-agent-on-surface-variant hover:bg-agent-surface-high flex h-5 w-5 items-center justify-center rounded transition-colors"
    >
      <Icon name={copied ? "check" : "copy"} className="h-3 w-3" />
    </button>
  );
}

function RetryButton({ messageId }: { messageId: string }) {
  const { retryMessage } = useChatContext();

  return (
    <button
      type="button"
      onClick={() => retryMessage(messageId)}
      className="text-agent-primary mt-1 inline-flex items-center gap-1 text-xs font-semibold underline"
    >
      <Icon name="rotateCcw" className="h-3 w-3" />
      Retry
    </button>
  );
}

function ConfirmRewrite({
  messageId,
  intent,
}: {
  messageId: string;
  intent: "tailor" | "regenerate";
}) {
  const { confirmPending, cancelPending } = useChatContext();
  const description =
    intent === "tailor"
      ? "This will rewrite your whole resume to fit the job description."
      : "This will rebuild your whole resume from your base profile, discarding current edits.";

  return (
    <div className="border-agent-outline-variant bg-agent-surface-high mt-1 max-w-[92%] rounded-lg border px-3 py-2 text-sm">
      <p className="text-agent-on-surface-variant">{description}</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => confirmPending(messageId)}
          className="bg-agent-primary text-agent-on-primary rounded-md px-3 py-1 text-xs font-semibold"
        >
          Go ahead
        </button>
        <button
          type="button"
          onClick={() => cancelPending(messageId)}
          className="text-agent-on-surface-variant hover:bg-agent-surface rounded-md px-3 py-1 text-xs font-semibold"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function StatusLine({ statusText }: { statusText: string }) {
  // CSS-only fade: remount the text node on every status change (via `key`)
  // so `starting:opacity-0` (@starting-style) applies fresh on each mount,
  // then transitions to opacity-100 — no JS state/timers, no framer-motion.
  return (
    <span className="text-agent-on-surface-variant flex items-center gap-2 py-1 text-xs">
      <Icon name="loaderCircle" className="h-3 w-3 animate-spin" />
      <span
        key={statusText}
        className="opacity-100 transition-opacity duration-200 starting:opacity-0"
      >
        {statusText}
      </span>
    </span>
  );
}

export function ChatMessageItem({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";
  const [isHovered, setIsHovered] = useState(false);

  // ── Tool result card ────────────────────────────────────────────────────
  if (isTool && message.toolResult) {
    return (
      <div
        className="px-4 py-1"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <ChatToolResult
          content={message.content}
          intent={message.toolResult.intent}
          args={message.toolResult.args}
        />
        <div className="mt-1 flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            {message.usage && (
              <span className="text-agent-on-surface-variant/50 text-[10px] tabular-nums">
                {formatUsage(message.usage)}
              </span>
            )}
            {message.content && (
              <span className={cn({ invisible: !isHovered })}>
                <CopyButton content={message.content} />
              </span>
            )}
          </div>
          <p className="text-agent-on-surface-variant/60 text-[10px] tabular-nums">
            {formatTime(message.timestamp)}
          </p>
        </div>
        {message.error && (
          <div>
            <p className="text-agent-error mt-1 text-xs">{message.error}</p>
            <RetryButton messageId={message.id} />
          </div>
        )}
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
    <div
      className="flex flex-col items-start px-4 py-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Intent badge */}
      {meta && (
        <span
          className={cn(
            "mb-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide",
            meta.color,
            meta.onColor
          )}
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
          <div className={`rte-content min-h-0 space-y-2 font-sans text-sm`}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {message.isStreaming && !message.statusText && (
              <span className="text-agent-primary ml-0.5 inline-block animate-pulse">
                ▋
              </span>
            )}
          </div>
        ) : message.isStreaming ? (
          message.statusText ? (
            <StatusLine statusText={message.statusText} />
          ) : (
            /* Dots while waiting for the first status/chunk */
            <span className="flex items-center gap-1 py-1">
              {[
                "[animation-delay:0ms]",
                "[animation-delay:120ms]",
                "[animation-delay:240ms]",
              ].map((delayClass, i) => (
                <span
                  key={i}
                  className={cn(
                    "bg-agent-primary h-1.5 w-1.5 animate-bounce rounded-full",
                    delayClass
                  )}
                />
              ))}
            </span>
          )
        ) : null}

        {/* Inline error + retry */}
        {message.error && (
          <div>
            <p className="text-agent-error mt-1 text-xs">{message.error}</p>
            <RetryButton messageId={message.id} />
          </div>
        )}

        {message.needsConfirm && (
          <ConfirmRewrite
            messageId={message.id}
            intent={message.needsConfirm.intent}
          />
        )}
      </div>

      <div className="mt-0.5 flex items-center gap-2">
        {message.usage && (
          <span className="text-agent-on-surface-variant/50 text-[10px] tabular-nums">
            {formatUsage(message.usage)}
          </span>
        )}
        <p className="text-agent-on-surface-variant/50 text-[10px] tabular-nums">
          {formatTime(message.timestamp)}
        </p>
        {message.content && !message.isStreaming && (
          <span className={cn({ invisible: !isHovered })}>
            <CopyButton content={message.content} />
          </span>
        )}
      </div>
    </div>
  );
}
