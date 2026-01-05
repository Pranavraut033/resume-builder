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

import { Combobox, Transition } from "@headlessui/react";
import { Fragment, useState, useMemo } from "react";

import { Icon } from "@/components/ui/Icon";
import { loadGoogleFont } from "@/lib/fontLoader";
import { AVAILABLE_FONTS } from "@/types/resume";

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

export function FontSelector({
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
          <div className="relative flex w-full">
            <Combobox.Input
              className="w-full rounded-l-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-300"
              displayValue={(font: string) => font}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search fonts..."
              style={{ fontFamily: value }}
            />
            <Combobox.Button className="pointer-events-auto absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3 transition-colors hover:text-gray-600 dark:hover:text-gray-300">
              <Icon name="chevronDown" className="h-4 w-4 text-gray-400" />
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
            <Combobox.Options className="absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg focus:outline-none dark:border-gray-600 dark:bg-gray-700">
              {/* Search Results Info */}
              {query && (
                <div className="sticky top-0 border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400">
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
                      <div className="sticky top-0 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        {group.category}
                      </div>

                      {/* Fonts in Category */}
                      {group.fonts.map((font) => (
                        <Combobox.Option
                          key={font}
                          value={font}
                          className={({ active }) =>
                            `relative cursor-pointer py-2 pr-3 pl-8 transition-colors select-none ${
                              active
                                ? "bg-blue-50 dark:bg-blue-900"
                                : "text-gray-900 dark:text-gray-100"
                            } ${
                              value === font
                                ? "bg-blue-50 dark:bg-blue-900"
                                : ""
                            }`
                          }
                        >
                          {({ selected }) => (
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`block truncate text-sm ${
                                  selected || value === font
                                    ? "font-semibold text-blue-900 dark:text-blue-100"
                                    : "font-normal"
                                }`}
                                style={{ fontFamily: font }}
                              >
                                {font}
                              </span>
                              {(selected || value === font) && (
                                <Icon
                                  name="check"
                                  className="h-4 w-4 shrink-0 text-blue-500 dark:text-blue-300"
                                />
                              )}
                            </div>
                          )}
                        </Combobox.Option>
                      ))}
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No fonts found matching "{query}"
                  </div>
                )}
              </div>

              {/* Preview Section - Sticky Bottom */}
              {allFilteredFonts.length > 0 && (
                <div className="sticky bottom-0 border-t border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
                  <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">
                    Preview
                  </p>
                  <div
                    className="rounded border border-gray-200 bg-white p-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    style={{ fontFamily: value }}
                  >
                    The quick brown fox jumps
                  </div>
                </div>
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
    </div>
  );
}
