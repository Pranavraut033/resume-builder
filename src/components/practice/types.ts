// Shared types threaded between the /practice route's setup, session, and
// debrief screens (src/app/practice/page.tsx owns the state machine that
// passes these down).

import { InterviewStyleId } from "@/lib/llm/prompts/interviewStyles";
import { ProviderType } from "@/types/llm";

/**
 * Everything the setup screen collects before a session can start — handed
 * up to the page, then down into `InterviewSession`/`InterviewDebrief` for
 * building the system prompt, calling `speak()`, and persisting session meta.
 */
export interface InterviewSetupChoices {
  voice: string;
  styleId: InterviewStyleId;
  customInstructions?: string;
  provider: ProviderType;
  model: string;
}
