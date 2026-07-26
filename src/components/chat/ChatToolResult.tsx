import { Icon } from "@/components/ui/Icon";

import { getToolResultMeta, ToolIntent } from "./types";

interface ChatToolResultProps {
  intent: ToolIntent;
  args: Record<string, unknown>;
  content?: string; // Optional content for tool results, e.g. change summary for edit intent
}

export function ChatToolResult({ intent, args, content }: ChatToolResultProps) {
  const { heading, icon } = getToolResultMeta(intent, args);

  return (
    <div className="space-y-3">
      <div className="border-agent-outline-variant bg-agent-surface-container my-1 overflow-hidden rounded-lg border">
        {/* Accent bar */}
        <div className="bg-agent-primary h-0.5 w-full" />

        <div className="flex items-start gap-3 px-3.5 py-3">
          {/* Icon */}
          <div className="bg-agent-primary-fixed text-agent-on-primary-fixed mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
            <Icon name={icon} className="h-3.5 w-3.5" />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <p className="text-agent-on-surface text-xs font-semibold tracking-wide">
              ✦ {heading}
            </p>
            {content && (
              <p className="text-agent-on-surface-variant mt-0.5 text-xs leading-relaxed">
                {content}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
