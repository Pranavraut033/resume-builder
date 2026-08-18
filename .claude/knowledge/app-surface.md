# App surface — routes, job page, state, styling

Read this for: "where is the page/component for X", adding a route, state management, styling rules,
notifications, bookmarks.

## Routes (`src/app/`)

| Route               | File                                  | What it is                                                                                                         |
| ------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `/`                 | `page.tsx`                            | Home / job list (`JobTableClient.tsx`, components in `src/components/home/`).                                      |
| `/profile`          | `profile/page.tsx`                    | Base profile editor (`src/components/profile/`). Multi-profile via `Profile.label`.                                |
| `/job/new`          | `job/new/page.tsx`                    | Create flow: paste JD or URL → parse → tailor → generate. Has a **bookmark mode**, below.                          |
| `/job/[jobId]`      | `job/[jobId]/page.tsx` + `layout.tsx` | The Inline Editor — the only job detail implementation. See below.                                                 |
| `/documents`        | `documents/page.tsx`                  | All generated resumes/cover letters with version history, across jobs (`getAllDocuments`).                         |
| `/bookmarks`        | `bookmarks/page.tsx`                  | Saved job URLs not yet turned into applications.                                                                   |
| `/find-jobs`        | `find-jobs/page.tsx`                  | Job-search entry point.                                                                                            |
| `/find-jobs/browse` | `find-jobs/browse/page.tsx`           | In-app browser over job sites (`JobBrowserTabs.tsx`, `JobBrowserToolbar.tsx`).                                     |
| `/analytics/tokens` | `analytics/tokens/page.tsx`           | Token-usage dashboard (`src/components/analytics/`: summary cards, filters, time series, breakdown charts, table). |
| `/settings`         | `settings/page.tsx`                   | API keys (add/remove per provider), model selection, MCP server toggle + connector download, Backup & Restore.    |
| `/settings/mcp`     | `settings/mcp/page.tsx`               | Manual/CLI MCP setup instructions only (toggle + connector download live on `/settings`) — see `.claude/knowledge/chat-mcp.md`. |
| `/settings/licenses`| `settings/licenses/page.tsx`          | Third-party license attributions, rendered from a bundled markdown file via `MarkdownBlock.tsx`.                   |

**There is no `src/app/api/` directory.** Data flows through Server Actions only (see
[data-layer.md](data-layer.md)).

`src/app/layout.tsx` → `src/components/AppShell.tsx` holds the providers: `QueryClientProvider`,
theme, toasts, updater.

## The Inline Editor (`/job/[jobId]` + `src/components/job-v2/`)

WYSIWYG inline editing directly on the rendered document. There is no drag-and-drop editor and no `/inline`
route — both were removed.

| File                           | Purpose                                                                                                                                                                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `InlineJobPageLayout.tsx`      | Owns `activeDrawer` — the **six mutually-exclusive drawers** — and wires chat context to them.                                                                                                                                                                                                                          |
| `DocumentCanvas.tsx`           | The paged document surface, with zoom controls.                                                                                                                                                                                                                                                                           |
| `FloatingActionBar.tsx`        | Inline actions (PDF, Undo/Redo, Customize, Fit Check, Deep Analysis, Humanize, Chat) + a `⋯` overflow (Sections, History, Download JSON). Fit Check sits left of Deep Analysis in the main row — the primary "should I apply" read, Deep Analysis the secondary line-editing pass. Exports `DrawerName` — the source of truth for openable drawers.                                                                                                              |
| `SideDrawer.tsx`               | Shared drawer shell.                                                                                                                                                                                                                                                                                                      |
| `DeepAnalysisDrawer.tsx`       | Wraps `DeepAnalysisPanel` (`src/components/job/`) — renders `DocumentAnalysisJSON`'s flat `findings[]` grouped by kind. A finding where `suggestion === original` (model confirming a field needs no change) is filtered out at render time to a one-line count instead of a card — nothing persisted changes.                                                         |
| `FitCheckDrawer.tsx`           | Substantive resume-vs-JD fit (not keyword scoring), plus `knockout_risks`. No apply pill — `FitCheckSchema` gaps carry no `resume_fix` any more, so there's nothing left for a pill to apply.                                                                                            |
| `HumanizerDrawer.tsx`          | AI-humanizing pass (`HumanizerDrawer.test.tsx`).                                                                                                                                                                                                                                                                          |
| `HistoryDrawer.tsx`            | `ResumeSnapshot` version history.                                                                                                                                                                                                                                                                                         |
| `CustomizationDrawer.tsx`      | Colors/fonts/layout for this job's `Customization` — including the template picker grid (`job/TemplateSelector.tsx`, no longer a separate toolbar control) and, for cover letters, an independent template picker. See [rendering.md](rendering.md) for how templates and cover-letter template decoupling actually work. |
| `ChatOverlay.tsx`              | The in-app chat assistant's UI.                                                                                                                                                                                                                                                                                           |
| `GenerateCoverLetterModal.tsx` | Cover-letter generation with tone/style presets from `prompts/coverLetterStyles.ts`.                                                                                                                                                                                                                                      |
| `resume/`                      | The editable primitives: `InlineField.tsx`, `InlineEditContext.tsx`, `EditableText.tsx`, `EditableDateRange.tsx`, `EditableItem.tsx`, `EditableLink.tsx`, `BulletListField.tsx`, `LanguageField.tsx`, `SectionOutlinePanel.tsx`.                                                                                          |

Chat intents (tailor, cover letter, humanize, proofread, gap analysis, fix-all-ATS, edit, question,
interview, undo) are documented in `.claude/knowledge/chat-mcp.md`, not here.

### Fit Check vs. Deep Analysis — the split, and why

They divide on one question: **can a text edit fix it?** Deep Analysis owns the document — a flat
`findings[]`, each with a verbatim `original` and a JSON-Pointer `path`, so every finding is editable by
construction. Fit Check owns the candidate (seniority, domain, missing experience) and cannot be fixed by
editing — `FitCheckSchema`'s gaps carry no `resume_fix` at all, because a text edit there would be
fabrication. Don't re-merge them, and don't invent an apply path for Fit Check gaps. See
[`.claude/knowledge/llm-runtime.md`](llm-runtime.md) for the schema/prompt side of this split
(`FitCheckSchema` + `DocumentAnalysisSchema`, the `analyze_fit`/`analyze_document` MCP purposes).

**Neither panel renders a 0–100 score, deliberately.** No applicant tracking system exposes a match score to
anyone on the hiring team; the number is a third-party-audit invention, so presenting one is a false claim.
`scores.composite_score` survives in the schema for exactly one reason — `src/actions/job.ts` persists it to
`Job.atsScore` so `/documents` can _rank jobs against each other_ — and that column shows the bare number, not
"n / 100". The user-facing labels are "Fit Check" and "Deep Analysis"; underlying identifiers
(`Job.atsScore`, the `FitCheck`/`ATSAnalysis` tables) are unchanged and are a wire contract with MCP hosts —
rename labels, never ids.

## Bookmarks

A bookmark is **just a `Job` row with `status: "BOOKMARKED"`** (`JOB_STATUSES` in `src/types/job.ts`) — there
is no separate table.

- `/bookmarks` accepts pasted URLs, parsed in the background by `src/store/bookmarkQueueStore.ts`: a Zustand
  queue **capped at 5 concurrent parses** running `fetchJobDescriptionFromUrl()` → `LLMService.parseJob()` →
  `createJob({ status: "BOOKMARKED" })`. A failed item stays queryable with a retry action instead of stalling
  the queue.
- "Start tracking" routes to `/job/new?bookmark=<id>`. In bookmark mode `/job/new` **skips the parse step**
  (details are already persisted) and finishes with `attachGeneratedMaterials()` instead of `createJob()`,
  flipping status to `"DRAFT"`.
- URL dedupe goes through `findJobByUrl`.

## Notifications

`src/store/notificationStore.ts` is a **headless** Zustand store (`notify`/`update`/`dismiss`/`remove`/
`markRead`/`clear`) with two independent views reading from it:

- `src/components/ui/ToastProvider.tsx` — transient toasts; `useToast()`/`pushToast()`.
- `src/components/notifications/NotificationBell.tsx` — persistent sidebar history popover with unread count
  and "Clear all".

## State management

- **TanStack Query** wraps Server Action calls — `useQuery`/`useMutation`, `QueryClientProvider` in
  `AppShell.tsx`. `@tanstack/react-table` (`useReactTable`) drives list views (`ui/Table.tsx`,
  `JobTableClient.tsx`).
- **Zustand** (`src/store/`): `modelStore.ts` (selected provider/model + per-model reasoning-effort,
  temperature, top-p), `notificationStore.ts`, `bookmarkQueueStore.ts`, `mcpServerStore.ts`.
- **React context** (`src/contexts/`): `JobPageContext.tsx`, `ThemeContext.tsx`, `AppUpdaterContext.tsx`.
- **Hooks** (`src/hooks/`): data — `useProfileQuery`, `useJobPageDataQuery`, `useProfileSelection`,
  `useDeleteJob`; LLM actions — `useGenerateCoverLetter`, `useHumanizeContent`, `useDeepAnalysis`,
  `useFitCheck`; rendering — `useBlockPaginator`, `useResolveCustomization`; UI — `useEscapeKey`,
  `useHideOnScroll`, `useFakeProgress`, `useHydrated`, `useNavigationOnProfileChange`; desktop —
  `useAppUpdater`.

## Styling

Tailwind CSS v4. Shared design tokens live in `src/styles/global.css` inside an `@theme {}` block — define new
tokens there so Tailwind generates utility classes (e.g. `bg-brand-primary`).

**Dark mode is resolved in JS, not by `prefers-color-scheme`.** `ThemeContext.tsx` always stamps a resolved
`data-theme="light"|"dark"` on `<html>` — including for the `"system"` preference, resolved once via
`matchMedia` — and `global.css` keys its `@custom-variant dark` and dark-token overrides off that attribute,
not a media query. `layout.tsx` also inlines a pre-hydration `<script>` that stamps the same attribute before
first paint, to avoid a flash of the OS theme while React boots; keep it in sync with `ThemeContext.tsx`'s
`STORAGE_KEY`/resolution logic if either changes.

**Do not** use inline `style={{}}`, `var()` inside class strings, or arbitrary `[--token:value]` declarations
in JSX. `src/lib/cn.ts` is the class-merging helper. The `tailwind-ui-designer` skill
(`.claude/skills/tailwind-ui-designer/SKILL.md`) enforces this — invoke it for UI work.

Shared UI primitives live in `src/components/ui/`; form controls including the rich-text editor in
`src/components/form/` (`RichTextEditor/`).

## External links

`src/components/ExternalLinkGuard.tsx` intercepts anchor clicks app-wide and confirms before opening an
external URL via `src/lib/externalLink.ts` (`tauri-plugin-opener` on desktop, `window.open` on web) rather
than navigating in-app. `src/lib/jobSearchUrls.ts` builds the pre-encoded search URLs for Google Jobs,
LinkedIn, Indeed, and Glassdoor used by `/find-jobs`.
