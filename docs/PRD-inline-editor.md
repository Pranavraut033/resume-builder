# PRD: Inline Resume & Cover Letter Editor

**Status:** Draft  
**Date:** 2026-06-01  
**Scope:** UI overhaul for `ResumeEditor` and `CoverLetterEditor` — no backend changes

---

## 1. Overview

The target is a live resume editor where the resume is always visible as a **fully formatted document** — what you see is exactly what gets exported. The resume renders in a structured template layout with name, headline, and contact details at the top and sections like Summary, Experience, Skills, and Certifications flowing naturally below. Content is editable directly in the preview by clicking any field; changes reflect instantly without a save-to-preview step.

AI-powered suggestions are highlighted **inline on the text itself** — underlined or annotated directly in the document — so users can spot and act on improvements without leaving the page. A conversational AI assistant runs **alongside the editor** (not behind a modal), letting users make changes or ask questions in plain language. The result is a dual-mode workflow: edit manually by clicking fields, or describe what you want to the AI and let it apply the change — whichever feels faster in the moment.

Concretely: replace the current two-panel (form sidebar + separate preview) editing experience with a **document-first, WYSIWYG editor** where the rendered resume/cover letter IS the editing surface. Users click directly on text within a live-rendered document to edit it, drag entire sections to reorder them, and see AI suggestions overlaid on the live document — all within the existing job page frame.

The header (job info, Resume/Cover Letter tab switcher, save button) and the secondary toolbar (undo/redo, editor/export tabs) are **unchanged**.

---

## 2. Goals

| Goal | Success Metric |
|---|---|
| WYSIWYG: the document canvas output matches the export exactly | No visible difference between canvas render and downloaded PDF |
| Users edit fields by clicking on them in the rendered document | Zero form-panel visits needed for basic edits |
| Section order is reorderable by drag-and-drop at the document level | Sections can be dragged and dropped in the preview |
| AI suggestions appear as inline highlights on the document text | Suggestions visible without opening any panel or modal |
| The AI chat assistant is visible alongside the document, not behind a FAB | Chat panel is persistently docked next to the canvas in a dedicated column |
| Cover letter inline editing replaces the separate RTE panel | Full-screen cover letter document with click-to-edit |
| Template switching is available inline without leaving the editor | One-click switch with instant re-render, no data loss |
| Customization options (colors, fonts, spacing) are accessible from the editor surface | User can adjust theme without navigating away from the document |
| No layout regression on the header / tab switching area | Header parity with current design |

---

## 3. Non-Goals

- No changes to data models (`ResumeJSON`, cover letter string, `SanitizedCustomization`)
- No changes to server actions, context, or save logic
- No new AI generation features (existing hooks reused)
- No new templates (existing templates are reused as-is)
- No mobile-specific redesign (desktop-first, same as today)
- The right-side preview panel used in "export" tab remains unchanged
- ATS panel remains unchanged
- The `ChatPanel` component internals are unchanged; only its docking/visibility behavior in the layout is updated

---

## 4. Current State vs. Target State

### Resume Editor

| Aspect | Current | Target |
|---|---|---|
| **Primary surface** | Left sidebar (section nav) + center form panel + right preview | Single scrollable WYSIWYG document canvas with inline editing |
| **Editing model** | Click section in left nav → fill in text fields in center panel | Click any text in the rendered document → editable input appears in-place |
| **AI suggestions** | Chat response replaces full text blocks | Inline highlights/underlines on specific text in the live document; one-click to accept |
| **AI chat** | Hidden behind a floating FAB button | Persistently docked in a side column alongside the document canvas |
| **Section reorder** | Not supported at section level (only items within a section) | Drag handle on each section header to reorder sections |
| **Item reorder (within section)** | Already works via `@dnd-kit` in SectionEditor | Preserved; drag handles appear on hover within each section |
| **Left sidebar** | Always-visible section navigation (56px) | Replaced by a **compact section outline panel** that collapses; sections scroll into view when clicked |
| **Preview** | Separate resizable right panel showing `TemplateRenderer` | The center document canvas IS the template renderer (WYSIWYG) with editing affordances overlaid |

### Cover Letter Editor

| Aspect | Current | Target |
|---|---|---|
| **Primary surface** | Left panel: RTE (rich-text editor) + right panel: rendered preview | Single full-height document canvas showing the rendered cover letter, click body text to enter RTE mode inline |
| **Generate button** | Top of left panel | Moves to a floating action bar above the document (matching the resume section toolbar pattern) |
| **Model selector** | Top of left panel | Moves to the same floating action bar |

---

## 5. Layout Architecture

### 5.1 Overall Frame (unchanged)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  HEADER: BackButton · Job Info · Status · [Resume|CL] · Save             │
├──────────────────────────────────────────────────────────────────────────┤
│  TOOLBAR: Undo · Redo · Template · Customize · (edit|export tabs)        │
├──────────────┬───────────────────────────────────┬───────────────────────┤
│  OUTLINE     │                                   │                       │
│  PANEL       │      DOCUMENT CANVAS (WYSIWYG)    │   AI CHAT PANEL       │
│  (collapsible│      (center scroll area)         │   (persistently docked│
│   ~220px)    │      with inline suggestions      │    ~360px, resizable) │
│              │                                   │                       │
└──────────────┴───────────────────────────────────┴───────────────────────┘
```

The AI chat panel is **always visible alongside the document** in the edit tab — not behind a FAB. Users can switch between clicking fields manually and typing instructions to the AI without any mode change. A **customization drawer** slides in from the right (over the chat panel) when the user opens theme/template controls. The resizable **right preview panel** is removed from the "edit" tab. The document canvas is the single source of truth for both editing and preview. The right preview panel (with zoom controls) remains in the **export** tab only.

### 5.2 Toolbar Row (additions)

The existing undo/redo + edit/export tab row gains two new controls on the right side:

- **Template picker**: a compact dropdown (or icon button that opens a popover) showing the current template name with a preview thumbnail. Selecting a new template calls `updateCustomizationState({ template })` — same as the existing `TemplateSelector`.
- **Customize button**: opens the customization drawer (colors, fonts, spacing, page format). Uses the existing `ThemeCustomizationPanel` mounted inside the drawer.

Both controls replace the need to navigate to the export tab to change appearance.

### 5.3 Outline Panel (replaces `ResumeSectionNav`)

- Collapsible via a toggle button in the toolbar row
- Shows section names as anchor links — clicking scrolls the document canvas to that section
- When collapsed, shows only icons (same `NAV_ITEMS` icons)
- For cover letter: shows document structure (Header, Body, Signature)

### 5.4 Customization Drawer

- Triggered by the **Customize** toolbar button
- Slides in from the right at ~320px width; document canvas shrinks to accommodate (same resize mechanic as the current chat panel)
- Contains the existing `ThemeCustomizationPanel` (primary color, secondary color, accent, font family, text size, line height, margin, page format)
- All changes call `updateCustomizationState()` and re-render the document canvas in real time
- A close button (×) or pressing Escape dismisses the drawer

### 5.5 Document Canvas

- Horizontally centered, max width matching the current template width (~794px for A4)
- White background, drop shadow, resembles a real page
- Internally uses the existing `TemplateRenderer` / `CoverLetterRenderer` as the visual base
- Editing affordances overlaid on top via absolute positioning or CSS
- Re-renders instantly when `customization` (template, colors, fonts, spacing) changes — no page reload

---

## 6. Resume Editor — Inline Editing

### 6.1 Section Container

Each resume section (Summary, Experience, etc.) is wrapped in a `<EditableSection>` component:

- Shows a **drag handle** icon on left edge on hover (replaces the hidden handle in current `SortableItem`)
- Shows a **section actions bar** on hover: `[+ Add item]` and `[⋮ options]`
- Highlights on hover with a subtle border/ring

Section-level drag and drop uses `@dnd-kit` `DndContext` + `SortableContext` at the document root level. The drag items are the section blocks themselves (header, summary, experience, projects, skills, education, certifications).

### 6.2 Editable Fields

Each rendered text node in the template is replaced by an `<InlineField>` component:

| Field type | Rendered as | Edit trigger | Edit widget |
|---|---|---|---|
| Short text (name, title, company, etc.) | `<span>` | Click | `<input>` overlay, auto-width |
| Long text (summary, description) | `<p>` or rich text | Click | `<textarea>` or inline RTE, auto-height |
| Date range | Two date strings | Click either | Two `<input type="month">` pickers |
| Skills / tags | Inline chips | Click chip to edit, `+` to add | Chip input (existing `TagsEditor` pattern) |
| Bullet list items | `<li>` elements | Click bullet | Inline `<textarea>`, `Enter` adds new bullet |

`InlineField` rules:
- When not focused: renders exactly as the template renders it (no visual difference)
- When focused: light highlight ring, cursor blink, escape cancels, blur/enter commits
- Commits call `updateResumeState()` from context (same as today)
- Auto-save debounce (already handled by context's `saveToDb`)

### 6.3 Item-Level Drag and Drop

Within list sections (Experience, Education, Projects, Certifications), items remain individually sortable — same `@dnd-kit` logic as current `SortableItem`. The drag handle appears on the left of each item card on hover.

### 6.4 Add / Remove Controls

- **Add item**: Appears as a dashed `+` button at the bottom of each list section; calls the same factory functions as today's section editor
- **Remove item**: `×` icon on top-right of each item card on hover; calls the same delete logic
- **Toggle section visibility**: Section header actions bar includes an eye icon to hide/show a section from the exported resume (stored in `SanitizedCustomization.hiddenSections`)

### 6.5 Inline AI Suggestions

When the AI chat produces a targeted improvement for a specific field (e.g., a rewritten bullet point or a stronger summary), the suggestion is surfaced **inline on the document text** rather than only in the chat panel:

- The affected text is highlighted with a colored underline or background tint using `--color-agent-primary` at low opacity
- A small floating tooltip anchored to the highlight shows a one-line preview of the suggestion and two actions: **Accept** (checkmark) and **Dismiss** (×)
- Accepting calls `updateResumeState()` with the new value — identical to a manual inline edit commit
- Dismissing removes the highlight; the original text is unchanged
- Multiple suggestions can be active simultaneously across different fields
- Suggestions are stored transiently in component state (not persisted); they clear on page reload

This is powered by the existing `ChatPanel` + context: the AI response includes structured field-path annotations that the `DocumentCanvas` reads to position highlights.

---

## 7. Template & Customization in the Editor

### 7.1 Template Switching

The template picker in the toolbar shows a popover with thumbnail cards for each available template (using the same `AVAILABLE_TEMPLATES` list from `@/types/customization`). Clicking a card:

1. Calls `updateCustomizationState({ template: selectedTemplate })`
2. The document canvas immediately re-renders using the new template
3. All inline-editable fields remain in place — no data loss, no re-mount of the editing session
4. The selection persists to DB via the existing auto-save debounce

For the **cover letter**, the same template picker switches the cover letter template (which shares the same `customization.template` field).

### 7.2 Theme Customization

The customization drawer (§5.4) exposes:

| Control | Field | Effect |
|---|---|---|
| Primary color | `primaryColor` | Accent bars, headings, links |
| Secondary color | `secondaryColor` | Subheadings, dividers |
| Accent color | `accentColor` | Highlights, chips |
| Background | `backgroundColor` | Page background |
| Text color | `textColor` | Body text |
| Font family | `fontFamily` | All text in document |
| Text size | `textSize` | Base font size class |
| Line height | `lineHeight` | Body line spacing |
| Margin | `marginSize` | Page margin preset |
| Page format | `pageFormat` | A4 / US Letter |

All fields map directly to existing `SanitizedCustomization` properties — no new data model additions needed. Changes propagate through `updateCustomizationState()` and re-render the canvas in real time.

### 7.3 Customization Persistence

Customization state is already persisted to the database via the existing `saveToDb("resume", resume, customization)` call. No changes needed — the drawer controls write to the same context state that gets saved.

---

## 8. Cover Letter Editor — Inline Editing

### 8.1 Document Canvas

Full-height document canvas shows the `CoverLetterRenderer` output. The rendered body text region is clickable. Template and customization controls in the toolbar apply here too — switching template instantly re-renders the cover letter in the new style.

### 8.2 Body Click-to-Edit

- Clicking the body/content area activates the existing `RichTextEditor` as an inline overlay
- The RTE mounts over the rendered text with identical font/size/spacing so it feels seamless
- On blur / Escape: RTE deactivates, rendered view returns
- The cover letter string in context updates on every RTE change (same as today)

### 8.3 Floating Action Bar

Positioned above the document (sticky at top of canvas area, below the shared toolbar):

```
[ ✦ Generate   ▾ Model: GPT-4o ]   [  ···  ]
```

- **Generate**: existing `useGenerateCoverLetter` hook
- **Model selector**: existing `ModelSelector` component in compact variant
- Replaces the left panel that currently contains these controls

---

## 9. Component Map

### New Components

| Component | Location | Purpose |
|---|---|---|
| `DocumentCanvas` | `src/components/job/DocumentCanvas.tsx` | Scrollable WYSIWYG canvas wrapping the template renderer with inline edit overlays and AI suggestion highlights |
| `EditableSection` | `src/components/job/resume/EditableSection.tsx` | Sortable section container with hover affordances and drag handle |
| `InlineField` | `src/components/job/resume/InlineField.tsx` | Click-to-edit wrapper for any text node |
| `InlineSuggestion` | `src/components/job/resume/InlineSuggestion.tsx` | Highlight + accept/dismiss tooltip anchored to an `InlineField` |
| `SectionOutlinePanel` | `src/components/job/resume/SectionOutlinePanel.tsx` | Collapsible left outline replacing `ResumeSectionNav` |
| `CoverLetterActionBar` | `src/components/job/CoverLetterActionBar.tsx` | Floating action bar for generate + model select |
| `TemplatePicker` | `src/components/job/TemplatePicker.tsx` | Toolbar popover with thumbnail cards for all available templates |
| `CustomizationDrawer` | `src/components/job/CustomizationDrawer.tsx` | Slide-in right drawer wrapping the existing `ThemeCustomizationPanel` |

### Modified Components

| Component | Change |
|---|---|
| `ResumeEditor.tsx` | Replace `EditorLayout` + `ResumeSectionNav` + `SectionEditor` with `DocumentCanvas` + `SectionOutlinePanel` |
| `CoverLetterEditor.tsx` | Replace left-panel layout with `DocumentCanvas` + `CoverLetterActionBar`; body area activates inline RTE |
| `JobPageLayout.tsx` | Remove resizable right preview panel from "edit" tab; keep it in "export" tab. Add template picker + customize button to toolbar row. Wire `CustomizationDrawer` open/close state. Replace `ChatFAB` with a persistently docked `ChatPanel` column in the edit tab layout. |
| `SectionEditor.tsx` | Logic extracted into `InlineField`/`EditableSection` — file may be deprecated or repurposed for fallback |

### Unchanged Components

`JobPageLayout.tsx` header + tab-switcher rows, `TemplateRenderer`, `CoverLetterRenderer`, `PreviewViewport` (export tab), `ATSAnalysisPanel`, `ThemeCustomizationPanel` (reused inside `CustomizationDrawer`), `ChatPanel` (internals unchanged, docking behavior updated), all server actions, context, hooks.

---

## 10. Interaction Details

### Section Drag-and-Drop (Section Level)

```
DndContext (document canvas root)
  └── SortableContext (items = section order array in resume/customization)
        ├── EditableSection id="summary"
        ├── EditableSection id="experience"
        ├── EditableSection id="projects"
        └── ...
```

`onDragEnd` calls `updateResumeState` with the new section order stored in `customization.sectionOrder: SectionId[]`. The template renderers read `sectionOrder` to determine render sequence.

**Data model addition required:** Add `sectionOrder?: SectionId[]` to `SanitizedCustomization` (defaults to current hardcoded order). This is a client-side customization field — no schema migration needed unless persisted (optional v2).

### Inline Field Edit Flow

```
User clicks text
  → InlineField receives focus
  → renders <input> or <textarea> at same position
  → user types
  → on blur/Enter: calls updateResumeState({ ...resume, [path]: newValue })
  → context debounces → saveToDb()
```

### Section Visibility Toggle

`SanitizedCustomization.hiddenSections: SectionId[]` — already exists or easily added. Eye icon in section header toggles presence in this array. Renderer checks and skips hidden sections.

---

## 11. Visual Design Principles

1. **True WYSIWYG**: The document canvas is pixel-identical to the exported PDF. There is no "preview" — the canvas *is* the output. Template, fonts, colors, spacing, and page margins all render exactly as they will in the download.
2. **Work directly in the document**: There is no separate "editor mode" vs "preview mode". The template render IS the editor. Clicking any text activates it for editing in place.
3. **Instant reflection**: Every keystroke in an inline field updates the document in real time. No save-to-preview step, no refresh.
4. **AI suggestions live on the text**: When the AI identifies an improvement, it marks it directly on the affected text in the document — not in a side panel response. The highlight is unobtrusive until the user hovers; then accept/dismiss controls appear.
5. **Chat alongside, not behind a button**: The AI assistant is a persistent column next to the document. Switching between typing in a field and sending a chat message requires zero UI navigation — both work simultaneously on the same live document.
6. **Invisible editing, visible affordances on demand**: Editable areas show no border in their resting state. On hover: a subtle ring in `--color-agent-primary` at low opacity signals interactivity. Drag handles, add/delete controls, and section action bars only appear on hover of the relevant container — never cluttering the document view.
7. **One-click template switching**: The same resume content renders across any template without data loss. The template switcher is accessible from the toolbar row — changing it is instantaneous.
8. **Less clicking through settings**: Section reorder is done by dragging directly in the document, not through a menu. The user stays on the document surface at all times.
9. **Consistent color palette**: All affordances use the existing `agent-*` design token system.

---

## 12. Implementation Phases

### Phase 1 — WYSIWYG Document Canvas (core)
- `DocumentCanvas` component wrapping `TemplateRenderer` (WYSIWYG baseline)
- `EditableSection` with section-level DnD
- `InlineField` for short text fields (name, title, company, dates)
- `SectionOutlinePanel` collapsible sidebar
- Remove right preview panel from edit tab, keep in export tab

### Phase 2 — Chat alongside
- Promote `ChatPanel` from FAB-hidden to persistently docked column in edit tab layout
- Define minimum canvas width threshold at which chat panel auto-collapses

### Phase 3 — Template & Customization in editor
- `TemplatePicker` popover in toolbar with thumbnail cards
- `CustomizationDrawer` slide-in panel wrapping `ThemeCustomizationPanel`
- Real-time canvas re-render on template/theme change

### Phase 4 — Resume Editor completeness
- `InlineField` for bullet lists, tags/skills, long text / RTE
- Add / remove item controls within sections
- Section visibility toggle

### Phase 5 — Cover Letter Editor
- `DocumentCanvas` for cover letter
- `CoverLetterActionBar` (generate + model selector)
- Inline RTE activation on body click
- Template picker + customization drawer wired to cover letter canvas

### Phase 6 — Inline AI Suggestions
- `InlineSuggestion` component: highlight + accept/dismiss tooltip on `InlineField`
- Define annotation schema for structured field-path + suggested-value in AI chat responses
- Wire AI chat response annotations to `DocumentCanvas` suggestion highlights

---

## 13. Open Questions

1. **Section order persistence**: Should `sectionOrder` persist to the database (requires `customization` JSON column update) or remain in-session only? Recommended: persist to DB as part of `customization` JSON.
2. **Template compatibility**: Each template renders sections in its own order. `sectionOrder` would need to be respected by all template components — audit required.
3. **Mobile / narrow viewport**: The three-column layout (outline + canvas + chat) will not fit on narrow screens. Deferred; current degradation behavior is acceptable for now.
4. **Undo/redo**: Inline field changes should integrate with the existing `ResumeHistory` undo stack — ensure `InlineField` commits go through `updateResumeState` (which already feeds the history).
5. **Inline suggestion annotations format**: The AI chat response needs a structured format to carry field-path + suggested-value pairs alongside the prose response. Define the annotation schema and how `ChatPanel` passes it to `DocumentCanvas` (e.g., via context or a callback prop).
6. **Chat panel width in edit tab**: The docked chat panel reduces canvas width. Define the minimum canvas width at which the chat panel auto-collapses to a FAB-like state (suggested: < 900px total window width).
