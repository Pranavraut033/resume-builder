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
| `/settings`         | `settings/page.tsx`                   | API keys, model selection, Backup & Restore.                                                                       |
| `/settings/mcp`     | `settings/mcp/page.tsx`               | MCP server toggle (off by default) — see `.claude/knowledge/chat-mcp.md`.                                          |

**There is no `src/app/api/` directory.** Data flows through Server Actions only (see
[data-layer.md](data-layer.md)).

`src/app/layout.tsx` → `src/components/AppShell.tsx` holds the providers: `QueryClientProvider`,
theme, toasts, updater.

## The Inline Editor (`/job/[jobId]` + `src/components/job-v2/`)

WYSIWYG inline editing directly on the rendered document. There is no drag-and-drop editor and no `/inline`
route — both were removed.

| File                           | Purpose                                                                                                                                                                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `InlineJobPageLayout.tsx`      | Owns `activeDrawer` — the **seven mutually-exclusive drawers** — and wires chat context to them.                                                                                                                                 |
| `DocumentCanvas.tsx`           | The paged document surface, with zoom controls.                                                                                                                                                                                  |
| `FloatingActionBar.tsx`        | Inline actions (PDF, Undo/Redo, Customize, ATS, Humanize, Chat) + a `⋯` overflow (Sections, History, Proofread, Gap analysis, Download JSON). Exports `DrawerName` — the source of truth for openable drawers.                  |
| `SideDrawer.tsx`               | Shared drawer shell.                                                                                                                                                                                                             |
| `ATSDrawer.tsx`                | ATS score + issues, with fix-all.                                                                                                                                                                                                |
| `GapDrawer.tsx`                | Resume-vs-JD gap analysis; applies selected `resume_fix` ops.                                                                                                                                                                    |
| `ProofreadDrawer.tsx`          | LLM-judged proofread issues for review (deterministic lint fixes are auto-applied first).                                                                                                                                        |
| `HumanizerDrawer.tsx`          | AI-humanizing pass (`HumanizerDrawer.test.tsx`).                                                                                                                                                                                 |
| `HistoryDrawer.tsx`            | `ResumeSnapshot` version history.                                                                                                                                                                                                |
| `CustomizationDrawer.tsx`      | Colors/fonts/layout for this job's `Customization` — including the template picker grid (`job/TemplateSelector.tsx`, no longer a separate toolbar control) and, for cover letters, an independent template picker. See [rendering.md](rendering.md) for how templates and cover-letter template decoupling actually work. |
| `ChatOverlay.tsx`              | The in-app chat assistant's UI.                                                                                                                                                                                                  |
| `GenerateCoverLetterModal.tsx` | Cover-letter generation with tone/style presets from `prompts/coverLetterStyles.ts`.                                                                                                                                             |
| `resume/`                      | The editable primitives: `InlineField.tsx`, `InlineEditContext.tsx`, `EditableText.tsx`, `EditableDateRange.tsx`, `EditableItem.tsx`, `EditableLink.tsx`, `BulletListField.tsx`, `LanguageField.tsx`, `SectionOutlinePanel.tsx`. |

Chat intents (tailor, cover letter, humanize, proofread, gap analysis, fix-all-ATS, edit, question,
interview, undo) are documented in `.claude/knowledge/chat-mcp.md`, not here.

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
  `useDeleteJob`; LLM actions — `useGenerateCoverLetter`, `useHumanizeContent`, `useProofreadResume`,
  `useGapAnalysis`; rendering — `useBlockPaginator`, `useResolveCustomization`; UI — `useEscapeKey`,
  `useHideOnScroll`, `useFakeProgress`, `useHydrated`, `useNavigationOnProfileChange`; desktop —
  `useAppUpdater`.

## Styling

Tailwind CSS v4. Shared design tokens live in `src/styles/global.css` inside an `@theme {}` block — define new
tokens there so Tailwind generates utility classes (e.g. `bg-brand-primary`).

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
