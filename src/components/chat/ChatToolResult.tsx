import { Icon } from "@/components/ui/Icon";

import { getToolResultMeta, ToolIntent } from "./types";

interface ChatToolResultProps {
  intent: ToolIntent;
  args: Record<string, unknown>;
}

export function ChatToolResult({ intent, args }: ChatToolResultProps) {
  const { heading, icon } = getToolResultMeta(intent, args);
  const changeSummary =
    intent === "edit" && typeof args.change_summary === "string"
      ? args.change_summary
      : null;

  return (
    <div
      className="my-1 overflow-hidden rounded-lg"
      style={{
        border: "1px solid var(--color-agent-outline-variant)",
        background: "var(--color-agent-surface-container)",
      }}
    >
      {/* Accent bar */}
      <div
        className="h-0.5 w-full"
        style={{ background: "var(--color-agent-primary)" }}
      />

      <div className="flex items-start gap-3 px-3.5 py-3">
        {/* Icon */}
        <div
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
          style={{
            background: "var(--color-agent-primary-fixed)",
            color: "var(--color-agent-on-primary-fixed)",
          }}
        >
          <Icon name={icon} className="h-3.5 w-3.5" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p
            className="text-xs font-semibold tracking-wide"
            style={{ color: "var(--color-agent-on-surface)" }}
          >
            ✦ {heading}
          </p>
          {changeSummary && (
            <p
              className="mt-0.5 text-xs leading-relaxed"
              style={{ color: "var(--color-agent-on-surface-variant)" }}
            >
              {changeSummary}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
