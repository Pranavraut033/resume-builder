import {
  BUILTIN_SECTION_LABELS,
  BuiltinSectionId,
  canMoveColumn,
  getSectionLayout,
  ResumeJSON,
  SectionLayout,
} from "@/types/resume";

import { SectionInstance, TemplateConfig } from "./types";

/**
 * Resolve a section's effective column: the template's default
 * (`config.sectionColumn`), overridden by the user's per-resume
 * `sectionLayout.columns` when that's allowed.
 *
 * The `config.columns !== 2` guard is load-bearing, not defensive: the DOM
 * engine only renders column 0 for a 1-column template, so a stale
 * `columns[id] === 1` override left over from a 2-column template would
 * silently drop that section from DOM, PDF, and TXT alike. Same reason for
 * `canMoveColumn` — an override on a main-column-locked id (e.g.
 * `experience`) must never be honored.
 */
function resolveColumn(
  id: string,
  fallbackKey: string,
  config: TemplateConfig,
  layout: SectionLayout
): 0 | 1 {
  const base = config.sectionColumn?.[fallbackKey] ?? 0;
  if (config.columns !== 2 || !canMoveColumn(id, layout)) return base;
  return layout.columns[id] ?? base;
}

/**
 * Resolve a resume's effective ordered section list: applies
 * sectionLayout.order, drops hidden sections, injects custom sections, and
 * assigns each to a column per the template's sectionColumn map (overridden
 * by the user's sectionLayout.columns where movable — see resolveColumn).
 * Shared (pure, no DOM deps) by the DOM engine, the PDF engine, and TXT
 * export — the single source of truth for order/visibility/custom/column
 * across all three.
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
          column: resolveColumn(id, "custom", config, layout),
        };
      }

      const builtinId = id as BuiltinSectionId;
      if (!(builtinId in BUILTIN_SECTION_LABELS)) return null; // unknown id, drop

      return {
        id: builtinId,
        type: builtinId,
        title: BUILTIN_SECTION_LABELS[builtinId],
        column: resolveColumn(builtinId, builtinId, config, layout),
      };
    })
    .filter((s): s is SectionInstance => s !== null);
}
