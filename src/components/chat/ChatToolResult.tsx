import { Icon } from "@/components/ui/Icon";
import { IntentLabel } from "@/lib/llm/chat-bot/prompts/intentClassifier";
import { GapAnalysisJSON } from "@/types/gapAnalysis";

import { useChatContext } from "./ChatContext";
import { getToolResultMeta, ToolIntent } from "./types";

interface ChatToolResultProps {
  intent: ToolIntent;
  args: Record<string, unknown>;
  content?: string; // Optional content for tool results, e.g. change summary for edit intent
}

export function ChatToolResult({ intent, args, content }: ChatToolResultProps) {
  const { heading, icon } = getToolResultMeta(intent, args);
  // Silent — this component also renders outside a provider-backed tree in
  // some previews; onOpenGapDrawer is simply unavailable there.
  const chatContext = useChatContext(true);

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
            {intent === IntentLabel.GapAnalysis && (
              <GapAnalysisSummary
                analysis={args.analysis as GapAnalysisJSON}
                onOpenGapDrawer={chatContext?.onOpenGapDrawer}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// One-line fit summary + a button that opens the full gap report — the
// drawer (cluster 3's GapDrawer.tsx) owns the full gap list, evidence, and
// apply flow, so this stays deliberately thin: no inline gap list, no apply
// button here.
function GapAnalysisSummary({
  analysis,
  onOpenGapDrawer,
}: {
  analysis: GapAnalysisJSON;
  onOpenGapDrawer?: () => void;
}) {
  if (!analysis) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="bg-agent-tertiary-container text-agent-on-tertiary-container rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide capitalize">
        {analysis.fit_level}
      </span>
      {onOpenGapDrawer && (
        <button
          type="button"
          onClick={onOpenGapDrawer}
          className="text-agent-primary hover:text-agent-primary/80 text-xs font-medium underline-offset-2 hover:underline"
        >
          Open fit check
        </button>
      )}
    </div>
  );
}
