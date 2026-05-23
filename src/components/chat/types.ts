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
  timestamp: Date;
  error?: string;
}

// ── Intent display metadata ──────────────────────────────────────────────────

export interface IntentMeta {
  label: string;
  /** Tailwind inline-style color key for the pill — maps to agent CSS vars */
  color: string;
  onColor: string;
}

export const INTENT_META: Record<IntentLabel, IntentMeta> = {
  edit: {
    label: "editing resume",
    color: "var(--color-agent-primary)",
    onColor: "var(--color-agent-on-primary)",
  },
  interview: {
    label: "interview prep",
    color: "var(--color-agent-tertiary-container)",
    onColor: "var(--color-agent-on-tertiary-container)",
  },
  regenerate: {
    label: "regenerating resume",
    color: "var(--color-agent-secondary-container)",
    onColor: "var(--color-agent-on-secondary-container)",
  },
  tailor: {
    label: "tailoring to job",
    color: "var(--color-agent-secondary-container)",
    onColor: "var(--color-agent-on-secondary-container)",
  },
  question: {
    label: "answering",
    color: "var(--color-agent-surface-high)",
    onColor: "var(--color-agent-on-surface-variant)",
  },
  other: {
    label: "thinking",
    color: "var(--color-agent-surface-high)",
    onColor: "var(--color-agent-on-surface-variant)",
  },
  ats: {
    label: "ats advice",
    color: "var(--color-agent-secondary-container)",
    onColor: "var(--color-agent-on-secondary-container)",
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
        heading: `Updated · ${String(args.field ?? "field")}`,
        icon: "pencil",
      };
    case IntentLabel.Regenerate:
      return {
        heading: "Resume regenerated from base profile",
        icon: "refresh-cw",
      };
    case IntentLabel.Tailor:
      return {
        heading: "Resume tailored to job description",
        icon: "target",
      };
    case IntentLabel.Ats:
      return { heading: "ATS advice", icon: "cpu" };
  }
}
