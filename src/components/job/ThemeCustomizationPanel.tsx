import { useMemo, useState } from "react";

import {
  resolveTemplateConfig,
  TEMPLATE_CONFIG,
} from "@/components/job-v2/engine/templates";
import {
  Button,
  Card,
  SegmentedControl,
  Select,
  SettingsRow,
  Toggle,
} from "@/components/ui";
import { useJobPageContext } from "@/contexts/JobPageContext";
import BackgroundSvg from "@/lib/backgrounds/BackgroundSvg";
import { AVAILABLE_BACKGROUNDS, BackgroundId } from "@/lib/backgrounds/types";
import cn from "@/lib/cn";
import { DateFormat, formatMonthYear, VALID_DATE_FORMATS } from "@/lib/date";
import { debounce } from "@/lib/debounce";
import {
  DOCUMENT_SIZE_CONFIG,
  DOCUMENT_SIZES,
  DocumentSize,
  documentSizeOf,
} from "@/lib/documentSize";
import { legacyToTheme } from "@/lib/theme/legacyToTheme";
import {
  TemplateType,
  AVAILABLE_COVER_LETTER_TEMPLATES,
  AVAILABLE_TEMPLATES,
  COLOR_PRESETS,
  CoverLetterTemplateType,
  DEFAULT_CUSTOMIZATION,
  FontSize,
  HeadingStyle,
  Leading,
  MarginSize,
  PageFormat,
  PerSectionOverride,
  Template,
  ThemeColors,
  VALID_COVER_LETTER_TEMPLATE_IDS,
  VALID_FONT_SIZES,
  VALID_MARGIN_SIZES,
  VALID_LETTER_SPACINGS,
} from "@/types/customization";
import { getSectionLayout } from "@/types/resume";

import FontSelector from "./FontSelector";
import TemplateSelector from "./TemplateSelector";

const DATE_FORMAT_EXAMPLE = "2020-01";
const dateFormatLabel = (format: DateFormat) =>
  format === "locale"
    ? "Locale default"
    : formatMonthYear(DATE_FORMAT_EXAMPLE, format);

const HEADING_STYLE_OPTIONS: { value: HeadingStyle; label: string }[] = [
  { value: "underline", label: "Underline" },
  { value: "uppercase", label: "Uppercase" },
  { value: "bar", label: "Side bar" },
  { value: "serif", label: "Serif italic" },
];
const DEFAULT_HEADING_LABEL = "Default";

// `lineHeight` is the unitless line-height ratio of body text (1.375 / 1.5 /
// 1.625 — see useResolveCustomization.ts and pdf/resolveStyles.ts), i.e.
// spacing between lines, not the font size.
const LINE_SPACING_LABEL: Record<Leading, string> = {
  small: "Tight",
  medium: "Normal",
  large: "Relaxed",
};

const PAGE_FORMAT_OPTIONS: { value: PageFormat; label: string }[] = [
  { value: "a4", label: "A4" },
  { value: "letter", label: "Letter" },
];

// Stacks a SettingsRow's control under its label (the drawer is too narrow
// for side-by-side) and stretches a SegmentedControl across the row.
const STACKED_ROW = "flex-col items-stretch gap-2";
const SEGMENTS =
  "w-full flex-wrap capitalize [&>button]:flex-1 [&>button]:justify-center [&>button]:px-2 [&>button]:text-xs";

const COLOR_INPUT =
  "h-7 w-7 cursor-pointer appearance-none overflow-hidden rounded-full border-2 border-agent-outline-variant bg-transparent p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch-wrapper]:p-0";

const SWATCH_WIDTH = 240;
const SWATCH_HEIGHT = 320;

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

/**
 * Controlled native color input. Native pickers fire "input" continuously
 * while dragging, so edits show instantly in a local draft and only the
 * debounced value is committed upstream (a state update re-renders the whole
 * preview). The draft re-syncs whenever `value` changes from outside, e.g. a
 * template switch.
 */
function ColorInput({
  value,
  onCommit,
  label,
  className,
}: {
  value: string;
  onCommit: (hex: string) => void;
  label: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setDraft(value);
  }

  // Rebuilt per onCommit identity (every parent render); a pending timer from
  // an older instance still fires, so no committed edit is lost.
  const commit = useMemo(() => debounce(onCommit, 150), [onCommit]);

  return (
    <input
      type="color"
      aria-label={label}
      title={label}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        commit(e.target.value);
      }}
      className={cn(COLOR_INPUT, className)}
    />
  );
}

const ThemeCustomizationPanel: React.FC = () => {
  const {
    resume,
    contentType,
    customization,
    updateCustomizationState: updateCustomization,
  } = useJobPageContext();
  const isResume = contentType === "resume";

  const colorsTuple = customization.colors.split(",") as ThemeColors;
  const pageBackgroundColor = colorsTuple[4] || "#ffffff";
  // Templates whose header visibly blends/blocks two distinct colors
  // (gradient header, split colour-block header) need an independent
  // accent-color picker — everywhere else accentColor is just a derived
  // shade of the primary color, so a second picker would be noise.
  const rawTemplateConfig =
    TEMPLATE_CONFIG[customization.template as TemplateType];
  const resolvedTemplateConfig = rawTemplateConfig
    ? resolveTemplateConfig(rawTemplateConfig)
    : null;
  const supportsAccentColor =
    resolvedTemplateConfig?.header === "gradient" ||
    resolvedTemplateConfig?.header === "split";

  // The current template's own defaults — used to offer a reset once the
  // user has explicitly diverged from them (colors/background only change
  // automatically on template switch; any other change here is the user's
  // deliberate choice and is never overwritten on its own). Font size,
  // margins, line spacing, date format and per-section overrides (heading
  // color/style, gap, hidden) don't have a per-template default, so "reset"
  // snaps those back to the app's stock defaults.
  //
  // Resume and cover letter each have their own Customization row
  // (JobPageContext re-seeds `customization` per document), so a reset only
  // ever touches the active tab's row. Fit-to-one-page is resume-only and
  // the cover-letter template is cover-letter-only, so each tab resets just
  // its own.
  const currentTemplateMeta = AVAILABLE_TEMPLATES.find(
    (t) => t.id === customization.template
  );
  const templateDefaultColors = currentTemplateMeta?.colors?.join(",");
  const templateDefaultBackground = currentTemplateMeta?.background ?? "none";
  const dateFormat =
    (customization.dateFormat as DateFormat | undefined) ?? "locale";
  const hasDivergedFromTemplateDefaults =
    (templateDefaultColors !== undefined &&
      customization.colors !== templateDefaultColors) ||
    (customization.background ?? "none") !== templateDefaultBackground ||
    (currentTemplateMeta !== undefined &&
      customization.fontFamily !== currentTemplateMeta.fontFamily) ||
    customization.fontSize !== DEFAULT_CUSTOMIZATION.fontSize ||
    customization.marginSize !== DEFAULT_CUSTOMIZATION.marginSize ||
    customization.lineHeight !== DEFAULT_CUSTOMIZATION.lineHeight ||
    dateFormat !== DEFAULT_CUSTOMIZATION.dateFormat ||
    (isResume
      ? Boolean(customization.fitToPage) !== DEFAULT_CUSTOMIZATION.fitToPage
      : customization.coverLetterTemplate != null) ||
    !!customization.themeJson;
  const resetToTemplateDefaults = () =>
    updateCustomization({
      ...(templateDefaultColors && { colors: templateDefaultColors }),
      background: templateDefaultBackground,
      ...(currentTemplateMeta && {
        fontFamily: currentTemplateMeta.fontFamily,
      }),
      fontSize: DEFAULT_CUSTOMIZATION.fontSize,
      marginSize: DEFAULT_CUSTOMIZATION.marginSize,
      lineHeight: DEFAULT_CUSTOMIZATION.lineHeight,
      dateFormat: DEFAULT_CUSTOMIZATION.dateFormat,
      themeJson: null,
      ...(isResume
        ? { fitToPage: DEFAULT_CUSTOMIZATION.fitToPage }
        : { coverLetterTemplate: DEFAULT_CUSTOMIZATION.coverLetterTemplate }),
    });

  // Heading Style is a resume-only control (it fans out over resume section
  // ids below) — skip computing it on the cover-letter path.
  const sectionLayout = isResume ? getSectionLayout(resume) : null;
  const theme = legacyToTheme(customization);
  // A single global control that fans out to every section's `perSection`
  // override (the storage/resolution TemplateEngine already reads) — so
  // "Default" means no sections have an override, and picking a value
  // applies it to all of them at once rather than one section at a time.
  const globalOverrideValue = <K extends keyof PerSectionOverride>(
    key: K
  ): PerSectionOverride[K] | undefined => {
    if (!sectionLayout) return undefined;
    const values = sectionLayout.order.map(
      (id) => theme.perSection?.[id]?.[key]
    );
    const [first] = values;
    return first !== undefined && values.every((v) => v === first)
      ? first
      : undefined;
  };
  const setGlobalOverride = (patch: Partial<PerSectionOverride>) => {
    if (!sectionLayout) return;
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

  const documentSize = documentSizeOf(customization);
  const primaryMatchesPreset = COLOR_PRESETS.some(
    (p) => p.colors[0].toLowerCase() === colorsTuple[0]?.toLowerCase()
  );
  const coverLetterFallsBack =
    customization.coverLetterTemplate == null &&
    !VALID_COVER_LETTER_TEMPLATE_IDS.has(
      customization.template as CoverLetterTemplateType
    );

  return (
    <div className="relative flex flex-col gap-4 p-4">
      {/* Template selection */}
      <TemplateSelector
        selectedTemplate={customization.template as TemplateType}
        onSelectTemplate={(template: Template) =>
          updateCustomization({
            template: template.id,
            fontFamily: template.fontFamily,
            ...(template.colors && { colors: template.colors.join(",") }),
            // Always explicit, never inherited: a template with no default
            // background resets to "none" rather than keeping whatever the
            // previously selected template left behind.
            background: template.background ?? "none",
          })
        }
      />
      {/* Cover-letter template — independent of the resume template above.
          Only shown while customizing the cover letter; null (unset) falls
          back to the resume template (see CoverLetterRenderer.tsx). */}
      {!isResume && (
        <Card padding="sm">
          <h3 className="text-agent-on-surface mb-1 text-sm font-semibold">
            Cover Letter Template
          </h3>
          <p className="text-agent-on-surface-variant mb-3 text-xs">
            Pick a template for the cover letter, or follow the resume template.
          </p>
          <div className="flex flex-col gap-1.5">
            {[
              { id: null, name: "Same as resume" },
              ...AVAILABLE_COVER_LETTER_TEMPLATES,
            ].map((t) => {
              const isSelected =
                (customization.coverLetterTemplate ?? null) === t.id;

              return (
                <button
                  key={t.id ?? "same-as-resume"}
                  aria-pressed={isSelected}
                  onClick={() =>
                    updateCustomization({ coverLetterTemplate: t.id })
                  }
                  className={cn(
                    "rounded-md px-2 py-1.5 text-left text-xs font-medium transition-all",
                    isSelected
                      ? "bg-agent-primary-container text-agent-on-primary-container"
                      : "bg-agent-surface-container text-agent-on-surface-variant"
                  )}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
          {coverLetterFallsBack && (
            <p className="text-agent-on-surface-variant mt-2 text-xs">
              Uses Modern Minimal
            </p>
          )}
        </Card>
      )}

      {/* Layout */}
      <Card padding="sm" className="space-y-4">
        <h3 className="text-agent-on-surface text-sm font-semibold">Layout</h3>

        <SettingsRow
          className={STACKED_ROW}
          label="Size"
          description={
            documentSize === null
              ? "Custom (set via Advanced below)"
              : "Sets font size, margins, line spacing, and spacing together"
          }
          control={
            <SegmentedControl<DocumentSize>
              ariaLabel="Size"
              className={SEGMENTS}
              // null (a hand-mixed Custom triple) matches no option, so none
              // is highlighted.
              value={documentSize as DocumentSize}
              onChange={(size) => {
                const preset = DOCUMENT_SIZE_CONFIG[size];
                updateCustomization({
                  fontSize: preset.fontSize,
                  marginSize: preset.marginSize,
                  lineHeight: preset.lineHeight,
                });
              }}
              options={DOCUMENT_SIZES.map((size) => ({
                value: size,
                label: size,
              }))}
            />
          }
        />

        {isResume && (
          <SettingsRow
            label="Fit to one page"
            control={
              <Toggle
                label="Fit to one page"
                checked={Boolean(customization.fitToPage)}
                onChange={(fitToPage) => updateCustomization({ fitToPage })}
              />
            }
          />
        )}

        <SettingsRow
          className={STACKED_ROW}
          label="Page size"
          control={
            <SegmentedControl<PageFormat>
              ariaLabel="Page size"
              className={SEGMENTS}
              value={customization.pageFormat === "letter" ? "letter" : "a4"}
              onChange={(pageFormat) => updateCustomization({ pageFormat })}
              options={PAGE_FORMAT_OPTIONS}
            />
          }
        />

        <details className="group">
          <summary className="text-agent-on-surface-variant mb-2 cursor-pointer text-xs font-medium select-none">
            Advanced (override Size individually)
          </summary>
          <div className="space-y-3 pt-1">
            <SettingsRow
              className={STACKED_ROW}
              label="Margins"
              control={
                <SegmentedControl<MarginSize>
                  ariaLabel="Margins"
                  className={SEGMENTS}
                  value={customization.marginSize as MarginSize}
                  onChange={(marginSize) => updateCustomization({ marginSize })}
                  options={VALID_MARGIN_SIZES.map((m) => ({
                    value: m,
                    label: m,
                  }))}
                />
              }
            />
            <SettingsRow
              className={STACKED_ROW}
              label="Font size"
              control={
                <SegmentedControl<FontSize>
                  ariaLabel="Font size"
                  className={SEGMENTS}
                  value={customization.fontSize as FontSize}
                  onChange={(fontSize) => updateCustomization({ fontSize })}
                  options={VALID_FONT_SIZES.map((size) => ({
                    value: size,
                    label: size,
                  }))}
                />
              }
            />
            <SettingsRow
              className={STACKED_ROW}
              label="Line spacing"
              description="Space between lines of text"
              control={
                <SegmentedControl<Leading>
                  ariaLabel="Line spacing"
                  className={SEGMENTS}
                  value={customization.lineHeight as Leading}
                  onChange={(lineHeight) => updateCustomization({ lineHeight })}
                  options={VALID_LETTER_SPACINGS.map((spacing) => ({
                    value: spacing,
                    label: LINE_SPACING_LABEL[spacing],
                  }))}
                />
              }
            />
          </div>
        </details>

        <SettingsRow
          className={STACKED_ROW}
          label="Date format"
          control={
            // Select, not segments: five date examples wrap mid-label in
            // the drawer's width.
            <Select
              value={dateFormatLabel(dateFormat)}
              onChange={(label) => {
                const format = VALID_DATE_FORMATS.find(
                  (f) => dateFormatLabel(f) === label
                );
                if (format) updateCustomization({ dateFormat: format });
              }}
              options={VALID_DATE_FORMATS.map(dateFormatLabel)}
            />
          }
        />
      </Card>

      {/* Colors & background */}
      <Card padding="sm" className="space-y-4">
        <h3 className="text-agent-on-surface text-sm font-semibold">
          Colors &amp; Background
        </h3>

        {/* Primary color */}
        <SettingsRow
          className={STACKED_ROW}
          label="Primary color"
          control={
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((preset) => {
                const isActive =
                  colorsTuple[0]?.toLowerCase() ===
                  preset.colors[0].toLowerCase();
                return (
                  <button
                    key={preset.name}
                    title={preset.name}
                    aria-label={`${preset.name} color`}
                    aria-pressed={isActive}
                    onClick={() =>
                      updateCustomization({ colors: preset.colors.join(",") })
                    }
                    className={cn(
                      "h-7 w-7 overflow-hidden rounded-full border-2 p-0 transition-transform hover:scale-110",
                      isActive
                        ? "border-agent-on-surface"
                        : "border-transparent"
                    )}
                  >
                    <svg
                      viewBox="0 0 1 1"
                      className="h-full w-full"
                      aria-hidden
                    >
                      <rect width="1" height="1" fill={preset.hex} />
                    </svg>
                  </button>
                );
              })}
              {/* Custom color: native picker drives primaryColor, secondary/accent derived */}
              <span
                className={cn(
                  "bg-color-wheel relative inline-block h-7 w-7 overflow-hidden rounded-full border-2 transition-transform hover:scale-110",
                  primaryMatchesPreset
                    ? "border-transparent"
                    : "border-agent-on-surface"
                )}
              >
                <ColorInput
                  label="Custom primary color"
                  value={colorsTuple[0]}
                  onCommit={(hex) =>
                    updateCustomization({
                      colors: buildCustomColors(hex).join(","),
                    })
                  }
                  className="absolute inset-0 h-full w-full border-0 opacity-0"
                />
              </span>
            </div>
          }
        />

        {/* Accent color — only for templates whose header visibly blends or
            blocks a second color (gradient/split), e.g. creative-modern,
            two-tone. Elsewhere accentColor is just a derived shade, so a
            second picker would be noise. Overwrites only accentColor (tuple
            index 2), preserving the rest. */}
        {supportsAccentColor && (
          <SettingsRow
            label="Accent color"
            control={
              <ColorInput
                label="Accent color"
                value={colorsTuple[2]}
                onCommit={(hex) => {
                  const next = customization.colors.split(",") as ThemeColors;
                  next[2] = hex;
                  updateCustomization({ colors: next.join(",") });
                }}
              />
            }
          />
        )}

        {/* Background */}
        <SettingsRow
          className={STACKED_ROW}
          label="Background"
          control={
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_BACKGROUNDS.map((bg) => {
                const isActive =
                  (customization.background as BackgroundId | undefined) ===
                  bg.id;
                return (
                  <button
                    key={bg.id}
                    title={bg.name}
                    aria-label={`${bg.name} background`}
                    aria-pressed={isActive}
                    onClick={() => updateCustomization({ background: bg.id })}
                    className={cn(
                      "relative aspect-3/4 h-20 overflow-hidden rounded-md border-2 transition-transform hover:scale-105",
                      isActive
                        ? "border-agent-primary"
                        : "border-agent-outline-variant"
                    )}
                  >
                    <svg className="absolute inset-0 h-full w-full" aria-hidden>
                      <rect
                        width="100%"
                        height="100%"
                        fill={pageBackgroundColor}
                      />
                    </svg>
                    <BackgroundSvg
                      background={bg.id}
                      colors={colorsTuple}
                      width={SWATCH_WIDTH}
                      height={SWATCH_HEIGHT}
                    />
                  </button>
                );
              })}
            </div>
          }
        />
      </Card>

      {/* Typography */}
      <Card padding="sm" className="space-y-4">
        <h3 className="text-agent-on-surface text-sm font-semibold">
          Typography
        </h3>

        <SettingsRow
          className={STACKED_ROW}
          label="Font"
          control={
            <FontSelector
              value={customization.fontFamily ?? "Inter"}
              onChange={(font: string) =>
                updateCustomization({ fontFamily: font })
              }
            />
          }
        />

        {/* Global heading style/color override — applies to every section's
            `perSection` entry at once (see setGlobalOverride above).
            Resume-only: it fans out over resume section ids, which a cover
            letter (one freeform body) doesn't have. */}
        {isResume && (
          <>
            <SettingsRow
              className={STACKED_ROW}
              label="Heading style"
              control={
                <Select
                  value={
                    HEADING_STYLE_OPTIONS.find(
                      (o) => o.value === globalHeadingStyle
                    )?.label ?? DEFAULT_HEADING_LABEL
                  }
                  onChange={(label) =>
                    setGlobalOverride({
                      headingStyle: HEADING_STYLE_OPTIONS.find(
                        (o) => o.label === label
                      )?.value,
                    })
                  }
                  options={[
                    DEFAULT_HEADING_LABEL,
                    ...HEADING_STYLE_OPTIONS.map((o) => o.label),
                  ]}
                />
              }
            />
            <SettingsRow
              label="Heading color"
              control={
                <div className="flex items-center gap-2">
                  {globalHeadingColor !== undefined && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setGlobalOverride({ color: undefined })}
                    >
                      Default
                    </Button>
                  )}
                  <ColorInput
                    label="Heading color"
                    value={globalHeadingColor ?? colorsTuple[0]}
                    onCommit={(color) => setGlobalOverride({ color })}
                  />
                </div>
              }
            />
          </>
        )}
      </Card>

      {/* Floating — pinned to the bottom of the scrollable drawer regardless
          of scroll position, since a plain inline button here is easy to
          miss without scrolling all the way down. */}
      {hasDivergedFromTemplateDefaults && (
        <div className="bg-agent-surface-lowest border-agent-outline-variant sticky bottom-0 z-10 -mx-4 -mb-4 border-t px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur-sm">
          <button
            onClick={resetToTemplateDefaults}
            className="bg-agent-surface-container text-agent-on-surface w-full rounded-lg py-2 text-xs font-medium transition-colors"
          >
            Reset to template defaults
          </button>
        </div>
      )}
    </div>
  );
};

export default ThemeCustomizationPanel;
