import { deepClone } from "fast-json-patch";

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

export function applyChangesToResume(
  resume: ResumeJSON,
  changes: HumanizerChange[]
): ResumeJSON {
  const next = deepClone(resume) as ResumeJSON;
  const apply = (t: string) => applyChangesToText(t, changes);

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
