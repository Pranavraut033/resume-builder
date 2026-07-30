import { deepClone } from "fast-json-patch";

import { applyResumeOps, ResumeOp } from "@/lib/resume/editor";
import { HumanizerJSON } from "@/types/humanizer";
import { ResumeJSON } from "@/types/resume";

type HumanizerChange = HumanizerJSON["changes"][number];

// ponytail: exact-substring match only; a change whose `original` isn't found
// verbatim gets skipped. Fine here since changes come from text we generated
// ourselves. Upgrade to fuzzy matching if the LLM starts paraphrasing originals.
export function applyChangesToText(
  text: string,
  changes: HumanizerChange[]
): string {
  return changes.reduce(
    (acc, { original, replacement }) =>
      original && acc.includes(original)
        ? acc.split(original).join(replacement)
        : acc,
    text
  );
}

// Every segment is either a fixed field name or a numeric array index (see
// the note in src/lib/resume/editor.ts) — plain property/index access is
// enough, no JSON-pointer escaping to worry about.
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
 * Apply changes to a resume. Two strategies, tried per change:
 *
 * 1. Path-based (preferred): when `change.path` is set (a JSON Pointer to
 *    the exact leaf, see src/lib/resume/editor.ts::resumePathLines), rewrite
 *    only that one leaf via `applyChangesToText` + `applyResumeOps` — a
 *    short `original` never touches an unrelated bullet elsewhere that
 *    happens to share the same substring.
 * 2. Whole-document whitelist walk (legacy fallback): for changes with no
 *    `path` — findings that predate this field — fall back to the original
 *    behavior of running `applyChangesToText` as a global split/join across
 *    every prose field (summary, experience, projects, volunteer, awards,
 *    custom sections).
 *
 * Path-based changes are applied first (each scoped to its own leaf, so
 * order/overlap between them doesn't matter), then the whitelist walk runs
 * over the result using only the path-less changes.
 */
export function applyChangesToResume(
  resume: ResumeJSON,
  changes: HumanizerChange[]
): ResumeJSON {
  const pathedChanges = changes.filter(
    (c): c is HumanizerChange & { path: string } => Boolean(c.path)
  );
  const unpathedChanges = changes.filter((c) => !c.path);

  let current = resume;
  for (const change of pathedChanges) {
    const text = readLeafAtPath(current, change.path);
    if (text === null) continue;

    const newText = applyChangesToText(text, [change]);
    if (newText === text) continue;

    const op: ResumeOp = { op: "replace", path: change.path, value: newText };
    const { resume: updated, rejected } = applyResumeOps(current, [op]);
    if (rejected.length > 0) continue;

    current = updated;
  }

  if (unpathedChanges.length === 0) return current;

  const next = deepClone(current) as ResumeJSON;
  const apply = (t: string) => applyChangesToText(t, unpathedChanges);

  next.summary = apply(next.summary);
  next.experience = next.experience.map((exp) => ({
    ...exp,
    description: apply(exp.description),
    achievements: exp.achievements.map(apply),
  }));
  next.projects = next.projects.map((p) => ({
    ...p,
    description: apply(p.description),
  }));
  if (next.volunteer) {
    next.volunteer = next.volunteer.map((v) => ({
      ...v,
      description: apply(v.description),
    }));
  }
  if (next.awards) {
    next.awards = next.awards.map((a) => ({
      ...a,
      description: a.description ? apply(a.description) : a.description,
    }));
  }
  if (next.sectionLayout?.custom) {
    next.sectionLayout = {
      ...next.sectionLayout,
      custom: next.sectionLayout.custom.map((section) => ({
        ...section,
        items: section.items.map(apply),
      })),
    };
  }

  return next;
}
