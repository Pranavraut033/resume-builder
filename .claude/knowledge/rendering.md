# Rendering — templates, the three engines, pagination, export

Read this for: adding/fixing a resume template, anything under `src/components/job-v2/engine/` or
`src/lib/pdf/`, PDF/TXT export, pagination, page background/theme resolution.

**To actually add or polish a template, invoke the `resume-template-builder` skill** — it carries the
procedure (axis selection, the gate, visual verification, what to report). This file is the map it reads first.

## Core idea

**Templates are config, not components.** Section content (order, visibility, custom sections) is resolved
once by `buildSections()` and rendered by **three engines from the same `TemplateConfig` + section registry**,
so DOM, PDF, and TXT stay in sync by construction. Adding a template should mean adding a config object — if
you find yourself writing a new component per template, stop and check whether an existing style axis
expresses it.

## The 10 templates

`TEMPLATE_CONFIG` in `src/components/job-v2/engine/templates.ts` is a
`Partial<Record<TemplateType, TemplateConfig>>` keyed by:

`modern-minimal` · `tech-sidebar` · `creative-modern` · `bjet-professional` · `two-tone` ·
`business-professional` · `compact-modern` · `academic-serif` · `elegant-timeline` · `euro-sidebar`

`resolveTemplateConfig()` applies defaults once so every engine sees the same fully-resolved config.

### Style axes

`columns` and `heading` are the only **required** axes. Everything else is optional with a default in
`CONFIG_DEFAULTS` (`templates.ts`): `header`, `entryStyle`, `photoShape`, `photoFrame`, `skillStyle`,
`dateStyle`, `bulletStyle`, `sidebarSide`, `sidebarFill`, `headerSpan`, `justifyText`, `nameWeight`,
`sectionDivider`, `headingAlign` — plus uncounted extras like `columnRatio`, `sectionColumn`,
`headingSmallCaps`, `headingSidebar`.

`resolveTemplateConfig()` applies those defaults, so **engines must always read the resolved config**, never a
raw `TemplateConfig`.

**`tests/lib/templateDistinctness.test.tsx` enforces two invariants**: every pair of templates differs on
**≥3 axes**, and all templates expose **identical editable fields**. The second is the one that bites — a new
`entryStyle`/`skillStyle` branch must re-wrap the same `EditableText`/`EditableDateRange` fields as the
`standard` branch, not replace them with plain text, or inline editing silently dies for that template.

## Invariants & silent failure modes

These fail green — no type error, no test failure, just wrong output. Know them before touching this surface.

- **`TEMPLATE_CONFIG` is `Partial<Record<…>>`, so a missing entry is not a type error.** The distinctness test
  derives its id list from `Object.keys(TEMPLATE_CONFIG)`, so it won't notice either. A template registered in
  `TemplateType` + `AVAILABLE_TEMPLATES` but missing from `TEMPLATE_CONFIG` silently renders as
  `modern-minimal` while `type-check` and the whole suite stay green. **An id must land in all three places.**
- **`AVAILABLE_TEMPLATES` (`src/types/customization.ts`) is the source of truth for valid ids** —
  `validateCustomization()` derives `VALID_TEMPLATE_IDS` from it and rejects anything else at the write
  boundary.
- **A `fontFamily` not in `src/lib/pdf/fonts.ts` (`GOOGLE_FONTS`/`SYSTEM_FONT_MAP`) resolves to Helvetica in
  the PDF only** — no error, so the export silently stops matching the preview. `Verdana` and `Trebuchet MS`
  are valid `AVAILABLE_FONTS` entries that do exactly this.
- **TXT export is config-blind by design.** `TxtSectionBuilder` receives only `{ resume, instance }` — no
  style axis ever reaches it. TXT changes only when section order/column/visibility changes via
  `buildSections()`. Never widen that signature to make an axis reach TXT.
- **There is no DOM↔PDF parity test.** The two engines mirror each other by hand; an axis implemented in
  `TemplateEngine.tsx` and forgotten in `PDFTemplateEngine.tsx` leaves the suite green and the export broken.
  Grep both sides and compare branch counts.
- **`resolveStyles.ts` reads nothing from `TemplateConfig`** and has no axis branches — a new axis never
  belongs there.
- **Cover letters are unmapped for new templates.** `COVER_LETTER_TEMPLATE_MAP` in `src/lib/pdfExport.ts`
  falls back to `ModernMinimalCoverLetterPDF`, so a new resume template's cover letter silently exports as
  Modern Minimal.

## Files

### DOM engine (`src/components/job-v2/engine/`)

| File                              | Purpose                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| `templates.ts`                    | `TEMPLATE_CONFIG` (all 10) + `resolveTemplateConfig()`.                                     |
| `types.ts`                        | `TemplateConfig` and the style-axis unions.                                                 |
| `buildSections.ts`                | `buildSections()` — resolves order/visibility/custom sections. Shared by all three engines. |
| `sections.tsx`                    | DOM section registry.                                                                       |
| `TemplateEngine.tsx`              | DOM/WYSIWYG renderer.                                                                       |
| `bulletGlyph.ts`, `photoFrame.ts` | Style primitives shared between DOM and PDF.                                                |

`src/components/job/templates/TemplateRenderer.tsx` dispatches `customization.template` into `TemplateEngine`,
falling back to `modern-minimal` for a legacy/unrecognized value. (Originally adapted from the Resumify
project — see `LICENSE-THIRD-PARTY.md`.)

### PDF engine (`src/lib/pdf/`)

Mirrors the DOM engine for `@react-pdf/renderer`.

| File                    | Purpose                                                                                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PDFTemplateEngine.tsx` | PDF renderer, same `TemplateConfig` input as the DOM engine.                                                                                                                                                                   |
| `sections.tsx`          | PDF section registry (the mirror of the DOM one — change both together).                                                                                                                                                       |
| `resolveStyles.ts`      | Config → react-pdf style objects.                                                                                                                                                                                              |
| `fonts.ts`              | Font registration for PDF output.                                                                                                                                                                                              |
| `htmlToPdf.tsx`         | Converts the rich-text HTML stored in resume fields into PDF nodes.                                                                                                                                                            |
| `fitScale.ts`           | Backs `Customization.fitToPage` — scales font/spacing to force a single page.                                                                                                                                                  |
| `templates/`            | **Cover-letter PDF templates only** — still one hand-coded component per template (`ModernMinimalCoverLetterPDF.tsx`, `TechSidebarCoverLetterPDF.tsx`, …), plus a legacy `ModernMinimalPDF.tsx` and `shared/SectionGroup.tsx`. |

> Cover letters have **no shared engine** — they remain one component per template. That is a known gap, and
> it is out of scope for the `resume-template-builder` skill.

### Export

- `src/lib/pdfExport.ts` — PDF export entry point.
- `src/lib/txtExport.ts` + `src/lib/resumeToText.ts` — TXT export (the third engine).
- `src/lib/download.ts` — browser/desktop download plumbing.

### Pagination

- `src/lib/paginator.ts` — `groupBlocksIntoPages()`: greedy bin-packing of block heights into pages. **A block
  is never split across a page boundary.** Takes `firstPageReserved` (header height on page 0 only) and
  `gapPx` (inter-block margin, not applied before a page's first block).
- `src/hooks/useBlockPaginator.ts` — measures real DOM block heights and feeds the paginator.
- `src/lib/pageDimensions.ts` — page size constants (A4 / Letter).

### Styling inputs

- `src/types/customization.ts` — `Customization` / `SanitizedCustomization`, `DEFAULT_CUSTOMIZATION`,
  `validateCustomization`.
- `src/hooks/useResolveCustomization.ts` — resolves the stored row (including the legacy-scalars →
  `themeJson` fallback described in [data-layer.md](data-layer.md)) into what the engines consume.
- `src/lib/backgrounds/` — page background patterns (`Customization.background`).
- `src/lib/colorUtils.ts`, `src/lib/fontLoader.ts`, `src/lib/fonts/`, `src/lib/theme/` — supporting resolution.

## Adding a template — checklist

1. Add the id to `TemplateType` and a config to `TEMPLATE_CONFIG`.
2. Prefer composing existing axes. Only add a new axis if none can express the look — and then thread it
   through **both** `engine/sections.tsx` and `pdf/sections.tsx`.
3. Add the matching cover-letter PDF component in `src/lib/pdf/templates/`.
4. Run `npm run test:run -- tests/lib/templateDistinctness.test.tsx` — it will fail on <3-axis distinctness or
   a dropped editable field.
5. Verify rendered output, not just the test.
