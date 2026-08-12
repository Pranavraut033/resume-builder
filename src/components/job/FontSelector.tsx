/**
 * Font Selector Component
 *
 * Searchable, grouped font picker with real specimen previews — every row
 * renders in its own typeface, backed by src/lib/fontLoader.ts (fetches the
 * actual font bytes and registers them via the Font Loading API, since the
 * app's CSP blocks a runtime <link> to fonts.googleapis.com). A sticky
 * footer previews whichever font is currently hovered/focused so browsing
 * doesn't require committing a selection.
 *
 * Built with Headless UI Combobox for accessibility and proper focus
 * management.
 */

"use client";

import {
  Combobox,
  ComboboxOption,
  ComboboxOptions,
  Transition,
} from "@headlessui/react";
import { Fragment, useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { loadGoogleFont } from "@/lib/fontLoader";
import { fontCategory, isSystemFont } from "@/lib/fonts/registry";
import { AVAILABLE_FONTS } from "@/types/customization";

interface FontSelectorProps {
  value: string;
  onChange: (font: string) => void;
}

const CATEGORY_LABEL: Record<string, string> = {
  sans: "Sans Serif",
  serif: "Serif",
  mono: "Monospace",
};

const CATEGORY_ORDER = ["sans", "serif", "mono"];

function FontOptionRow({
  font,
  selected,
  active,
  onActivePreview,
}: {
  font: string;
  selected: boolean;
  active: boolean;
  onActivePreview: (font: string) => void;
}) {
  useEffect(() => {
    if (active) onActivePreview(font);
  }, [active, font, onActivePreview]);

  return (
    <div className="flex items-center gap-3">
      <span
        className="text-agent-on-surface w-9 shrink-0 text-2xl leading-none"
        style={{ fontFamily: font }}
      >
        Ag
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-agent-on-surface truncate text-sm ${
              selected ? "font-semibold" : "font-medium"
            }`}
          >
            {font}
          </span>
          {isSystemFont(font) && (
            <span className="bg-agent-surface-highest text-agent-on-surface-variant shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium">
              System
            </span>
          )}
        </div>
        <div
          className="text-agent-on-surface-variant truncate text-xs"
          style={{ fontFamily: font }}
        >
          The quick brown fox jumps
        </div>
      </div>
      {selected && (
        <Icon name="check" className="text-agent-primary h-4 w-4 shrink-0" />
      )}
    </div>
  );
}

interface FontGroup {
  category: string;
  fonts: string[];
}

function getFontGroups(query: string): FontGroup[] {
  const filtered = AVAILABLE_FONTS.filter((font) =>
    font.toLowerCase().includes(query.toLowerCase())
  );

  return CATEGORY_ORDER.map((category) => ({
    category,
    fonts: filtered.filter((f) => fontCategory(f) === category),
  })).filter((g) => g.fonts.length > 0);
}

export default function FontSelector({ value, onChange }: FontSelectorProps) {
  const [query, setQuery] = useState("");
  const [previewFont, setPreviewFont] = useState<string | null>(null);

  const fontGroups = useMemo(() => getFontGroups(query), [query]);
  const allFilteredFonts = fontGroups.flatMap((g) => g.fonts);

  const selected = value || "Inter";
  const activeFont = previewFont ?? selected;

  // Prime every visible row with its base weight so the dropdown shows real
  // previews, not the fallback face — cheap (one small file per font,
  // cached after first open).
  const primeGroups = () => allFilteredFonts.forEach((f) => loadGoogleFont(f));

  const handleFontChange = (font: string) => {
    onChange(font);
    // Selection needs every weight the family ships (bold headings etc.);
    // the dropdown only prefetched a single preview weight.
    loadGoogleFont(font, { full: true });
    setQuery("");
  };

  return (
    <div className="relative w-full">
      <Combobox
        value={selected}
        onChange={(val) => val && handleFontChange(val)}
      >
        <div className="relative">
          <div className="relative">
            <Combobox.Input
              className="border-agent-outline bg-agent-surface-lowest text-agent-on-surface shadow-agent-card w-full rounded-lg border py-2 pr-9 pl-3 text-sm placeholder-gray-400 transition-all focus:ring-2 focus:outline-none"
              displayValue={(font: string) => font}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={(event) => {
                primeGroups();
                event.target.select();
              }}
              placeholder="Search fonts…"
              style={{ fontFamily: value }}
            />
            <Combobox.Button
              onClick={primeGroups}
              className="text-agent-on-surface-variant absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3"
            >
              <Icon name="chevronDown" className="h-4 w-4" />
            </Combobox.Button>
          </div>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => {
              setQuery("");
              setPreviewFont(null);
            }}
          >
            <ComboboxOptions className="border-agent-outline-variant bg-agent-surface shadow-agent-modal absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-lg border focus:outline-none">
              {query && (
                <div className="border-agent-outline-variant bg-agent-surface-high text-agent-on-surface-variant border-b px-3 py-1.5 text-xs font-semibold">
                  {allFilteredFonts.length} result
                  {allFilteredFonts.length !== 1 ? "s" : ""} for "{query}"
                </div>
              )}

              <div className="divide-agent-outline-variant max-h-[22rem] divide-y overflow-y-auto overscroll-contain">
                {fontGroups.length > 0 ? (
                  fontGroups.map((group) => (
                    <div key={group.category}>
                      <div className="bg-agent-surface-high text-agent-on-surface-variant sticky top-0 px-3 py-1.5 text-xs font-semibold">
                        {CATEGORY_LABEL[group.category]}
                      </div>

                      {group.fonts.map((font) => (
                        <ComboboxOption
                          key={font}
                          value={font}
                          onMouseEnter={() => setPreviewFont(font)}
                          onMouseLeave={() =>
                            setPreviewFont((cur) => (cur === font ? null : cur))
                          }
                          className={({ active }) =>
                            `relative cursor-pointer px-3 py-2 transition-colors select-none ${
                              active ? "bg-agent-surface-high" : ""
                            } ${
                              selected === font
                                ? "bg-agent-primary-container"
                                : ""
                            }`
                          }
                        >
                          {({ active }) => (
                            <FontOptionRow
                              font={font}
                              selected={selected === font}
                              active={active}
                              onActivePreview={setPreviewFont}
                            />
                          )}
                        </ComboboxOption>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="text-agent-on-surface-variant px-3 py-4 text-center text-sm">
                    No fonts found matching "{query}"
                  </div>
                )}
              </div>

              {allFilteredFonts.length > 0 && (
                <div className="border-agent-outline-variant bg-agent-surface-lowest sticky bottom-0 border-t p-3">
                  <p className="text-agent-on-surface-variant mb-1.5 text-xs">
                    Preview — {activeFont}
                  </p>
                  <div
                    className="border-agent-outline-variant bg-agent-surface-highest text-agent-on-surface rounded-md border px-3 py-2"
                    style={{ fontFamily: activeFont }}
                  >
                    <div className="truncate text-base font-semibold">
                      Jordan Alvarez
                    </div>
                    <div className="text-agent-on-surface-variant truncate text-sm">
                      Senior Product Designer — The quick brown fox jumps
                    </div>
                  </div>
                </div>
              )}
            </ComboboxOptions>
          </Transition>
        </div>
      </Combobox>
    </div>
  );
}
