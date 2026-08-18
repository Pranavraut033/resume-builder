/**
 * Deterministic apply engine for document-analysis findings.
 *
 * Pure, no LLM, shared by the drawer and the chat proofread intent. Every
 * `DocumentFinding` carries a required `path` (a JSON Pointer to the exact
 * leaf, see src/lib/resume/editor.ts::resumePathLines) — read that leaf's
 * raw, UNESCAPED string, do the substring replace directly against it (only
 * when `original` matches exactly once in that leaf), and land it as a
 * single `{op:"replace", path, value}` via `applyResumeOps`. Matching the
 * raw leaf text directly (rather than a serialized/escaped form) means
 * `original` containing a `"`, `\`, or newline still matches correctly.
 *
 * ponytail: path-based replace is exact-substring only; a change whose
 * `original` isn't found verbatim (or isn't unique) inside its named leaf
 * lands in `unapplied`, never a fuzzy match.
 */
import { applyResumeOps, ResumeOp } from "@/lib/resume/editor";
import { DocumentFinding } from "@/types/documentAnalysis";
import { ResumeJSON } from "@/types/resume";

export interface ApplyProofreadFixesResult {
  resume: ResumeJSON;
  applied: DocumentFinding[];
  unapplied: DocumentFinding[];
}

// Exported for src/lib/llm/chat-bot/Chatbot.ts's alignResumeTerms, which
// needs the same verified-substring-splice safety this file already gives
// lint auto-apply, but for a different finding subset (additive-only) and
// a different reporting shape (ResumeOp-based, to match applyEdits).
export function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  return haystack.split(needle).length - 1;
}

// Every path segment is either a fixed field name or a numeric array index
// (see the note in src/lib/resume/editor.ts) — plain property/index access
// is enough, no JSON-pointer escaping to worry about.
export function readLeafAtPath(
  resume: ResumeJSON,
  path: string
): string | null {
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
 * Try the path-based apply strategy for one finding against `resume`.
 * Returns the updated resume on success, or `null` if the leaf couldn't be
 * read, the match wasn't unique, or `applyResumeOps` rejected the op.
 */
function applyByPath(
  resume: ResumeJSON,
  finding: DocumentFinding
): ResumeJSON | null {
  const text = readLeafAtPath(resume, finding.path);
  if (text === null) return null;

  const occurrences = countOccurrences(text, finding.original);
  if (occurrences !== 1) return null;

  const newText = text.replace(finding.original, finding.suggestion);
  const op: ResumeOp = { op: "replace", path: finding.path, value: newText };

  const { resume: updated, rejected } = applyResumeOps(resume, [op]);
  if (rejected.length > 0) return null;

  return updated;
}

/**
 * Apply findings sequentially against the accumulating resume so multiple
 * fixes to the same leaf compose. Never throws — a malformed finding (bad
 * `original`, a suggestion that breaks the field's Zod shape, ambiguous or
 * missing matches) is reported in `unapplied` instead, and the resume it was
 * checked against is left untouched for that finding.
 */
export function applyProofreadFixes(
  resume: ResumeJSON,
  findings: DocumentFinding[]
): ApplyProofreadFixesResult {
  let updated: ResumeJSON = { ...resume };
  const applied: DocumentFinding[] = [];
  const unapplied: DocumentFinding[] = [];

  for (const finding of findings) {
    try {
      const next = applyByPath(updated, finding);

      if (next === null) {
        unapplied.push(finding);
        continue;
      }

      updated = next;
      applied.push(finding);
    } catch {
      // Never throw — a bad finding must not lose the resume.
      unapplied.push(finding);
    }
  }

  return { resume: updated, applied, unapplied };
}
