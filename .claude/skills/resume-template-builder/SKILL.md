---
name: resume-template-builder
description: Add, audit, or visually polish resume templates in this app's TemplateConfig-driven rendering engine (src/components/job-v2/engine/, src/lib/pdf/). Use whenever the user wants a new resume template, reports a template that looks unpolished, broken, misaligned, or inconsistent, or asks to improve/fix/refine a template's design. Covers new TEMPLATE_CONFIG entries, threading a new style axis through the DOM and PDF engines, design fixes verified against real rendered output, and passing the distinctness gate. Does NOT cover cover-letter PDF templates (src/lib/pdf/templates/*CoverLetterPDF.tsx) — one hand-coded component each, no shared engine.
---

**Read [`.claude/knowledge/rendering.md`](../../knowledge/rendering.md) first** — it is the file map for this
surface (which file owns which engine, the style axes, the silent failure modes). This skill is the procedure;
that file is the map. Don't re-derive either from scratch.

Templates are a core selling point of this product — they need to look genuinely polished, not merely
structurally correct. Treat "it renders" as necessary but not sufficient.

## Design constraints

- **Tailwind v4 only.** No inline `style={{}}`, no `var()` in class strings, no arbitrary `[--token:value]` in
  JSX. Tokens go in `src/styles/global.css`'s `@theme {}` block. (React-PDF styles in `src/lib/pdf/` are plain
  objects and are exempt — Tailwind doesn't apply there.)
- For non-trivial visual work, invoke the `tailwind-ui-designer` skill rather than improvising.
- Contrast: body and heading text must clear WCAG AA (4.5:1). Check this specifically on
  `sidebarFill: "solid"` sidebars, where text is forced to `theme.backgroundColor` over `primaryColor` and the
  user picks both.
- Visual hierarchy: name > headline > section headings > body. Nothing else competes.

## Adding a template

**Default path: a fresh combination of existing axis values.** With 10 templates shipped this is almost always
achievable — a ~30-line diff across three files. Read the existing `TEMPLATE_CONFIG` entries and `AXIS_KEYS`
in the distinctness test to see what's taken before concluding otherwise.

**If no existing combination gets the requested look, stop and report** which axis you need and why. Do not
thread a new axis without explicit confirmation — it touches ~6,000 lines across four files with almost no
test coverage, and a mis-threaded branch silently breaks _other_ templates rather than erroring.

1. **`src/types/customization.ts`** — add the id to `TemplateType` and a full `AVAILABLE_TEMPLATES` entry.
   `fontFamily` **must** be in `AVAILABLE_FONTS` (same file) or `validateCustomization()` throws
   `"Invalid font family selected."`, **and** must resolve in `src/lib/pdf/fonts.ts` or it silently becomes
   Helvetica in the PDF only. Prefer a family an existing template already uses. `Verdana`/`Trebuchet MS` are
   valid but map to Helvetica in PDF — never pick them for a template whose identity is its typeface.
2. **`src/components/job-v2/engine/templates.ts`** — add the `TEMPLATE_CONFIG[id]` entry. Confirm the id
   landed in **all three** of `TemplateType`, `AVAILABLE_TEMPLATES`, and `TEMPLATE_CONFIG` — miss the third
   and everything stays green while the template silently renders as Modern Minimal.
3. **`tests/lib/templateDistinctness.test.tsx`** — bump the `covers all N templates` count. This is the one
   assertion a new template is supposed to change.
4. Run the gate (below), then `npm run lint:fix && npm run format && npm run type-check`.
5. Verify visually (below) and confirm distinctness by eye, not just by test.

`TemplateRenderer.tsx` needs no entry — a template is picked up automatically once it's in `TEMPLATE_CONFIG`
and `AVAILABLE_TEMPLATES`.

### Worked example — `two-tone` as a diff

```
customization.ts   + "two-tone" to TemplateType
                   + { id: "two-tone", name: "Two-Tone", description: "…",
                       fontFamily: "Poppins",        // ∈ AVAILABLE_FONTS ✓ and GOOGLE_FONTS ✓
                       features: [...], bestFor: "…" }
templates.ts       + "two-tone": { columns: 2, columnRatio: [0.38, 0.62], sectionColumn: {…},
                       header: "split", heading: "accent-rule", entryStyle: "standard",
                       skillStyle: "columns", bulletStyle: "disc", sidebarFill: "tint",
                       photoShape: "squircle", photoFrame: "shadow" }
distinctness test  ~ toHaveLength(8) → toHaveLength(9)
```

Three files, no engine changes, no new axis. That is the shape a new template should have.

### Adding an axis (only after confirmation)

1. Run `codegraph_callers`/`codegraph_impact` on the symbol **before editing anything**.
2. Add the value to the union in `customization.ts`, plus a `CONFIG_DEFAULTS` entry and a `ResolvedFields`
   member in `templates.ts`/`types.ts` if optional.
3. Thread the branch through the DOM side (`TemplateEngine.tsx`, plus `engine/sections.tsx` if it affects
   section content) **and** the PDF side (`PDFTemplateEngine.tsx`, `lib/pdf/sections.tsx`). Not
   `resolveStyles.ts`. Not the TXT builders.
4. **Parity check:** grep both engines for the axis name and confirm branch counts match. No test enforces
   PDF parity — a value implemented in DOM and forgotten in PDF leaves the suite green and the export broken.
   (`header: "band"` and `"left-accent"` exist on both sides but are unused by any template — available
   combinations, not gaps.)
5. Each new DOM branch must wrap the _same_ `EditableText`/`EditableDateRange` fields its siblings use — never
   substitute plain text, or editability parity fails.
6. Add the axis to `AXIS_KEYS` in the distinctness test.

## Running the gate

Run the **full suite** — `npm run test:run`. `buildSections`, `txtExport`, `pdfExport`, `resolveStyles`, and
`paginator` all cover this surface and break before the distinctness test does.

Then read `tests/lib/templateDistinctness.test.tsx` by assertion:

| Failure                             | Meaning                                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| `covers all N templates`            | Expected when adding a template. Bump the count.                                        |
| axis-overlap (`only N axes differ`) | Your config is too close to a sibling. Change the **config**, never the `≥3` threshold. |
| markup collision                    | Two templates render byte-identical DOM. A real bug in your DOM branch.                 |
| editability parity                  | Your branch exposes fewer editable fields than siblings. A real bug in your DOM branch. |

Never relax the last three.

**The ≥3-axis gate is necessary, not sufficient.** It can be satisfied by axes that barely show:
`photoShape`/`photoFrame` count but render nothing under the test fixture (`photoDataUrl: null`, no
`InlineEditProvider`); `headingSidebar` defaults to `heading`, so changing `heading` scores two axes for one
decision; `columnRatio`/`sectionColumn`/`headingSmallCaps` aren't counted at all. If your only differences
from a sibling are photo treatment and date styling, the template is **not** distinct — change `columns`,
`header`, `entryStyle`, or `skillStyle`. Confirm by screenshotting it beside its two nearest siblings.

## Verifying visually

Required for every design/polish fix and every new template. The dev database is normally empty
(`prisma/dev.db` is 0 bytes on a fresh checkout), so there's no job page to open until you make one.

1. `npm run db:push` if the database is empty, then seed one realistic job + resume with a throwaway Prisma
   script **in the scratchpad** (never committed): 3+ experience entries with 4+ long bullets each, 15+ skills
   across categories, a photo data URL, a long summary, education, and a custom section. Most spacing,
   overflow, contrast, and pagination bugs only appear at real content lengths — the distinctness test's
   `fixtureResume` is deliberately minimal and hides exactly the bugs you're hunting.
2. `preview_start` the `dev` config from `.claude/launch.json` (port 3008). It invokes `next dev` directly and
   skips `predev`, so run `npm run predev` first if `packages/llm-core` or `packages/ats-checker` aren't built.
   Check `preview_logs` and `read_console_messages` if the page doesn't come up — don't guess at a boot failure.
3. Navigate to `/job/<seeded id>`, switch templates via the picker, and screenshot **before** changing anything.
4. **PDF:** the in-app export triggers a browser download you can't open. Render it directly — a scratchpad
   script calling `@react-pdf/renderer`'s `renderToFile` on `PDFTemplateEngine` with the same fixture — then
   open it with `Read` (its `pages` parameter renders PDF pages visually). Required whenever you touched a
   PDF-side branch.
5. Re-screenshot after the fix and compare, in both DOM and (if applicable) PDF.
6. If you cannot produce a screenshot or rendered PDF, say so and label the change **unverified**. Never
   describe a code read-through as a visual check.

## Fixing design/polish issues

An unpolished template is a real defect, not a nice-to-have. Reproduce visually first, then:

1. **Diagnose at the right layer.** Generic problems (cramped spacing, poor contrast, inconsistent headings,
   awkward line-height) are usually bugs in a _shared_ branch — the engines' axis handling, or
   `bulletGlyph.ts`/`photoFrame.ts` — and fixing them there improves every template using that axis value,
   which is almost always what's wanted. Only patch a single `TEMPLATE_CONFIG` entry when the issue is
   genuinely specific to that combination (e.g. a `sidebarFill`+`skillStyle` pairing clipping text).
2. **Worth checking on any polish pass:** visual hierarchy, contrast on `sidebarFill: "solid"`, consistent
   padding/gaps across sections, PDF pagination (no orphaned headings at a page bottom, no mid-entry breaks),
   and graceful handling of missing optional fields (photo, headline, links) instead of dangling gaps.
3. **Re-run the gate even for "just a polish fix."** Nudging a shared axis can make two templates read as more
   similar or trip markup collision.

## When the request is ambiguous

If a design request ("make it feel more premium", "cleaner") can't be pinned to specific axes, state your
interpretation as 2–3 concrete axis choices up front and proceed. Don't invent an axis to resolve ambiguity,
and don't block on a question you can answer with a defensible default.

## Never

- Modify anything under `landing/`.
- Write or edit `src/lib/pdf/templates/*CoverLetterPDF.tsx`.
- Relax the axis-overlap, markup-collision, or editability-parity assertions.
- Widen `TxtSectionBuilder`'s signature to make a style axis reach TXT export.
- Add a font to `AVAILABLE_FONTS`, or use inline `style={{}}` / arbitrary Tailwind tokens in JSX.
- Thread a new axis through the engines without confirming it first.

## Out of scope, but must be reported

Two things break silently downstream. You can't fix either — flag both.

- **Cover letters.** `COVER_LETTER_TEMPLATE_MAP` in `src/lib/pdfExport.ts` maps template id → a hand-coded
  `*CoverLetterPDF.tsx`, `?? ModernMinimalCoverLetterPDF`. A new resume template is unmapped, so its cover
  letter silently exports as Modern Minimal. Don't write the component — every report for a **newly added
  template** must say the cover-letter template is unmapped and needs human follow-up.
- **Landing-page screenshots.** `landing/src/components/sections/Features.astro` hardcodes marketing
  screenshots for 3 templates (`tech-sidebar`, `modern-minimal`, `creative-modern`) by filename, decoupled
  from `AVAILABLE_TEMPLATES`. If a fix meaningfully changes one of those three, say so explicitly.

## Report format

Be literal about the verification fields:

```
Template(s):        <ids added or modified>
Files touched:      <paths>
New axis:           none | <axis + every file it's threaded through>
Full suite:         pass | fail (<which tests>)
Distinctness test:  pass | fail (<which assertion>)
DOM verified:       screenshot | not verified (<why>)
PDF verified:       rendered + read | not applicable | not verified (<why>)
Cover letter:       n/a | UNMAPPED — <id> exports as Modern Minimal, needs follow-up
Landing screenshot: n/a | STALE — <id> changed, needs regeneration
```
