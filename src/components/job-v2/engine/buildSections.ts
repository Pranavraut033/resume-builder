import {
  BUILTIN_SECTION_LABELS,
  BuiltinSectionId,
  getSectionLayout,
  ResumeJSON,
} from "@/types/resume";

import { SectionInstance, TemplateConfig } from "./types";

/**
 * Resolve a resume's effective ordered section list: applies
 * sectionLayout.order, drops hidden sections, injects custom sections, and
 * assigns each to a column per the template's sectionColumn map. Shared
 * (pure, no DOM deps) by the DOM engine, the PDF engine, and TXT export — the
 * single source of truth for order/visibility/custom across all three.
 */
export function buildSections(
  resume: ResumeJSON,
  config: TemplateConfig
): SectionInstance[] {
  const layout = getSectionLayout(resume);

  return layout.order
    .filter((id) => !layout.hidden.includes(id))
    .map((id): SectionInstance | null => {
      const custom = layout.custom.find((c) => c.id === id);
      if (custom) {
        return {
          id,
          type: "custom",
          title: custom.title,
          column: config.sectionColumn?.["custom"] ?? 0,
        };
      }

      const builtinId = id as BuiltinSectionId;
      if (!(builtinId in BUILTIN_SECTION_LABELS)) return null; // unknown id, drop

      return {
        id: builtinId,
        type: builtinId,
        title: BUILTIN_SECTION_LABELS[builtinId],
        column: config.sectionColumn?.[builtinId] ?? 0,
      };
    })
    .filter((s): s is SectionInstance => s !== null);
}
