/**
 * Font Selector Component
 * Interactive font selector with:
 * - Live font preview showing selected font
 * - Search functionality to filter fonts (Headless UI Combobox)
 * - Font category grouping (Google Fonts vs System Fonts)
 * - Smooth scrolling dropdown with proper overflow handling
 * - Visual indication of selected font
 *
 * Built with Headless UI Combobox for accessibility and proper focus management.
 *
 * Usage:
 * <FontSelector
 *   value="Inter"
 *   onChange={(font) => setFont(font)}
 * />
 */

"use client";

import {
  Combobox,
  ComboboxOption,
  ComboboxOptions,
  Transition,
} from "@headlessui/react";
import { Fragment, useState, useMemo } from "react";

import { Icon } from "@/components/ui/Icon";
import { loadGoogleFont } from "@/lib/fontLoader";
import { AVAILABLE_FONTS } from "@/types/customization";

interface FontSelectorProps {
  value: string;
  onChange: (font: string) => void;
  onFontLoad?: () => void;
}

// Google Fonts that support preview
const GOOGLE_FONTS = [
  "Inter",
  "Poppins",
  "Roboto",
  "Montserrat",
  "Lora",
  "Open Sans",
  "Source Sans Pro",
  "Merriweather",
  "Raleway",
  "Ubuntu",
  "Nunito",
  "Georgia",
  "Playfair Display",
];

// System fonts
const SYSTEM_FONTS = [
  "Arial",
  "Times New Roman",
  "Helvetica",
  "Verdana",
  "Trebuchet MS",
  "Garamond",
  "Courier New",
];

// Group fonts by category for better UX
interface FontGroup {
  category: string;
  fonts: string[];
}

const getFontGroups = (query: string): FontGroup[] => {
  const filtered = AVAILABLE_FONTS.filter((font) =>
    font.toLowerCase().includes(query.toLowerCase())
  );

  const groups: FontGroup[] = [];

  const googleFiltered = filtered.filter((f) => GOOGLE_FONTS.includes(f));
  if (googleFiltered.length > 0) {
    groups.push({ category: "Google Fonts", fonts: googleFiltered });
  }

  const systemFiltered = filtered.filter((f) => SYSTEM_FONTS.includes(f));
  if (systemFiltered.length > 0) {
    groups.push({ category: "System Fonts", fonts: systemFiltered });
  }

  return groups;
};

export default function FontSelector({
  value,
  onChange,
  onFontLoad,
}: FontSelectorProps) {
  const [query, setQuery] = useState("");

  const fontGroups = useMemo(() => getFontGroups(query), [query]);
  const allFilteredFonts = fontGroups.flatMap((g) => g.fonts);

  const handleFontChange = (font: string) => {
    onChange(font);
    if (GOOGLE_FONTS.includes(font)) {
      loadGoogleFont(font);
    }
    onFontLoad?.();
    setQuery("");
  };

  return (
    <div className="relative w-full">
      <Combobox
        value={value || "Inter"}
        onChange={(val) => val && handleFontChange(val)}
      >
        <div className="relative">
          {/* Trigger Button with Preview and Search Input */}
          <div className="relative flex w-full items-center">
            <Combobox.Input
              className={`border-agent-outline bg-agent-surface-lowest text-agent-on-surface shadow-agent-card w-full rounded-l-lg border px-3 py-2 text-sm placeholder-gray-400 transition-all focus:ring-2 focus:outline-none`}
              displayValue={(font: string) => font}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search fonts..."
              style={{ fontFamily: value }}
            />
            <Combobox.Button className="pointer-events-auto absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3 transition-colors">
              <div className="text-agent-primary rounded-r-lg px-2 py-1">
                <Icon name="chevronDown" className="h-4 w-4" />
              </div>
            </Combobox.Button>
          </div>

          {/* Dropdown Menu with Proper Scrolling */}
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery("")}
          >
            <ComboboxOptions className="border-agent-outline-variant bg-agent-surface shadow-agent-modal absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-lg border focus:outline-none">
              {/* Search Results Info */}
              {query && (
                <div className="border-agent-outline-variant bg-agent-surface-high text-agent-on-surface-variant sticky top-0 border-b px-3 py-2 text-xs font-semibold">
                  {allFilteredFonts.length} result
                  {allFilteredFonts.length !== 1 ? "s" : ""} for "{query}"
                </div>
              )}

              {/* Font List with Proper Scrolling */}
              <div className="max-h-64 divide-y divide-gray-100 overflow-y-auto dark:divide-gray-600">
                {fontGroups.length > 0 ? (
                  fontGroups.map((group) => (
                    <div key={group.category}>
                      {/* Category Header - Sticky */}
                      <div className="bg-agent-surface-high text-agent-on-surface-variant sticky top-0 px-3 py-2 text-xs font-semibold">
                        {group.category}
                      </div>

                      {/* Fonts in Category */}
                      {group.fonts.map((font) => (
                        <ComboboxOption
                          key={font}
                          value={font}
                          className={({ active }) =>
                            `relative cursor-pointer py-2 pr-3 pl-8 transition-colors select-none ${
                              active
                                ? "bg-agent-primary-container text-agent-on-primary"
                                : "text-agent-on-surface"
                            } ${value === font ? "bg-agent-primary-container" : ""}`
                          }
                        >
                          {({ selected }) => (
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`block truncate text-sm ${
                                  selected || value === font
                                    ? "text-agent-on-primary font-semibold"
                                    : "font-normal"
                                }`}
                                style={{ fontFamily: font }}
                              >
                                {font}
                              </span>
                              {(selected || value === font) && (
                                <Icon
                                  name="check"
                                  className="text-agent-tertiary h-4 w-4 shrink-0"
                                />
                              )}
                            </div>
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

              {/* Preview Section - Sticky Bottom */}
              {allFilteredFonts.length > 0 && (
                <div className="border-agent-outline-variant sticky bottom-0 rounded-t-md border-t bg-(--color-agent-surface-lowest) p-3">
                  <p className="text-agent-on-surface-variant mb-2 text-xs">
                    Preview
                  </p>
                  <div
                    className={`border-agent-outline-variant bg-agent-surface-highest text-agent-on-surface shadow-shadow-agent-card rounded border p-2 text-sm`}
                    style={{ fontFamily: value }}
                  >
                    The quick brown fox jumps
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
