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
  /** Set when this turn is a whole-resume rewrite (tailor/regenerate) waiting on the user to confirm before it runs. */
  needsConfirm?: { intent: "tailor" | "regenerate"; userText: string };
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
  deep_analysis: {
    label: "reading like an editor",
    color: "bg-agent-secondary-container",
    onColor: "text-agent-on-secondary-container",
  },
  align_terms: {
    label: "aligning wording with the job",
    color: "bg-agent-primary",
    onColor: "text-agent-on-primary",
  },
  fit_check: {
    label: "fit check",
    color: "bg-agent-secondary-container",
    onColor: "text-agent-on-secondary-container",
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
      return { heading: "Resume updated", icon: "pencil" };
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
    case IntentLabel.DeepAnalysis: {
      const analysis = args.analysis as
        | { findings?: { severity?: string }[] }
        | undefined;
      const findings = Array.isArray(analysis?.findings)
        ? analysis.findings
        : [];
      const errors = findings.filter((f) => f.severity === "error").length;
      const warnings = findings.filter((f) => f.severity === "warning").length;
      const suggestions = findings.filter(
        (f) => f.severity === "suggestion"
      ).length;

      const heading =
        findings.length === 0
          ? "No findings"
          : [
              errors > 0 ? `${errors} error(s)` : null,
              warnings > 0 ? `${warnings} warning(s)` : null,
              suggestions > 0 ? `${suggestions} suggestion(s)` : null,
            ]
              .filter(Boolean)
              .join(", ");

      return { heading, icon: "spellCheck" };
    }
    case IntentLabel.AlignTerms: {
      const rejectedCount =
        typeof args.rejectedCount === "number" ? args.rejectedCount : 0;
      const heading =
        rejectedCount > 0
          ? `Term alignment applied — ${rejectedCount} finding(s) skipped`
          : "Term alignment applied";
      return { heading, icon: "cpu" };
    }
    case IntentLabel.FitCheck: {
      const analysis = args.analysis as
        | { gaps?: { severity?: string }[] }
        | undefined;
      const gaps = Array.isArray(analysis?.gaps) ? analysis.gaps : [];
      const blocking = gaps.filter((g) => g.severity === "blocking").length;
      const major = gaps.filter((g) => g.severity === "major").length;

      const heading =
        gaps.length === 0
          ? "No fit gaps found"
          : `${gaps.length} gap(s) found — ${blocking} blocking, ${major} major`;

      return { heading, icon: "gauge" };
    }
    case IntentLabel.CoverLetter:
      return { heading: "Cover letter rewritten", icon: "fileText" };
    case IntentLabel.Humanize:
      return { heading: "Cover letter humanized", icon: "sparkles" };
    case IntentLabel.Undo:
      return { heading: "Reverted last change", icon: "rotateCcw" };
  }
}
