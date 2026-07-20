# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code search

This project has CodeGraph (`mcp__codegraph__*`) set up — a pre-indexed knowledge graph of all symbols, files, and call relationships.

- Prefer `codegraph_explore` over grep/Read for "how does X work", "where is X", architecture, or bug investigation questions — it returns verbatim source grouped by file in one call.
- Use `codegraph_callers` / `codegraph_callees` / `codegraph_impact` for "what calls this" / blast-radius questions before refactoring.
- Use `codegraph_search` for quick symbol lookups (location, kind, signature).
- Fall back to grep only for literal string searches (error messages, config keys, plain text) that aren't code symbols.

## Commands

```bash
npm run dev              # Next.js dev server (http://localhost:3008)
npm run build            # Production build
npm run lint             # ESLint
npm run lint:fix         # ESLint with autofix
npm run format           # Prettier write
npm run format:check     # Prettier check
npm run type-check       # tsc --noEmit
npm run test             # Vitest (watch)
npm run test:run         # Vitest single run
npm run test:run -- path/to/file.test.ts   # Run a single test file
npm run test:ui          # Vitest UI
npm run test:coverage    # Vitest with coverage
npm run test:e2e         # Playwright e2e suite
npm run test:e2e:ui      # Playwright UI mode

npm run db:generate      # prisma generate
npm run db:push          # prisma db push (apply schema to SQLite)
npm run db:studio        # Prisma Studio GUI

npm run tauri dev        # Tauri desktop app (dev)
npm run tauri build      # Tauri desktop app (build)
```

Before committing: `npm run lint:fix && npm run format && npm run type-check`.

After editing `prisma/schema.prisma`: run `npm run db:generate` then `npm run db:push`.

## Architecture overview

Local-first desktop resume/cover-letter builder: Next.js 16 (App Router) + Tauri, Prisma ORM on SQLite. Core flow: Base profile → paste job description → AI-tailored resume + cover letter → manual editing → PDF/TXT export.

**Hard rule: Server = database only, LLM = client only.**

- **Server Actions** (`src/actions/`, `'use server'`) do **only** Prisma/SQLite CRUD. No REST APIs, no server-side `fetch` to internal endpoints, no LLM calls on the server.
  - `profile.ts` — base profile CRUD
  - `job.ts` — Job, Resume, CoverLetter, Customization CRUD
  - `tokenUsage.ts` — token usage analytics persistence
  - `urlFetcher.ts`, `getServerUrl.ts` — misc server-side helpers
- **LLM operations run entirely client-side** (`src/lib/llm/`, `src/lib/clientLLM.ts`) so API keys never leave the client/Tauri secure storage.
  - Provider base classes (`LLMProvider`, `OpenAICompatibleProvider`), the prompt resolver/validation, and provider registry now live in the `@pranavraut033/llm-core` submodule package (`packages/llm-core/`, consumed via `file:packages/llm-core`). App-local providers (`src/lib/llm/providers/`: `factory.ts`, `index.ts`, `managedProvider.ts`) extend those base classes and self-register via `ProviderFactory` — never instantiate a provider class directly.
  - `managedProvider.ts` — `ManagedProvider`, an OpenAI-compatible provider pointed at the self-hosted LiteLLM gateway (`server/llm-gateway/`) for users without their own API key (paid, prepaid-credit access). Same client-only call path as BYOK providers; the gateway just proxies upstream.
  - `src/lib/llm/domainOps.ts` — free functions for resume-domain operations (parsing, tailoring, ATS analysis, humanizer) shared across providers.
  - `src/lib/llm/llmService.ts` — high-level operations: `parseJobDescription()`, `generateResume()`, `generateCoverLetter()`, ATS analysis, `humanizeContent()`.
  - `src/lib/llm/prompts/` — prompt templates per operation; untrusted/user-supplied data is wrapped in delimiters before interpolation to block prompt injection.
  - `src/lib/llm/chat-bot/` — chat-based editing assistant.
  - `src/lib/llm/tokenTracker.ts` — tracks token usage, persisted via `tokenUsage` server action.
  - `src/lib/keyStorage.ts` — API key storage (Tauri encrypted store on desktop, localStorage on web). Use `getApiKey()`/`setKey()`, never store plaintext elsewhere.

### Data model (`prisma/schema.prisma`)

SQLite via Prisma. Core models: `Profile` (base profile, with skills/experience/projects/education/etc. stored as JSON string columns), `Company`, `Contact`, `Job`, `Resume`, `CoverLetter`, `Customization`. JSON columns map to typed shapes in `src/types/resume.ts` (`ResumeJSON`, `JobDetailsJSON`, `ATSAnalysisJSON`) — parse/stringify at the action boundary.

### Resume rendering / templates

Section content (order, visibility, custom sections) is resolved once via `buildSections()` (`src/components/job-v2/engine/buildSections.ts`) and rendered by three engines from the same `TemplateConfig`/section registry — DOM, PDF, and TXT stay in sync by construction:

- `src/components/job-v2/engine/` — `TemplateEngine.tsx` (DOM/WYSIWYG rendering), `sections.tsx` (section registry), `templates.ts` (all resume templates — `modern-minimal`, `tech-sidebar`, `creative-modern`, `two-tone`, etc. — as layout/style config objects, not components), `types.ts`.
- `src/components/job/templates/TemplateRenderer.tsx` dispatches `customization.template` to `TemplateEngine` via `engine/templates.ts`, falling back to the `modern-minimal` config for a legacy/unrecognized `template` value (originally adapted from the Resumify project, see `LICENSE-THIRD-PARTY.md`).
- `src/lib/pdf/` — `PDFTemplateEngine.tsx` + `sections.tsx` mirror the DOM engine for `@react-pdf/renderer` resume output (`resolveStyles.ts`, `fonts.ts`, `htmlToPdf.tsx`); `templates/` holds cover-letter PDF templates only, still one component per resume template (e.g. `ModernMinimalCoverLetterPDF.tsx`).
- `src/lib/pdfExport.ts` — PDF export entry point. `src/lib/txtExport.ts` — TXT export.
- `src/types/customization.ts` — `Customization`/`SanitizedCustomization` types and `DEFAULT_CUSTOMIZATION`/`validateCustomization` for per-job template styling (colors, fonts, layout).

### Job page

`src/app/job/[jobId]/` + `src/components/job-v2/` — the Inline Editor: WYSIWYG inline editing directly on the rendered document (`InlineJobPageLayout.tsx`, `DocumentCanvas.tsx` with zoom controls, `resume/InlineField.tsx`, `InlineEditContext.tsx`, `ChatOverlay.tsx`, `CustomizationDrawer.tsx`, `TemplatePicker.tsx`, `HistoryDrawer.tsx` for resume version history, `HumanizerModal.tsx` for AI humanizing). This is now the only job detail page implementation — the earlier drag-and-drop editor and its standalone `/inline` route were removed. `src/app/documents/` lists all generated resumes/cover letters with version history across jobs.

### External links

`src/components/ExternalLinkGuard.tsx` intercepts anchor clicks app-wide and confirms with the user before opening external URLs via `src/lib/externalLink.ts` (`tauri-plugin-opener` on desktop, `window.open` on web) instead of navigating in-app.

### State management

- `src/contexts/` — React context (`JobPageContext`, `ThemeContext`).
- `src/store/modelStore.ts` — Zustand store for selected LLM model/provider.
- TanStack Query (`QueryClientProvider` in `src/components/AppShell.tsx`) wraps Server Action calls — `useQuery`/`useMutation` for data fetching/mutation (e.g. `useProfileQuery.ts`, `useJobPageDataQuery.ts`, `JobPageContext.tsx`), `useReactTable` (`@tanstack/react-table`) for the job/table list views (`ui/Table.tsx`, `JobTableClient.tsx`).

### Styling

Tailwind CSS v4. Shared design tokens live in `src/styles/global.css` inside an `@theme {}` block — define new tokens there so Tailwind generates utility classes (e.g. `bg-brand-primary`). Do not use inline `style={{}}`, `var()` inside class strings, or arbitrary `[--token:value]` declarations in JSX.

### Debugging the built (installed) desktop app

The built Tauri app has no attached terminal/console, so a bug that only shows up "after build" (e.g. a button that's disabled or does nothing) has to be diagnosed from log files under the app's `$APPDATA` dir instead of `npm run dev` output:

- `$APPDATA/logs/server.log` — stdout+stderr of the bundled Next.js server (`src-tauri/src/lib.rs::spawn_bundled_next_server`), i.e. Server Action errors, Prisma errors, unhandled exceptions on the server side. Truncated fresh on every app launch.
- `$APPDATA/logs/client.log` — JSON-lines mirror of every `logger.*()` call from client code (`src/lib/logger.ts`), i.e. the same errors the browser devtools console would show (e.g. `SettingsPage`'s save-key/backup/restore handlers all log their catch blocks here). Appended across launches, no rotation.

`$APPDATA` resolves per-OS to (bundle id `com.resumebuilder.dev`): macOS `~/Library/Application Support/com.resumebuilder.dev`, Windows `%APPDATA%\com.resumebuilder.dev`, Linux `~/.config/com.resumebuilder.dev`. When asked to debug an installed-app-only issue, read both log files before speculating.

## Skills

- `tailwind-ui-designer` (`.claude/skills/tailwind-ui-designer/SKILL.md`) — invoke whenever the user asks to build, restyle, or improve UI. Enforces the Tailwind v4 styling constraints above and follows the `frontend-design` skill.
