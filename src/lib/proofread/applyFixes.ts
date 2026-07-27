/**
 * Deterministic apply engine for proofread findings.
 *
 * Pure, no LLM, shared by the drawer (Cluster B) and the chat proofread
 * intent (Cluster C). Each issue names a top-level resume `field` and a
 * verbatim `original` string; a fix is a scoped, exact-match string replace
 * inside that field's serialized subtree, applied only when the match is
 * unique — never a second LLM call, never an AST-level edit.
 *
 * ponytail: scoped exact-match replace, not an AST path. Upgrade to a
 * structured {field, index, key} locator if the LLM proves unreliable at
 * echoing `original` verbatim.
 */
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

/**
 * Apply issues sequentially against the accumulating resume so multiple
 * fixes to the same field compose. Never throws — a malformed finding (bad
 * `original`, a suggestion that breaks the field's Zod shape, ambiguous or
 * missing matches) is reported in `unapplied` instead, and the resume it
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
      const field = issue.field;
      const serialized = JSON.stringify(updated[field]);
      const occurrences = countOccurrences(serialized, issue.original);

      if (occurrences !== 1) {
        unapplied.push(issue);
        continue;
      }

      const replacedSerialized = serialized.replace(
        issue.original,
        issue.suggestion
      );

      let candidate: unknown;
      try {
        candidate = JSON.parse(replacedSerialized);
      } catch {
        unapplied.push(issue);
        continue;
      }

      const fieldSchema = ResumeSchema.shape[field];
      const parsed = fieldSchema.safeParse(candidate);
      if (!parsed.success) {
        unapplied.push(issue);
        continue;
      }

      updated = { ...updated, [field]: parsed.data };
      applied.push(issue);
    } catch {
      // Never throw — a bad finding must not lose the resume.
      unapplied.push(issue);
    }
  }

  return { resume: updated, applied, unapplied };
}
