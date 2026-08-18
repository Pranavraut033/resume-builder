/**
 * Post-validation guards — the checks Zod alone can't express, applied
 * inside `submit`/`align_resume_terms` after schema validation and before
 * persistence. Mirrors `src/lib/llm/domainOps.ts`'s
 * `generateResume`/`parseResume`/`analyzeDocument` exactly, minus the actual
 * LLM call (this server never calls an LLM — the external client already
 * produced `result`).
 */
import { getValueByPointer } from "fast-json-patch";

import {
  AtsFixMapping,
  mappingsToResumeOps,
} from "@/lib/llm/chat-bot/prompts/keywordMappingPrompt";
import { assertResumeNotGutted } from "@/lib/llm/domainOps";
import { lintResume } from "@/lib/proofread/lint";
import { ResumeOp } from "@/lib/resume/editor";
import {
  DocumentAnalysisJSON,
  DocumentFinding,
} from "@/types/documentAnalysis";
import { JobDetailsJSON, ResumeJSON } from "@/types/resume";

export type GuardResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/**
 * Run a guard that may throw (matching `domainOps.ts`'s convention) and
 * turn a thrown rejection into a `{ ok: false }` result instead of letting
 * it escape — `submit`/`align_resume_terms` return `{ ok: false, ...}` for a
 * guard failure, never an unhandled exception.
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
// sync manually) rather than imported: domainOps.analyzeDocument bundles
// this dedupe/merge step together with the actual LLM call, which this
// server must never make — there is no standalone exported version to
// reuse. Keyed on `path` + normalized `original` — `DocumentFinding` has no
// `field`/`location` the way the old `ProofreadIssue` did, both were
// derivable from `path` and got dropped in the schema collapse.
function documentFindingDedupeKey(finding: DocumentFinding): string {
  return `${finding.path}::${finding.original.toLowerCase().replace(/\s+/g, " ").trim()}`;
}

/**
 * `analyze_document` guard — security-relevant, not optional: re-stamp
 * EVERY submitted finding to `source: "llm"` regardless of what the client
 * sent, then merge in this server's own `lintResume()` findings (the only
 * findings allowed to carry `source: "lint"`). Downstream consumers (e.g.
 * `Chatbot.ts`) auto-apply `source === "lint"` findings without review, so
 * trusting a client-supplied `"lint"` label would let an unreviewed —
 * possibly destructive — suggestion slip through as if it were a
 * deterministic, always-safe lint fix.
 */
export function guardDocumentAnalysis(
  resumeFull: ResumeJSON,
  submitted: DocumentAnalysisJSON,
  jobDetails?: JobDetailsJSON | null
): DocumentAnalysisJSON {
  const lintFindings = lintResume(resumeFull, { jobDetails });
  const lintKeys = new Set(lintFindings.map(documentFindingDedupeKey));

  const llmFindings = submitted.findings
    .filter((finding) => !lintKeys.has(documentFindingDedupeKey(finding)))
    .map((finding) => ({ ...finding, source: "llm" as const }));

  return { ...submitted, findings: [...lintFindings, ...llmFindings] };
}

// ── align_resume_terms guard ────────────────────────────────────────────

/**
 * Lowercase, then split on anything that isn't a letter/digit — this both
 * "strips punctuation and whitespace" AND tokenizes on the boundaries that
 * stripping creates, so "K8s" stays the single token "k8s" (digits are kept
 * inside a token) while "Certified Public Accountant (CPA)" becomes 4
 * separate word tokens. A character-set comparison instead of a word-token
 * one would be far too permissive here — almost any rewrite happens to
 * reuse most of the original's individual letters, which would defeat the
 * whole point of the additive-only rule.
 */
function normalizeTokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  );
}

/** True iff every token in `a` is also in `b`, and `b` has at least one
 * token `a` doesn't — i.e. `a` is a PROPER subset of `b`, not merely equal. */
function isStrictSubset(a: Set<string>, b: Set<string>): boolean {
  if (a.size >= b.size) return false;
  for (const token of a) {
    if (!b.has(token)) return false;
  }
  return true;
}

/**
 * `align_resume_terms` guard — the additive-only rule (see the tool
 * description in server.ts for the model-facing statement of it): for every
 * op, normalize the resume's CURRENT value at that op's path and the op's
 * proposed `value` (lowercase, strip punctuation/whitespace into word
 * tokens — see `normalizeTokens`). The op is legal iff the original's token
 * set is a STRICT SUBSET of the new value's — every op may only ADD an
 * alternate surface form on top of what's already there (an acronym, an
 * expansion, a spelled-out alias), never rewrite or replace the substance.
 *
 * This is deliberately stricter than `apply_resume_ops`'s validation — that
 * path has no content check at all (by design, it's the general-purpose
 * editor). `align_resume_terms` is the only tool allowed to auto-apply a
 * suggested term swap without a human reviewing it first, and this guard is
 * the entire reason that's safe to do.
 *
 * A "remove" op is never additive by definition and is always rejected. An
 * "add" op (a brand-new array entry, e.g. a new skill) never overwrites
 * existing content, so it's accepted without a token check as long as it
 * carries a real string value. Rejects the WHOLE call (throws, caught by
 * `applyGuard`) on the first offending op rather than silently dropping it
 * — the caller gets a clear, specific reason and can fix or drop that op
 * and resubmit.
 */
export function guardAlignOps(
  resume: ResumeJSON,
  mapping: AtsFixMapping
): ResumeOp[] {
  for (const entry of mapping.ops) {
    const { item, op, path, value } = entry;

    if (op === "remove") {
      throw new Error(
        `align_resume_terms rejected op for "${item}" at ${path}: "remove" is never additive. Use apply_resume_ops directly if a removal is really intended.`
      );
    }

    if (value == null || typeof value !== "string") {
      throw new Error(
        `align_resume_terms rejected op for "${item}" at ${path}: this tool only supports a plain string value (got ${value === null ? "no value" : "a non-string value"}). Use apply_resume_ops directly for a structured field change.`
      );
    }

    let current: unknown;
    try {
      current = getValueByPointer(resume, path);
    } catch {
      current = undefined;
    }

    // "add" is NOT additive by construction, despite the name: RFC 6902 says
    // `add` on an EXISTING object member replaces it, and fast-json-patch
    // implements that faithfully. So {op:"add", path:"/summary"} would
    // perform exactly the rewrite this guard exists to reject. The check is
    // therefore driven by what the path resolves to, never by the op name:
    // an unresolved path is a genuine insert (`/skills/-`, a new index) and
    // is only legal for "add"; a resolved path must pass the subset test
    // whichever op asked for it.
    if (current === undefined) {
      if (op === "add") continue;
      throw new Error(
        `align_resume_terms rejected op for "${item}": path "${path}" does not resolve to an existing value in the resume, so the additive-only rule can't be verified. Use apply_resume_ops directly if this path is intentional.`
      );
    }

    if (typeof current !== "string") {
      throw new Error(
        `align_resume_terms rejected op for "${item}": path "${path}" resolves to a non-string value, so the additive-only rule can't be verified. Use apply_resume_ops directly for a structured field change.`
      );
    }

    const originalTokens = normalizeTokens(current);
    const valueTokens = normalizeTokens(value);
    if (!isStrictSubset(originalTokens, valueTokens)) {
      throw new Error(
        `align_resume_terms rejected op for "${item}" at ${path}: "${current}" -> "${value}" is not additive — every word already in the resume must also appear in the replacement, plus at least one new word. This reads as a rewrite, not a term alignment. Use apply_resume_ops directly if a real rewrite is intended.`
      );
    }
  }

  return mappingsToResumeOps(mapping.ops);
}
