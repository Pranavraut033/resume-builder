import { useMemo } from "react";

import { useJobPageContext } from "@/contexts/JobPageContext";
import BackgroundSvg from "@/lib/backgrounds/BackgroundSvg";
import { AVAILABLE_BACKGROUNDS, BackgroundId } from "@/lib/backgrounds/types";
import { DateFormat, formatMonthYear, VALID_DATE_FORMATS } from "@/lib/date";
import { debounce } from "@/lib/debounce";
import { getPageDimensions } from "@/lib/pageDimensions";
import { legacyToTheme } from "@/lib/theme/legacyToTheme";
import {
  TemplateType,
  COLOR_PRESETS,
  HeadingStyle,
  PerSectionOverride,
  Template,
  ThemeColors,
  VALID_FONT_SIZES,
  VALID_MARGIN_SIZES,
  VALID_LETTER_SPACINGS,
} from "@/types/customization";
import { getSectionLayout } from "@/types/resume";

const DATE_FORMAT_EXAMPLE = "2020-01";

const HEADING_STYLE_OPTIONS: { value: HeadingStyle; label: string }[] = [
  { value: "underline", label: "Underline" },
  { value: "uppercase", label: "Uppercase" },
  { value: "bar", label: "Side bar" },
  { value: "serif", label: "Serif italic" },
];

/** Derives a full ThemeColors tuple from a single user-picked hex — secondary/accent
 * are darkened shades of the same hue so the picked color still reads as one theme. */
function buildCustomColors(hex: string): ThemeColors {
  const shade = (factor: number) => {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 255) * factor);
    const g = Math.round(((n >> 8) & 255) * factor);
    const b = Math.round((n & 255) * factor);
    return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  };
  return [hex, shade(0.75), shade(0.55), "#1f2937", "#ffffff"];
}

import { Card } from "../ui";
import FontSelector from "./FontSelector";
import TemplateSelector from "./TemplateSelector";

const SWATCH_WIDTH = 240;
const SWATCH_HEIGHT = 320;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type Props = {
  // No props for now, but we can add callbacks or state setters if needed
};

const ThemeCustomizationPanel: React.FC<Props> = ({}) => {
  const {
    resume,
    customization,
    updateCustomizationState: updateCustomization,
  } = useJobPageContext();

  const colorsTuple = customization.colors.split(",") as ThemeColors;
  const pageBackgroundColor = colorsTuple[4] || "#ffffff";

  const sectionLayout = getSectionLayout(resume);
  const theme = legacyToTheme(customization);
  // A single global control that fans out to every section's `perSection`
  // override (the storage/resolution TemplateEngine already reads) — so
  // "Default" means no sections have an override, and picking a value
  // applies it to all of them at once rather than one section at a time.
  const globalOverrideValue = <K extends keyof PerSectionOverride>(
    key: K
  ): PerSectionOverride[K] | undefined => {
    const values = sectionLayout.order.map(
      (id) => theme.perSection?.[id]?.[key]
    );
    const [first] = values;
    return first !== undefined && values.every((v) => v === first)
      ? first
      : undefined;
  };
  const setGlobalOverride = (patch: Partial<PerSectionOverride>) => {
    const nextPerSection = { ...theme.perSection };
    for (const id of sectionLayout.order) {
      const merged = { ...nextPerSection[id], ...patch };
      // Drop the key entirely once it's back to "no override" so themeJson
      // doesn't accumulate empty entries.
      if (Object.values(merged).every((v) => v === undefined || v === "")) {
        delete nextPerSection[id];
      } else {
        nextPerSection[id] = merged;
      }
    }
    updateCustomization({
      themeJson: JSON.stringify({ ...theme, perSection: nextPerSection }),
    });
  };
  const globalHeadingStyle = globalOverrideValue("headingStyle");
  const globalHeadingColor = globalOverrideValue("color");

  // Native color inputs fire "input" continuously while dragging — debounce
  // so we don't push a state update (and re-render the whole preview) per pixel.
  const handleCustomColorChange = useMemo(
    () =>
      debounce(
        (hex: string) =>
          updateCustomization({ colors: buildCustomColors(hex).join(",") }),
        150
      ),
    [updateCustomization]
  );
  const { widthPx: pageWidthPx, heightPx: pageHeightPx } = getPageDimensions(
    customization.pageFormat,
    customization.marginSize
  );
  const pageAspectRatio = pageWidthPx / pageHeightPx;

  return (
    <div className="relative flex flex-col gap-4 p-4">
      {/* Template selection */}
      <TemplateSelector
        selectedTemplate={customization.template as TemplateType}
        onSelectTemplate={(template: Template) =>
          updateCustomization({
            template: template.id,
            fontFamily: template.fontFamily,
          })
        }
      />

      {/* Layout settings */}
      <Card className="space-y-2">
        <h3
          className="mb-3 text-sm font-semibold"
          style={{ color: "var(--color-agent-on-surface)" }}
        >
          Layout Settings
        </h3>

        <div>
          <p
            className="mb-2 text-xs font-medium"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Margins
          </p>
          <div
            className="flex rounded-lg p-0.5"
            style={{ background: "var(--color-agent-surface-container)" }}
          >
            {VALID_MARGIN_SIZES.map((m) => (
              <button
                key={m}
                onClick={() => updateCustomization({ marginSize: m })}
                className="flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-all"
                style={
                  customization.marginSize === m
                    ? {
                        background: "var(--color-agent-primary-container)",
                        color: "var(--color-agent-on-primary-container)",
                      }
                    : { color: "var(--color-agent-on-surface-variant)" }
                }
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p
            className="mb-2 text-xs font-medium"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Fit to One Page
          </p>
          <div
            className="flex rounded-lg p-0.5"
            style={{ background: "var(--color-agent-surface-container)" }}
          >
            {[
              { value: false, label: "Off" },
              { value: true, label: "On" },
            ].map(({ value, label }) => (
              <button
                key={label}
                onClick={() => updateCustomization({ fitToPage: value })}
                className="flex-1 rounded-md py-1.5 text-xs font-medium transition-all"
                style={
                  Boolean(customization.fitToPage) === value
                    ? {
                        background: "var(--color-agent-primary-container)",
                        color: "var(--color-agent-on-primary-container)",
                      }
                    : { color: "var(--color-agent-on-surface-variant)" }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p
            className="mb-2 text-xs font-medium"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Font Size
          </p>
          <div
            className="flex rounded-lg p-0.5"
            style={{ background: "var(--color-agent-surface-container)" }}
          >
            {VALID_FONT_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => updateCustomization({ fontSize: size })}
                className="flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-all"
                style={
                  customization.fontSize === size
                    ? {
                        background: "var(--color-agent-primary-container)",
                        color: "var(--color-agent-on-primary-container)",
                      }
                    : { color: "var(--color-agent-on-surface-variant)" }
                }
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p
            className="mb-2 text-xs font-medium"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Line Height
          </p>
          <div
            className="flex rounded-lg p-0.5"
            style={{ background: "var(--color-agent-surface-container)" }}
          >
            {VALID_LETTER_SPACINGS.map((spacing) => (
              <button
                key={spacing}
                onClick={() => updateCustomization({ lineHeight: spacing })}
                className="flex-1 rounded-md py-1.5 text-xs font-medium capitalize transition-all"
                style={
                  customization.lineHeight === spacing
                    ? {
                        background: "var(--color-agent-primary-container)",
                        color: "var(--color-agent-on-primary-container)",
                      }
                    : { color: "var(--color-agent-on-surface-variant)" }
                }
              >
                {spacing}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p
            className="mb-2 text-xs font-medium"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Date Format
          </p>
          <div className="flex flex-wrap gap-1.5">
            {VALID_DATE_FORMATS.map((format) => (
              <button
                key={format}
                onClick={() => updateCustomization({ dateFormat: format })}
                className="rounded-md px-2 py-1.5 text-xs font-medium transition-all"
                style={
                  (customization.dateFormat as DateFormat | undefined) ===
                  format
                    ? {
                        background: "var(--color-agent-primary-container)",
                        color: "var(--color-agent-on-primary-container)",
                      }
                    : {
                        background: "var(--color-agent-surface-container)",
                        color: "var(--color-agent-on-surface-variant)",
                      }
                }
              >
                {format === "locale"
                  ? "Locale"
                  : formatMonthYear(DATE_FORMAT_EXAMPLE, format)}
              </button>
            ))}
          </div>
        </div>

        {/* Color accent */}
        <div>
          <p
            className="mb-2 text-xs font-medium"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Color Accent
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                title={preset.name}
                onClick={() =>
                  updateCustomization({ colors: preset.colors.join(",") })
                }
                className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  background: preset.hex,
                  borderColor:
                    colorsTuple[1] === preset.colors[1]
                      ? "var(--color-agent-on-surface)"
                      : "transparent",
                }}
              />
            ))}
            {/* Custom color: native picker drives primaryColor, secondary/accent derived */}
            <label
              title="Custom color"
              className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border-2 transition-transform hover:scale-110"
              style={{
                background: `conic-gradient(from 0deg, red, yellow, lime, cyan, blue, magenta, red)`,
                borderColor: !COLOR_PRESETS.some(
                  (p) => p.colors[1] === colorsTuple[1]
                )
                  ? "var(--color-agent-on-surface)"
                  : "transparent",
              }}
            >
              <input
                type="color"
                defaultValue={colorsTuple[0]}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>

        {/* Background */}
        <div>
          <p
            className="mb-2 text-xs font-medium"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Background
          </p>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_BACKGROUNDS.map((bg) => (
              <button
                key={bg.id}
                title={bg.name}
                onClick={() => updateCustomization({ background: bg.id })}
                className="relative h-20 overflow-hidden rounded-md border-2 transition-transform hover:scale-105"
                style={{
                  aspectRatio: pageAspectRatio,
                  background: pageBackgroundColor,
                  borderColor:
                    (customization.background as BackgroundId | undefined) ===
                    bg.id
                      ? "var(--color-agent-primary)"
                      : "var(--color-agent-outline-variant)",
                }}
              >
                <BackgroundSvg
                  background={bg.id}
                  colors={colorsTuple}
                  width={SWATCH_WIDTH}
                  height={SWATCH_HEIGHT}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Font */}
        <div>
          <p
            className="mb-2 text-xs font-medium"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Font
          </p>
          <FontSelector
            value={customization.fontFamily ?? "Inter"}
            onChange={(font: string) =>
              updateCustomization({ fontFamily: font })
            }
          />
        </div>

        {/* Global heading style override — applies to every section's
            `perSection` entry at once (see setGlobalOverride above). */}
        <div>
          <p
            className="mb-2 text-xs font-medium"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            Heading Style
          </p>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={globalHeadingColor ?? colorsTuple[0]}
              onChange={(e) => setGlobalOverride({ color: e.target.value })}
              className="h-7 w-7 cursor-pointer rounded border-none bg-transparent p-0"
              title="Heading color"
            />
            <select
              value={globalHeadingStyle ?? ""}
              onChange={(e) =>
                setGlobalOverride({
                  headingStyle: (e.target.value || undefined) as
                    | HeadingStyle
                    | undefined,
                })
              }
              className="flex-1 rounded border-none px-1.5 py-1.5 text-xs"
              style={{
                color: "var(--color-agent-on-surface)",
                background: "var(--color-agent-surface-container)",
              }}
            >
              <option value="">Default</option>
              {HEADING_STYLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ThemeCustomizationPanel;
