# Inline Editor V2 Implementation Plan (New Page Rollout)

Status: Proposed
Date: 2026-06-01
Owner: Resume Builder team
Related PRD: docs/PRD-inline-editor.md

## 1) Rollout Principle

Build the inline WYSIWYG editor as a new page and keep the existing editor fully intact.

- Existing page remains default: /job/[jobId]
- New page for V2: /job/[jobId]/inline
- No replacement of current ResumeEditor and CoverLetterEditor during initial rollout
- Shared data and save logic continue to use JobPageProvider and existing server actions

## 2) Routing and Entry Strategy

### New route structure

- Add new route file: src/app/job/[jobId]/inline/page.tsx
- Add route layout wrapper: src/app/job/[jobId]/inline/layout.tsx

Layout behavior:

- Reuse data loading pattern from src/app/job/[jobId]/layout.tsx
- Wrap with the same JobPageProvider so V1 and V2 use identical data contracts
- Keep metadata and fallback behavior consistent

Navigation:

- Add an "Open Inline Editor" button in the existing editor header or details menu
- Optionally support query fallback for quick testing from existing page: /job/[jobId]?editor=inline that links to /job/[jobId]/inline

## 3) High-Level Architecture for V2 Page

Create a parallel V2 component tree under src/components/job-v2 so V1 files are not modified aggressively.

Proposed V2 component map:

- src/components/job-v2/InlineJobPageLayout.tsx
- src/components/job-v2/DocumentCanvas.tsx
- src/components/job-v2/TemplatePicker.tsx
- src/components/job-v2/CustomizationDrawer.tsx
- src/components/job-v2/CoverLetterActionBar.tsx
- src/components/job-v2/resume/SectionOutlinePanel.tsx
- src/components/job-v2/resume/EditableSection.tsx
- src/components/job-v2/resume/InlineField.tsx
- src/components/job-v2/resume/InlineSuggestion.tsx

Reuse existing internals where possible:

- TemplateRenderer and CoverLetterRenderer
- ThemeCustomizationPanel
- ChatPanel internals
- RichTextEditor
- useGenerateCoverLetter
- JobPageContext state updates and save pipeline

## 4) Data Contract Plan (Additive)

Goal: avoid backend/schema migration and keep change additive.

Use existing customization JSON for V2-only fields when available in Prisma JSON object.

Add to type layer first:

- Extend SanitizedCustomization type usage with optional fields in TypeScript (front-end safe):
  - sectionOrder?: SectionId[]
  - hiddenSections?: SectionId[]

Persistence:

- Continue saving via existing saveToDb("resume", resume, customization)
- Since customization is already JSON-backed, these optional keys can be stored without DB schema changes

Compatibility:

- V1 ignores unknown customization keys
- V2 reads these keys with defaults

## 5) Detailed Phases

## Phase 0: Foundation and Guardrails (1 day)

Deliverables:

- New route scaffolding at /job/[jobId]/inline
- V2 page renders current template preview + basic toolbar shell
- No behavior change in /job/[jobId]

Tasks:

- Create inline route and layout wrappers
- Create InlineJobPageLayout with static 3-column frame
- Add smoke navigation from V1 to V2
- Add basic responsive constraints and overflow handling

Acceptance:

- Opening /job/[jobId]/inline works for existing jobs
- Saving from V2 still writes through existing context

## Phase 1: Document-First Resume Editing Core (3-4 days)

Deliverables:

- DocumentCanvas rendering resume as central WYSIWYG surface
- SectionOutlinePanel (collapsible)
- Section-level drag and drop skeleton in EditableSection

Tasks:

- Mount TemplateRenderer directly in DocumentCanvas
- Implement section anchors and scroll-to-section from outline
- Add section drag handles and reorder via sectionOrder in customization
- Keep item-level sorting delegated to existing section logic where feasible

Acceptance:

- Section order can be changed in V2 and remains after refresh
- V1 still opens and behaves exactly as before

## Phase 2: Persistent Docked Chat (1-2 days)

Deliverables:

- Always-visible docked chat column in V2 edit mode
- Resizable chat width and auto-collapse threshold

Tasks:

- Reuse ChatPanel with snapped docking model
- Remove floating FAB behavior from V2 only
- Add width threshold logic (for example collapse below 900px container width)

Acceptance:

- User can type in inline fields and chat side-by-side with no mode switch

## Phase 3: Template Picker + Customization Drawer (2 days)

Deliverables:

- Toolbar template picker in V2
- Right-side customization drawer with ThemeCustomizationPanel

Tasks:

- Build TemplatePicker popover using AVAILABLE_TEMPLATES
- Build drawer host and keyboard close behavior
- Wire updateCustomizationState for all controls

Acceptance:

- Template and theme changes re-render instantly in V2
- Changes persist after reload

## Phase 4: Inline Field Editing Completeness (4-5 days)

Deliverables:

- InlineField support for short text, long text, bullets, tags, and dates
- Add/remove item controls and section visibility toggle

Tasks:

- Implement field-path mapping between rendered text and resume model paths
- Reuse TagsEditor and bullet editing patterns
- Add hover affordances and keyboard commit/cancel behavior
- Write updates through updateResumeState to preserve history/undo stack

Acceptance:

- Basic edits can be completed with zero form-panel usage in V2
- Undo/redo works for inline commits

## Phase 5: Cover Letter Inline Page Mode (2-3 days)

Deliverables:

- Cover letter uses the same document-first canvas in V2
- Floating action bar with Generate + ModelSelector
- Inline RTE activation over body area

Tasks:

- Add CoverLetterActionBar in V2 canvas area
- Mount RichTextEditor inline over rendered body on click
- Keep updateCoverLetterState and save behavior unchanged

Acceptance:

- Cover letter can be edited and generated entirely within V2 canvas workflow

## Phase 6: Inline AI Suggestions (3-4 days)

Deliverables:

- Text highlights and accept/dismiss controls inside document
- Suggestion state transient and non-persistent

Tasks:

- Define annotation contract between chat output and canvas:
  - id
  - targetPath
  - originalText
  - suggestedText
  - sectionId
- Introduce InlineSuggestion and suggestion store in V2 layout state/context
- Accept applies updateResumeState; dismiss drops suggestion

Acceptance:

- Multiple suggestions can coexist across sections
- Accept and dismiss are deterministic and undo-safe

## 6) Testing Plan

Unit tests:

- Section order reducer and hidden section toggles
- InlineField commit/cancel behavior
- Template picker and customization drawer state changes

Integration tests:

- Route load for /job/[jobId]/inline
- Resume edit, save, refresh persistence
- Cover letter edit and generate flow
- Chat dock behavior and width collapse threshold

Manual regression checklist:

- Existing /job/[jobId] end-to-end unchanged
- Export tab in V1 unchanged
- ATS panel in V1 unchanged
- No break in save, PDF export, TXT export

## 7) File-Level Execution Plan

Create:

- src/app/job/[jobId]/inline/layout.tsx
- src/app/job/[jobId]/inline/page.tsx
- src/components/job-v2/InlineJobPageLayout.tsx
- src/components/job-v2/DocumentCanvas.tsx
- src/components/job-v2/TemplatePicker.tsx
- src/components/job-v2/CustomizationDrawer.tsx
- src/components/job-v2/CoverLetterActionBar.tsx
- src/components/job-v2/resume/SectionOutlinePanel.tsx
- src/components/job-v2/resume/EditableSection.tsx
- src/components/job-v2/resume/InlineField.tsx
- src/components/job-v2/resume/InlineSuggestion.tsx

Modify (minimal, additive):

- src/types/customization.ts (optional V2 fields in type utilities)
- src/components/job/JobPageLayout.tsx (optional link/button to open V2)
- src/components/home/PeekContent.tsx (optional secondary action)

Do not change behavior in:

- src/components/job/ResumeEditor.tsx
- src/components/job/CoverLetterEditor.tsx
- src/app/job/[jobId]/page.tsx

## 8) Delivery Strategy

- Ship V2 behind route-only access first
- Keep V1 as default for all users
- Gather feedback on V2 page
- Later decide whether to switch default route or keep both modes

## 9) Risks and Mitigations

Risk: Template-specific section rendering may conflict with sectionOrder

- Mitigation: add adapter in DocumentCanvas that builds ordered section list before render

Risk: Inline field mapping can be brittle across templates

- Mitigation: start with core fields and centralize path mapping in a single utility

Risk: Docked chat reduces canvas readability on narrow windows

- Mitigation: auto-collapse chat below threshold and remember last width

Risk: Undo/redo inconsistency for inline edits

- Mitigation: all commits must call updateResumeState with note labels

## 10) Definition of Done for New Page Release

- New page /job/[jobId]/inline is fully functional
- Existing /job/[jobId] remains unchanged in behavior and layout
- Resume and cover letter edits persist correctly
- Template and customization controls available directly in V2 editor
- Docked chat is available in V2 edit flow
- Core inline editing paths are covered by tests and manual regression checklist
