# Inline WYSIWYG Resume Editor (V2) — Refined Plan

Status: Proposed
Date: 2026-06-11
Related docs: docs/PRD-inline-editor.md, docs/INLINE_EDITOR_NEW_PAGE_IMPLEMENTATION_PLAN.md

This refines the original document-first editor goal against the current
state of the `/job/[jobId]/inline` + `src/components/job-v2/` scaffold.
Builds on existing code — reuses `useJobPageContext`, `ResumeHistory`,
`@dnd-kit`, and the existing PDF pipeline. No new state library, no
localStorage.

## Goal

Remove the split preview/editor layout. Replace with a single rendered CV
surface where every element is directly editable in-place, styled to look
like a real CV at all times — true WYSIWYG, no modals/sidebars cluttering
the canvas.

## Current state (baseline)

- `/job/[jobId]/inline` page + `InlineJobPageLayout` already exist
  (uncommitted), implementing a 3-column layout: `SectionOutlinePanel` |
  `DocumentCanvas` | always-docked `ChatPanel`, plus `TemplatePicker` and
  `CustomizationDrawer`.
- `InlineField` (click-to-edit) component exists but is wired into nothing.
  `EditableSection` is only used as an invisible drag-handle overlay for
  section-level reordering. No resume text is `contenteditable` yet.
- 6 separate template components (~450–560 lines each: ModernMinimal,
  BusinessProfessional, TechSidebar, CreativeModern, ElegantTimeline,
  BJetProfessional), each hand-rendering JSX from `resume.*` with no shared
  field abstraction.
- State/undo-redo already solid: `useJobPageContext` provides `resume`,
  `customization`, `updateResumeState`, `updateCustomizationState`, and
  `historyRef` → `ResumeHistory` (fast-json-patch based undo/redo with
  labels).
- Persistence is DB-backed via `saveToDb` (react-query mutations to Prisma).
- PDF export already works and is decoupled — `react-pdf` with 12 separate
  PDF template components driven by the same `resume` + `customization`.
- Item-level drag-and-drop within sections (experience/education entries
  etc.) is NOT yet in V2. `onAddItem` hooks exist but aren't wired to
  factory/delete functions.
- No "Download JSON" export exists yet.

## Decisions

1. **Chat / Template / Theme UI** → move to floating action bar as
   toggleable overlays (not permanent columns/drawers).
2. **Template scope** → all 6 resume templates get inline editing in this
   effort (sequenced to de-risk repetition — see Phases).
3. **Persistence** → DB autosave only via existing `saveToDb`; no
   localStorage layer.

## Layout changes

- Remove `SectionOutlinePanel` and the always-docked `ChatPanel` column from
  `InlineJobPageLayout`. Single centered 794px document card, no side
  columns.
- New **floating action bar** (top-right, fixed):
  `Export PDF | Download JSON | Undo | Redo | Customize ▾ | Template ▾ | Chat 💬`
  - `Customize` → opens existing `CustomizationDrawer` as an overlay (slides
    over canvas, doesn't reflow it)
  - `Template` → opens existing `TemplatePicker` as a popover
  - `Chat` → toggles `ChatPanel` as a slide-in overlay (not a permanent
    column)
- `EditableSection` keeps section-level drag/visibility/add, rendered as
  on-canvas hover affordances (already mostly built).

## State / persistence

- All edits → `updateResumeState()` (existing) → feeds `ResumeHistory`
  automatically.
- `Ctrl+Z` / `Ctrl+Y` → `historyRef.current.undo()/redo()`.
- Autosave: debounce `saveToDb("resume", resume, customization)` on commit.
- `Download JSON`: new action mirroring `onTXTExport` — `Blob(JSON.stringify(resume))`
  download.

## Inline editing — all 6 templates

Each template (`ModernMinimalTemplate`, `BusinessProfessionalTemplate`,
`TechSidebarTemplate`, `CreativeModernTemplate`, `ElegantTimelineTemplate`,
`BJetProfessionalTemplate`) hand-renders JSX with no shared field
abstraction. Work happens per-template, per-section, replacing raw
`{resume.x.y}` interpolations with `<InlineField>` (already built, just
unused), preserving each template's existing classes/styles via
`className` / `renderDisplay`.

Field types to cover: name/title/contact (text), summary/descriptions
(textarea), bullet lists (bullet, Enter = new bullet), date ranges (two text
inputs), skills/tags (chip input).

Sequencing to de-risk the 6x repetition:

1. **Modern Minimal** first — establish the `InlineField` patterns for each
   section type (header, summary, experience, education, skills, projects,
   certifications, + optional sections).
2. Port the same patterns to the remaining 5 templates section-by-section,
   reusing the exact `InlineField` call shapes from step 1 (mechanical but
   still 5x the surface area).

## Item-level add/delete/reorder

- Currently missing in V2. Add per-item `@dnd-kit` `SortableContext` for
  Experience/Education/Projects/Certifications entries.
- Hover-revealed `×` (delete) and drag handle per item, positioned via a
  lightweight wrapper around each item's existing JSX block (minimal markup
  change — wrap, don't restructure).
- Wire `onAddItem` (already a prop on `EditableSection`) to actual factory
  functions that push new empty entries via `updateResumeState`.

## PDF export

Keep existing `react-pdf` pipeline (`generateResumePDF` /
`generateCoverLetterPDF`) as-is — it's already decoupled and
template/customization-driven. No html2canvas rewrite needed. Verify visual
parity per template after inline-editing changes land; fix drift in the
corresponding `*PDF.tsx` template if found.

## Phase order

1. Layout strip-down (remove side columns, add floating action bar with
   Customize/Template/Chat as overlays) + JSON export + undo/redo
   keybindings
2. Inline editing for Modern Minimal (all field types)
3. Item-level add/delete/reorder (Modern Minimal)
4. Port inline editing + item controls to remaining 5 templates
5. PDF parity pass across all templates

## Acceptance criteria

1. Open the app → see a CV, not a form
2. Click any text → edit it inline
3. Add / delete / reorder any entry
4. Undo/redo works across all operations
5. Export PDF produces a clean document matching what's on screen
