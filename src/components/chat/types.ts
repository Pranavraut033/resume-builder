import { LLMUsageInfo } from "@/actions/tokenUsage";
import {
  IntentLabel,
  ToolIntent,
} from "@/lib/llm/chat-bot/prompts/intentClassifier";

import type { ChatStreamEvent } from "@/lib/llm/chat-bot/Chatbot";

export type { ChatStreamEvent, IntentLabel, ToolIntent };

// ── Message model ────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "tool";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  intent?: IntentLabel;
  toolResult?: {
    intent: ToolIntent;
    args: Record<string, unknown>;
  };
  isStreaming?: boolean;
  /** Ephemeral status narration shown while working — cleared once real content/tool result arrives. */
  statusText?: string;
  /** Token usage for this turn, surfaced once the "done" event arrives. */
  usage?: LLMUsageInfo;
  timestamp: Date;
  error?: string;
}

// ── Intent display metadata ──────────────────────────────────────────────────

export interface IntentMeta {
  label: string;
  /** Tailwind className pair for the pill background/foreground — agent tokens. */
  color: string;
  onColor: string;
}

export const INTENT_META: Record<IntentLabel, IntentMeta> = {
  edit: {
    label: "editing resume",
    color: "bg-agent-primary",
    onColor: "text-agent-on-primary",
  },
  interview: {
    label: "interview prep",
    color: "bg-agent-tertiary-container",
    onColor: "text-agent-on-tertiary-container",
  },
  regenerate: {
    label: "regenerating resume",
    color: "bg-agent-secondary-container",
    onColor: "text-agent-on-secondary-container",
  },
  tailor: {
    label: "tailoring to job",
    color: "bg-agent-secondary-container",
    onColor: "text-agent-on-secondary-container",
  },
  question: {
    label: "answering",
    color: "bg-agent-surface-high",
    onColor: "text-agent-on-surface-variant",
  },
  other: {
    label: "answering",
    color: "bg-agent-surface-high",
    onColor: "text-agent-on-surface-variant",
  },
  ats: {
    label: "ats advice",
    color: "bg-agent-secondary-container",
    onColor: "text-agent-on-secondary-container",
  },
  fix_ats: {
    label: "fixing ats issues",
    color: "bg-agent-primary",
    onColor: "text-agent-on-primary",
  },
  cover_letter: {
    label: "rewriting cover letter",
    color: "bg-agent-tertiary-container",
    onColor: "text-agent-on-tertiary-container",
  },
  humanize: {
    label: "humanizing",
    color: "bg-agent-tertiary-container",
    onColor: "text-agent-on-tertiary-container",
  },
  undo: {
    label: "undoing",
    color: "bg-agent-secondary-container",
    onColor: "text-agent-on-secondary-container",
  },
};

// ── Tool result display ──────────────────────────────────────────────────────

export interface ToolResultMeta {
  heading: string;
  icon: string;
}

export function getToolResultMeta(
  intent: ToolIntent,
  args: Record<string, unknown>
): ToolResultMeta {
  switch (intent) {
    case IntentLabel.Edit:
      return {
        heading: String(args.note ?? "Updated resume"),
        icon: "pencil",
      };
    case IntentLabel.Regenerate:
      return {
        heading: "Resume regenerated from base profile",
        icon: "refreshCw",
      };
    case IntentLabel.Tailor:
      return {
        heading: "Resume tailored to job description",
        icon: "target",
      };
    case IntentLabel.Ats:
      return { heading: "ATS advice", icon: "cpu" };
    case IntentLabel.FixAts:
      return { heading: String(args.note ?? "ATS issues fixed"), icon: "cpu" };
    case IntentLabel.CoverLetter:
      return { heading: "Cover letter rewritten", icon: "fileText" };
    case IntentLabel.Humanize:
      return { heading: "Cover letter humanized", icon: "sparkles" };
    case IntentLabel.Undo:
      return { heading: "Reverted last change", icon: "rotateCcw" };
  }
}
