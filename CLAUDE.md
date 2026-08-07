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
                          # Note: the built/production Tauri app runs its own bundled
                          # Next server on port 3009, not 3008 — the two never collide,
                          # even if both are running at once. See "Debugging the built
                          # (installed) desktop app" below.
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
  - `backup.ts` — full-database JSON export/import (Settings page "Backup & Restore"); excludes API keys, which never live in SQLite
  - `urlFetcher.ts`, `getServerUrl.ts` — misc server-side helpers
- **LLM operations run entirely client-side** (`src/lib/llm/`, `src/lib/clientLLM.ts`) so API keys never leave the client/Tauri secure storage.
  - Provider base classes (`LLMProvider`, `OpenAICompatibleProvider`), the prompt resolver/validation, and provider registry now live in the `@pranavraut033/llm-core` submodule package (`packages/llm-core/`, consumed via `file:packages/llm-core`). App-local providers (`src/lib/llm/providers/`: `factory.ts`, `index.ts`, `managedProvider.ts`) extend those base classes and self-register via `ProviderFactory` — never instantiate a provider class directly.
  - ATS scoring/parsing logic similarly lives in the `@pranavraut033/ats-checker` submodule package (`packages/ats-checker/`, consumed via `file:packages/ats-checker`). Both submodules are built by `predev`/`prebuild` npm scripts before `next dev`/`next build` run.
  - `managedProvider.ts` — `ManagedProvider`, an OpenAI-compatible provider pointed at the self-hosted LiteLLM gateway (`server/llm-gateway/`) for users without their own API key (paid, prepaid-credit access). Same client-only call path as BYOK providers; the gateway just proxies upstream.
  - `src/lib/llm/domainOps.ts` — free functions for resume-domain operations (parsing, tailoring, ATS analysis incl. knockout-risk/title-alignment, humanizer, proofreading) shared across providers.
  - `src/lib/llm/llmService.ts` — high-level operations: `parseJobDescription()`, `generateResume()`, `generateCoverLetter()`, ATS analysis, `humanizeContent()`, resume proofreading.
  - `src/lib/proofread/` — `lint.ts` (deterministic rule-based checks) + `applyFixes.ts`; results feed `ProofreadDrawer.tsx` for LLM-judged issues alongside auto-applied lint fixes (see Job page below).
  - `src/lib/llm/prompts/` — prompt templates per operation; untrusted/user-supplied data is wrapped in delimiters before interpolation to block prompt injection.
  - `src/lib/llm/chat-bot/` — chat-based editing assistant.
  - `src/lib/resume/editor.ts` — `applyResumeOps()`, the single deterministic, path-based (RFC-6902 JSON Patch via `fast-json-patch`) resume editor shared by every AI-driven mutation flow (proofread, humanizer, chat edit, tailor pipeline); the model names a JSON Pointer path per op instead of echoing text/arrays back, each op is re-validated against `ResumeSchema`, and a bad op is rejected without blocking the rest of the batch.
  - `src/lib/llm/tokenTracker.ts` — tracks token usage, persisted via `tokenUsage` server action.
  - `src/lib/keyStorage.ts` — API key storage: AES-256-GCM encrypted file on desktop (key derived from a per-install master key in the OS keychain via `src-tauri/src/keychain.rs`/`keyring`), `localStorage` on web. Use `getApiKey()`/`setKey()`, never store plaintext elsewhere.

### Data model (`prisma/schema.prisma`)

SQLite via Prisma. Core models: `Profile` (base profile, with skills/experience/projects/education/etc. stored as JSON string columns, plus `photo` and `hobbiesJson` for EU/German CV convention), `Company`, `Contact`, `Job`, `Resume`, `CoverLetter`, `Customization`. JSON columns map to typed shapes in `src/types/resume.ts` (`ResumeJSON`, `JobDetailsJSON`, `ATSAnalysisJSON`) — parse/stringify at the action boundary.

### Resume rendering / templates

Section content (order, visibility, custom sections) is resolved once via `buildSections()` (`src/components/job-v2/engine/buildSections.ts`) and rendered by three engines from the same `TemplateConfig`/section registry — DOM, PDF, and TXT stay in sync by construction. Each of the 9 templates is a `TemplateConfig` — columns, header/heading variant, `entryStyle` (standard/timeline/marker/compact/table), `skillStyle` (inline/chips/list/table/grid/columns), `dateStyle`, `bulletStyle`, `sidebarTint`, `justifyText`, etc. — resolved once via `resolveTemplateConfig()` (`engine/templates.ts`) so both engines apply the same defaults; `tests/lib/templateDistinctness.test.ts` asserts every pair of templates differs on ≥3 axes and exposes identical editable fields (config-driven templates share the same inline-editable surface, so a new `entryStyle`/`skillStyle` branch must re-wrap the same `EditableText`/`EditableDateRange` fields as the standard branch, not replace them with plain text):

- `src/components/job-v2/engine/` — `TemplateEngine.tsx` (DOM/WYSIWYG rendering), `sections.tsx` (section registry), `templates.ts` (all resume templates — `modern-minimal`, `tech-sidebar`, `creative-modern`, `two-tone`, etc. — as layout/style config objects, not components), `types.ts`, `bulletGlyph.ts`/`photoFrame.ts` (shared DOM+PDF style primitives).
- `src/components/job/templates/TemplateRenderer.tsx` dispatches `customization.template` to `TemplateEngine` via `engine/templates.ts`, falling back to the `modern-minimal` config for a legacy/unrecognized `template` value (originally adapted from the Resumify project, see `LICENSE-THIRD-PARTY.md`).
- `src/lib/pdf/` — `PDFTemplateEngine.tsx` + `sections.tsx` mirror the DOM engine for `@react-pdf/renderer` resume output (`resolveStyles.ts`, `fonts.ts`, `htmlToPdf.tsx`); `templates/` holds cover-letter PDF templates only, still one component per resume template (e.g. `ModernMinimalCoverLetterPDF.tsx`).
- `src/lib/pdfExport.ts` — PDF export entry point. `src/lib/txtExport.ts` — TXT export.
- `src/types/customization.ts` — `Customization`/`SanitizedCustomization` types and `DEFAULT_CUSTOMIZATION`/`validateCustomization` for per-job template styling (colors, fonts, layout).

### Job page

`src/app/job/[jobId]/` + `src/components/job-v2/` — the Inline Editor: WYSIWYG inline editing directly on the rendered document (`InlineJobPageLayout.tsx`, `DocumentCanvas.tsx` with zoom controls, `resume/InlineField.tsx`, `InlineEditContext.tsx`, `ChatOverlay.tsx`, `CustomizationDrawer.tsx`, `TemplatePicker.tsx`, `HistoryDrawer.tsx` for resume version history, `HumanizerModal.tsx` for AI humanizing, `ProofreadDrawer.tsx` for reviewing/applying LLM-judged proofread issues (deterministic lint fixes are auto-applied), `CoverLetterActionBar.tsx` for cover-letter regeneration with selectable tone/style presets from `src/lib/llm/prompts/coverLetterStyles.ts`). The chat assistant (`src/lib/llm/chat-bot/`) supports intents including resume tailoring, cover letter generation, humanize, proofread, fix-all-ATS-issues, and undo. This is now the only job detail page implementation — the earlier drag-and-drop editor and its standalone `/inline` route were removed. `src/app/documents/` lists all generated resumes/cover letters with version history across jobs.

### MCP server

`src/mcp/` exposes this app's resume flows (job parsing, tailoring, ATS analysis, cover letter generation, editing, proofreading, humanizing) as [Model Context Protocol](https://modelcontextprotocol.io) tools, so an external chat host (Claude Desktop, etc.) can drive them on the user's own subscription instead of a configured provider API key. It's purely additive and opt-in (off by default, toggled in Settings) — `Chatbot.ts` and the in-app chat are untouched. The server only reads/writes the same local SQLite database the app already uses and reuses the app's own prompt registry/validation/persistence layer; it never calls an LLM itself and never touches API keys. See `docs/MCP.md` for setup/security details, `docs/MCP_ARCHITECTURE.md` for how the server itself is built (diagrams of the tool surface, request lifecycle, and the `add_job` draft state machine), and `skills/resume-mcp/SKILL.md` for the tool-driving runbook.

### External links

`src/components/ExternalLinkGuard.tsx` intercepts anchor clicks app-wide and confirms with the user before opening external URLs via `src/lib/externalLink.ts` (`tauri-plugin-opener` on desktop, `window.open` on web) instead of navigating in-app.

### Content Security Policy

`src/proxy.ts` (not `next.config.ts`'s `headers()`) sets a per-request CSP with a fresh nonce, because the App Router needs `script-src` to allow its own inline RSC/hydration scripts — a nonce lets it do that without `'unsafe-inline'`. See `docs/SECURITY_AUDIT.md`.

### State management

- `src/contexts/` — React context (`JobPageContext`, `ThemeContext`).
- `src/store/modelStore.ts` — Zustand store for selected LLM model/provider, plus per-model reasoning-effort/temperature/top-p preferences.
- TanStack Query (`QueryClientProvider` in `src/components/AppShell.tsx`) wraps Server Action calls — `useQuery`/`useMutation` for data fetching/mutation (e.g. `useProfileQuery.ts`, `useJobPageDataQuery.ts`, `JobPageContext.tsx`), `useReactTable` (`@tanstack/react-table`) for the job/table list views (`ui/Table.tsx`, `JobTableClient.tsx`).

### Styling

Tailwind CSS v4. Shared design tokens live in `src/styles/global.css` inside an `@theme {}` block — define new tokens there so Tailwind generates utility classes (e.g. `bg-brand-primary`). Do not use inline `style={{}}`, `var()` inside class strings, or arbitrary `[--token:value]` declarations in JSX.

### Debugging the built (installed) desktop app

The built Tauri app has no attached terminal/console, so a bug that only shows up "after build" (e.g. a button that's disabled or does nothing) has to be diagnosed from log files under the app's `$APPDATA` dir instead of `npm run dev` output.

The bundled server (`src-tauri/src/lib.rs::spawn_bundled_next_server`) runs on **port 3009**, reading from a separate SQLite database at `$APPDATA/app.db` — distinct from both `npm run dev`'s port 3008 and this repo's local `dev.db`. If a build/installed app is left running, `curl localhost:3008` and `curl localhost:3009` will return different job/resume data; don't assume a request to one port reflects the other's state.

On every launch, `sync_database_schema` (`src-tauri/src/lib.rs`) runs `migrate-app-db.mjs` against the bundled `app-template.db` to ALTER an existing `$APPDATA/app.db` onto the current schema — app updates replace the bundle but never touch a user's existing `app.db`, so this is what carries a `prisma/schema.prisma` change (e.g. a new column) forward for already-installed users. Harmless no-op once the db is current.

- `$APPDATA/logs/server.log` — stdout+stderr of the bundled Next.js server (`src-tauri/src/lib.rs::spawn_bundled_next_server`), i.e. Server Action errors, Prisma errors, unhandled exceptions on the server side. Truncated fresh on every app launch.
- `$APPDATA/logs/client.log` — JSON-lines mirror of every `logger.*()` call from client code (`src/lib/logger.ts`), i.e. the same errors the browser devtools console would show (e.g. `SettingsPage`'s save-key/backup/restore handlers all log their catch blocks here). Appended across launches, no rotation.

`$APPDATA` resolves per-OS to (bundle id `com.resumebuilder.dev`): macOS `~/Library/Application Support/com.resumebuilder.dev`, Windows `%APPDATA%\com.resumebuilder.dev`, Linux `~/.config/com.resumebuilder.dev`. When asked to debug an installed-app-only issue, read both log files before speculating.

## Skills

- `tailwind-ui-designer` (`.claude/skills/tailwind-ui-designer/SKILL.md`) — invoke whenever the user asks to build, restyle, or improve UI. Enforces the Tailwind v4 styling constraints above and follows the `frontend-design` skill.
- `resume-mcp` (`skills/resume-mcp/SKILL.md`) — for an MCP-connected host (not Claude Code itself) driving this app's resume flows via `src/mcp/`; the step-by-step tool-chain runbook referenced from `docs/MCP.md`.

<!-- last-sync-docs: b369e98d81b131710e72abb2e915379cf7edece5 -->
