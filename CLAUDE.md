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
  - `src/lib/llm/providers/factory.ts` + `registry.ts` — central provider factory/registry. All providers (OpenAI, Gemini, Grok, Perplexity, Ollama, Anthropic) implement `LLMProvider.ts` and self-register via `providers/index.ts`. Always go through `ProviderFactory`, never instantiate a provider class directly.
  - `src/lib/llm/llmService.ts` — high-level operations: `parseJobDescription()`, `generateResume()`, `generateCoverLetter()`, ATS analysis, humanizer.
  - `src/lib/llm/prompts/` — prompt templates per operation.
  - `src/lib/llm/chat-bot/` — chat-based editing assistant.
  - `src/lib/llm/tokenTracker.ts` — tracks token usage, persisted via `tokenUsage` server action.
  - `src/lib/keyStorage.ts` — API key storage (Tauri encrypted store on desktop, localStorage on web). Use `getApiKey()`/`setKey()`, never store plaintext elsewhere.

### Data model (`prisma/schema.prisma`)

SQLite via Prisma. Core models: `Profile` (base profile, with skills/experience/projects/education/etc. stored as JSON string columns), `Company`, `Contact`, `Job`, `Resume`, `CoverLetter`, `Customization`. JSON columns map to typed shapes in `src/types/resume.ts` (`ResumeJSON`, `JobDetailsJSON`, `ATSAnalysisJSON`) — parse/stringify at the action boundary.

### Resume rendering / templates

- `src/components/job/templates/` — PDF/preview resume templates (e.g. `ModernMinimalTemplate.tsx`), adapted from the Resumify project (see `LICENSE-THIRD-PARTY.md`).
- `src/lib/pdf/` and `src/lib/pdfExport.ts` — PDF generation via `@react-pdf/renderer` / `pdf-lib`.
- `src/lib/txtExport.ts` — TXT export.
- `src/types/customization.ts` — `Customization`/`SanitizedCustomization` types and `DEFAULT_CUSTOMIZATION`/`validateCustomization` for per-job template styling (colors, fonts, layout).

### Job page (two coexisting implementations)

- `src/app/job/[jobId]/` + `src/components/job/` — original job detail page (`JobPageLayout.tsx`, `JobPageContext.tsx`), drag-and-drop resume editor.
- `src/app/job/[jobId]/inline/` + `src/components/job-v2/` — newer "Inline Editor V2": WYSIWYG inline editing (`InlineJobPageLayout.tsx`, `DocumentCanvas.tsx`, `resume/EditableSection.tsx`, `resume/InlineField.tsx`, `InlineEditContext.tsx`, `ChatOverlay.tsx`, `CustomizationDrawer.tsx`, `TemplatePicker.tsx`). See `docs/plans/inline-editor-v2-refined-plan.md` for the plan/rollout. When working on job-page UI, check which of these two trees the task targets — avoid mixing patterns between them.

### State management

- `src/contexts/` — React context (`JobPageContext`, `ThemeContext`).
- `src/store/modelStore.ts` — Zustand store for selected LLM model/provider.
- No React Query; data flows via Server Actions + local component/context state.

### Styling

Tailwind CSS v4. Shared design tokens live in `src/styles/global.css` inside an `@theme {}` block — define new tokens there so Tailwind generates utility classes (e.g. `bg-brand-primary`). Do not use inline `style={{}}`, `var()` inside class strings, or arbitrary `[--token:value]` declarations in JSX.

## Skills

- `tailwind-ui-designer` (`.claude/skills/tailwind-ui-designer/SKILL.md`) — invoke whenever the user asks to build, restyle, or improve UI. Enforces the Tailwind v4 styling constraints above and follows the `frontend-design` skill.
