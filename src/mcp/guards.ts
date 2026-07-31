/**
 * Post-validation guards — the checks Zod alone can't express, applied
 * inside `submit` after schema validation and before persistence. Mirrors
 * `src/lib/llm/domainOps.ts`'s `generateResume`/`parseResume`/
 * `proofreadResume` exactly, minus the actual LLM call (this server never
 * calls an LLM — the external client already produced `result`).
 */
import { assertResumeNotGutted } from "@/lib/llm/domainOps";
import { lintResume } from "@/lib/proofread/lint";
import { ProofreadIssue, ProofreadJSON } from "@/types/proofread";
import { ResumeJSON } from "@/types/resume";

export type GuardResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/**
 * Run a guard that may throw (matching `domainOps.ts`'s convention) and
 * turn a thrown rejection into a `{ ok: false }` result instead of letting
 * it escape — `submit` returns `{ ok: false, errors }` for a guard failure,
 * never an unhandled exception.
 */
export function applyGuard<T>(fn: () => T): GuardResult<T> {
  try {
    return { ok: true, value: fn() };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * `generate_tailored_resume` guard: reject a tailored resume that has been
 * silently gutted relative to the base profile it was built from (see
 * `assertResumeNotGutted`'s own doc comment — Zod happily accepts an empty
 * resume as "valid"), then carry the base profile's `sectionLayout` over
 * verbatim — this is a display-only field the model has no business
 * inventing a value for (same reasoning as `domainOps.generateResume`).
 */
export function guardTailoredResume(
  baseProfile: ResumeJSON,
  tailored: ResumeJSON
): ResumeJSON {
  assertResumeNotGutted(baseProfile, tailored);
  return { ...tailored, sectionLayout: baseProfile.sectionLayout };
}

// Duplicated from domainOps.ts's private helper of the same name (kept in
// sync manually) rather than imported: domainOps.proofreadResume bundles
// this dedupe/merge step together with the actual LLM call, which this
// server must never make — there is no standalone exported version to
// reuse.
function proofreadDedupeKey(issue: ProofreadIssue): string {
  return `${issue.field}::${issue.original.toLowerCase().replace(/\s+/g, " ").trim()}`;
}

/**
 * `proofread_resume` guard — security-relevant, not optional: re-stamp
 * EVERY submitted issue to `source: "llm"` regardless of what the client
 * sent, then merge in this server's own `lintResume()` findings (the only
 * issues allowed to carry `source: "lint"`). Downstream consumers (e.g.
 * `Chatbot.ts`) auto-apply `source === "lint"` findings without review, so
 * trusting a client-supplied `"lint"` label would let an unreviewed —
 * possibly destructive — suggestion slip through as if it were a
 * deterministic, always-safe lint fix.
 */
export function guardProofreadResult(
  resumeFull: ResumeJSON,
  submitted: ProofreadJSON
): ProofreadJSON {
  const lintIssues = lintResume(resumeFull);
  const lintKeys = new Set(lintIssues.map(proofreadDedupeKey));

  const llmIssues = submitted.issues
    .filter((issue) => !lintKeys.has(proofreadDedupeKey(issue)))
    .map((issue) => ({ ...issue, source: "llm" as const }));

  return { ...submitted, issues: [...lintIssues, ...llmIssues] };
}
