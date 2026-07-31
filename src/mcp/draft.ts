/**
 * Server-side scratch state for the `add_job` flow, before a job exists to
 * persist against. `submit` has nowhere to write `jobDetails`/`atsAnalysis`/
 * the tailored resume until the flow's final `generate_cover_letter` step
 * (see server.ts's `createJob` call), so the draft is where those
 * intermediate results live instead of forcing the host to re-upload them
 * as `input.*` on every subsequent call.
 *
 * Also tracks `lastSent`: the JSON-serialized value of each field the host
 * has already been shown in a prompt. `hydrateContext` (server.ts) uses this
 * to skip re-inlining data the host's own conversation already has — see
 * plan §3b. Comparing serialized values (not just "have we sent this field
 * before") means a guard-mutated value is automatically re-inlined next
 * time, since its serialization no longer matches what's recorded here.
 *
 * ponytail: process-memory only — a draft is minutes old and dies with the
 * server. Persist to SQLite only if hosts start losing flows to restarts.
 */
import { ATSAnalysisJSON, JobDetailsJSON, ResumeJSON } from "@/types/resume";

export type DraftField =
  | "jobDetails"
  | "baseProfile"
  | "atsAnalysis"
  | "tailoredResume";

export interface Draft {
  jobDetails?: JobDetailsJSON;
  atsAnalysis?: ATSAnalysisJSON | null;
  tailoredResume?: ResumeJSON;
  url?: string;
  profileId?: number;
  lastSent: Partial<Record<DraftField, string>>;
  updatedAt: number;
}

const IDLE_TTL_MS = 2 * 60 * 60 * 1000;

const drafts = new Map<string, Draft>();

function sweepIdle() {
  const cutoff = Date.now() - IDLE_TTL_MS;
  for (const [id, draft] of drafts) {
    if (draft.updatedAt < cutoff) drafts.delete(id);
  }
}

export function createDraft(): string {
  sweepIdle();
  const id = crypto.randomUUID();
  drafts.set(id, { lastSent: {}, updatedAt: Date.now() });
  return id;
}

export function getDraft(draftId: string | undefined): Draft | null {
  if (!draftId) return null;
  return drafts.get(draftId) ?? null;
}

export function updateDraft(draftId: string, patch: Partial<Draft>): void {
  const existing = drafts.get(draftId);
  if (!existing) return;
  Object.assign(existing, patch, { updatedAt: Date.now() });
}

export function deleteDraft(draftId: string): void {
  drafts.delete(draftId);
}

/**
 * Should `value` be inlined into the next prompt, or can it be skipped
 * because the host's own conversation already has this exact value? Also
 * records the new serialization as sent when it decides to inline.
 */
export function shouldInline(
  draft: Draft | null,
  field: DraftField,
  value: unknown
): boolean {
  if (value == null) return false;
  if (!draft) return true;
  const serialized = JSON.stringify(value);
  if (draft.lastSent[field] === serialized) return false;
  draft.lastSent[field] = serialized;
  return true;
}
