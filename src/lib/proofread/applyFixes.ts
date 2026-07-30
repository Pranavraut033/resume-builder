/**
 * Deterministic apply engine for proofread findings.
 *
 * Pure, no LLM, shared by the drawer (Cluster B) and the chat proofread
 * intent (Cluster C). Two apply strategies, tried per issue:
 *
 * 1. Path-based (preferred): when `issue.path` is set (a JSON Pointer to the
 *    exact leaf, see src/lib/resume/editor.ts::resumePathLines), read that
 *    leaf's raw, UNESCAPED string, do the substring replace directly against
 *    it (only when `original` matches exactly once in that leaf), and land
 *    it as a single `{op:"replace", path, value}` via `applyResumeOps`. This
 *    fixes the escaping bug the old approach had outright — `original`
 *    containing a `"`, `\`, or newline never matched against
 *    `JSON.stringify(field)`'s escaped form.
 * 2. Serialized-JSON fallback (legacy): for issues with no `path` — findings
 *    that predate this field — fall back to the original scoped exact-match
 *    string replace against `JSON.stringify(resume[field])`, applied only
 *    when the match is unique across the whole field's serialized subtree.
 *
 * ponytail: path-based replace is exact-substring only; a change whose
 * `original` isn't found verbatim (or isn't unique) inside its named leaf
 * lands in `unapplied`, never a fuzzy match.
 */
import { applyResumeOps, ResumeOp } from "@/lib/resume/editor";
import { ProofreadIssue } from "@/types/proofread";
import { ResumeJSON, ResumeSchema } from "@/types/resume";

export interface ApplyProofreadFixesResult {
  resume: ResumeJSON;
  applied: ProofreadIssue[];
  unapplied: ProofreadIssue[];
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  return haystack.split(needle).length - 1;
}

// Every path segment is either a fixed field name or a numeric array index
// (see the note in src/lib/resume/editor.ts) — plain property/index access
// is enough, no JSON-pointer escaping to worry about.
function readLeafAtPath(resume: ResumeJSON, path: string): string | null {
  const segments = path.split("/").filter(Boolean);
  let current: unknown = resume;
  for (const segment of segments) {
    if (current === null || typeof current !== "object") return null;
    const key = /^\d+$/.test(segment) ? Number(segment) : segment;
    current = (current as Record<string | number, unknown>)[key];
  }
  return typeof current === "string" ? current : null;
}

/**
 * Try the path-based apply strategy for one issue against `resume`. Returns
 * the updated resume on success, or `null` if the leaf couldn't be read, the
 * match wasn't unique, or `applyResumeOps` rejected the op.
 */
function applyByPath(
  resume: ResumeJSON,
  issue: ProofreadIssue & { path: string }
): ResumeJSON | null {
  const text = readLeafAtPath(resume, issue.path);
  if (text === null) return null;

  const occurrences = countOccurrences(text, issue.original);
  if (occurrences !== 1) return null;

  const newText = text.replace(issue.original, issue.suggestion);
  const op: ResumeOp = { op: "replace", path: issue.path, value: newText };

  const { resume: updated, rejected } = applyResumeOps(resume, [op]);
  if (rejected.length > 0) return null;

  return updated;
}

/**
 * Legacy strategy: scoped exact-match replace against the field's serialized
 * JSON subtree, applied only when the match is unique. Kept as the fallback
 * for issues with no `path`.
 */
function applyBySerializedField(
  resume: ResumeJSON,
  issue: ProofreadIssue
): ResumeJSON | null {
  const field = issue.field;
  const serialized = JSON.stringify(resume[field]);
  const occurrences = countOccurrences(serialized, issue.original);
  if (occurrences !== 1) return null;

  const replacedSerialized = serialized.replace(
    issue.original,
    issue.suggestion
  );

  let candidate: unknown;
  try {
    candidate = JSON.parse(replacedSerialized);
  } catch {
    return null;
  }

  const fieldSchema = ResumeSchema.shape[field];
  const parsed = fieldSchema.safeParse(candidate);
  if (!parsed.success) return null;

  return { ...resume, [field]: parsed.data };
}

/**
 * Apply issues sequentially against the accumulating resume so multiple
 * fixes to the same field/leaf compose. Never throws — a malformed finding
 * (bad `original`, a suggestion that breaks the field's Zod shape, ambiguous
 * or missing matches) is reported in `unapplied` instead, and the resume it
 * was checked against is left untouched for that issue.
 */
export function applyProofreadFixes(
  resume: ResumeJSON,
  issues: ProofreadIssue[]
): ApplyProofreadFixesResult {
  let updated: ResumeJSON = { ...resume };
  const applied: ProofreadIssue[] = [];
  const unapplied: ProofreadIssue[] = [];

  for (const issue of issues) {
    try {
      const next = issue.path
        ? applyByPath(updated, { ...issue, path: issue.path })
        : applyBySerializedField(updated, issue);

      if (next === null) {
        unapplied.push(issue);
        continue;
      }

      updated = next;
      applied.push(issue);
    } catch {
      // Never throw — a bad finding must not lose the resume.
      unapplied.push(issue);
    }
  }

  return { resume: updated, applied, unapplied };
}
