"use client";

import { useJobPageContext } from "@/contexts/JobPageContext";
import { legacyToTheme } from "@/lib/theme/legacyToTheme";
import { HeadingStyle, PerSectionOverride } from "@/types/customization";
import { BUILTIN_SECTION_LABELS, BuiltinSectionId, getSectionLayout } from "@/types/resume";

const HEADING_STYLE_OPTIONS: { value: HeadingStyle; label: string }[] = [
  { value: "underline", label: "Underline" },
  { value: "uppercase", label: "Uppercase" },
  { value: "bar", label: "Side bar" },
  { value: "serif", label: "Serif italic" },
];

/**
 * SectionThemeOverrides — per-section color/heading-style overrides, layered
 * on top of the global theme. Lives in CustomizationDrawer below the
 * existing (shared, V1) ThemeCustomizationPanel rather than modifying that
 * component — keeps this V2-only feature additive and isolated.
 *
 * Persists to Customization.themeJson (ThemeConfig.perSection), resolved by
 * TemplateEngine/legacyToTheme. PDF/per-section overrides for react-pdf are
 * a follow-up (see plan) — this drives the screen renderer only for now.
 */
export function SectionThemeOverrides() {
  const { resume, customization, updateCustomizationState } = useJobPageContext();
  const sectionLayout = getSectionLayout(resume);
  const theme = legacyToTheme(customization);

  const labelFor = (id: string) =>
    BUILTIN_SECTION_LABELS[id as BuiltinSectionId] ??
    sectionLayout.custom.find((c) => c.id === id)?.title ??
    id;

  const setOverride = (id: string, patch: PerSectionOverride) => {
    const nextPerSection = { ...theme.perSection };
    const merged = { ...nextPerSection[id], ...patch };
    // Drop the key entirely once it's back to "no override" so themeJson
    // doesn't accumulate empty entries.
    if (Object.values(merged).every((v) => v === undefined || v === "")) {
      delete nextPerSection[id];
    } else {
      nextPerSection[id] = merged;
    }
    updateCustomizationState({
      themeJson: JSON.stringify({ ...theme, perSection: nextPerSection }),
    });
  };

  return (
    <div className="border-agent-outline-variant border-t px-4 py-4">
      <h3 className="text-agent-on-surface mb-1 text-xs font-semibold tracking-wide uppercase opacity-70">
        Per-section style
      </h3>
      <p className="text-agent-on-surface-variant mb-3 text-xs">
        Override color and heading style for individual sections.
      </p>
      <div className="flex flex-col gap-2">
        {sectionLayout.order.map((id) => {
          const override = theme.perSection?.[id];
          return (
            <div key={id} className="flex items-center gap-2">
              <span className="text-agent-on-surface min-w-0 flex-1 truncate text-xs">
                {labelFor(id)}
              </span>
              <input
                type="color"
                value={override?.color ?? theme.colors[0]}
                onChange={(e) => setOverride(id, { color: e.target.value })}
                className="h-6 w-6 cursor-pointer rounded border-none bg-transparent p-0"
                title="Heading color"
              />
              <select
                value={override?.headingStyle ?? ""}
                onChange={(e) =>
                  setOverride(id, {
                    headingStyle: (e.target.value || undefined) as
                      | HeadingStyle
                      | undefined,
                  })
                }
                className="text-agent-on-surface bg-agent-surface-container rounded border-none px-1.5 py-1 text-xs"
                title="Heading style"
              >
                <option value="">Default</option>
                {HEADING_STYLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
