# CLAUDE.md

Guidance for Claude Code (claude.ai/code) working in this repository.

This file is a **router**, deliberately kept short because it loads on every turn. The detail lives in the
knowledge files below.

## Read this before exploring

**Check the table below before grepping, running `codegraph_explore`, or spawning an Explore/research
subagent.** These files exist specifically so a task doesn't need a codebase-wide search — each is denser and
more current than what a fresh grep pass would reconstruct, including invariants and silent-failure modes a
directory listing can't show. If a task's topic has a row below, **read that file directly as your first
step, in the main thread** — do not spawn an agent to re-derive what it already contains.

| Read this                                                                  | When                                                                             |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [`.claude/knowledge/data-layer.md`](.claude/knowledge/data-layer.md)       | Prisma schema, models, JSON columns, Server Actions, adding a column             |
| [`.claude/knowledge/llm-runtime.md`](.claude/knowledge/llm-runtime.md)     | Providers, API-key storage, prompt registry, `applyResumeOps`, token tracking    |
| [`.claude/knowledge/rendering.md`](.claude/knowledge/rendering.md)         | Resume templates, DOM/PDF/TXT engines, pagination, export, customization         |
| [`.claude/knowledge/app-surface.md`](.claude/knowledge/app-surface.md)     | Routes, the Inline Editor, bookmarks, notifications, state management, styling   |
| [`.claude/knowledge/desktop-tauri.md`](.claude/knowledge/desktop-tauri.md) | Built-app debugging, ports/databases, logs, updater, keychain, CSP               |
| [`.claude/knowledge/chat-mcp.md`](.claude/knowledge/chat-mcp.md)           | The chat assistant (`src/lib/llm/chat-bot/`) and MCP server (`src/mcp/`) surface |

Project docs for humans: `docs/MCP.md`, `docs/MCP_ARCHITECTURE.md`, `docs/SECURITY_AUDIT.md`,
`docs/DISTRIBUTION.md`, `docs/UI_COMPONENTS_GUIDE.md`.

**Only after** the matching file turns out not to cover what's needed (a specific symbol it doesn't mention, a
detail that's since changed) — or the task has no matching row at all — fall back to the tools below.

## Code search

This project has CodeGraph (`mcp__codegraph__*`) set up — a pre-indexed knowledge graph of all symbols, files,
and call relationships.

- Prefer `codegraph_explore` over grep/Read for "how does X work", "where is X", architecture, or bug
  investigation — it returns verbatim source grouped by file in one call.
- Use `codegraph_callers` / `codegraph_callees` / `codegraph_impact` for "what calls this" / blast-radius
  questions before refactoring.
- Use `codegraph_search` for quick symbol lookups (location, kind, signature).
- Fall back to grep only for literal strings (error messages, config keys) that aren't code symbols.
- Spawning an Explore subagent for open-ended search is a last resort here, not a default — the table above
  already covers most of this codebase's surface area more cheaply.

## Hard rules

1. **Server = database only. LLM = client only.** `src/actions/*` (`'use server'`) do only Prisma/SQLite CRUD.
   No REST route handlers, no server-side `fetch` to internal endpoints, no LLM call on the server ever — API
   keys must never leave the client / Tauri secure storage.
2. **`applyResumeOps()` (`src/lib/resume/editor.ts`) is the only way a resume is ever mutated.** Never add a
   second mutation path.
3. **Untrusted text is delimiter-wrapped before prompt interpolation** (`src/lib/llm/prompts/sanitize.ts`).
4. **Tailwind v4 tokens go in `src/styles/global.css`'s `@theme {}` block.** No inline `style={{}}`, no
   `var()` in class strings, no arbitrary `[--token:value]` in JSX.
5. **A `prisma/schema.prisma` change must also update `scripts/migrate-app-db.mjs`**, or installed desktop
   apps break on update.

## Architecture in one paragraph

Local-first desktop resume/cover-letter builder: Next.js 16 (App Router) + Tauri, Prisma ORM on SQLite. Core
flow: base profile → paste job description → AI-tailored resume + cover letter → manual inline editing →
PDF/TXT export. Two workspace packages (`packages/llm-core`, `packages/ats-checker`) are built by
`predev`/`prebuild` before Next runs.

## Commands

```bash
npm run dev              # Next.js dev server on port 3008 (built app uses 3009 — see desktop-tauri.md)
npm run build            # Production build
npm run lint:fix         # ESLint with autofix
npm run format           # Prettier write
npm run type-check       # tsc --noEmit
npm run test:run         # Vitest single run  (append -- path/to/file.test.ts for one file)
npm run test:e2e         # Playwright e2e suite
npm run db:generate      # prisma generate
npm run db:push          # prisma db push (apply schema to SQLite)
npm run db:studio        # Prisma Studio GUI
npm run tauri dev        # Tauri desktop app (dev)
npm run tauri build      # Tauri desktop app (build)
npm run mcp              # Run the MCP server over stdio
```

Also available: `test`/`test:ui`/`test:coverage`, `lint`, `format:check`, `desktop:build:{mac,mac:x64,mac:universal,windows,linux}`,
`build:mcp`, `prepare:tauri-server`, `landing:{dev,build,preview,install}`.

Before committing: `npm run lint:fix && npm run format && npm run type-check`.
After editing `prisma/schema.prisma`: `npm run db:generate && npm run db:push` (plus hard rule 5).

## Skills

- `resume-template-builder` (`.claude/skills/resume-template-builder/SKILL.md`) — invoke to add, audit, or
  polish a resume template. Reads [`.claude/knowledge/rendering.md`](.claude/knowledge/rendering.md) first.
- `tailwind-ui-designer` (`.claude/skills/tailwind-ui-designer/SKILL.md`) — invoke for any UI build/restyle.
- `resume-mcp` (`skills/resume-mcp/SKILL.md`) — runbook for an _external_ MCP host driving `src/mcp/`.

Remaining subagents (`.claude/agents/`) are `sonnet-builder` / `haiku-builder` — cheaper-model delegation for
planned work clusters. Knowledge-plus-checklist work belongs in a skill, not an agent: an agent only earns its
own file when it has tools or a model the main thread lacks.

## Content outside this repo

- **Marketing** — brand voice, launch copy, and planning live in the private sibling repo `../udaan-marketing`
  (`github.com/Pranavraut033/udaan-marketing`). Not duplicated here.
- **Interview knowledge base** — draft playbook at
  `/Users/pranavraut/Documents/Workspace/interview-kb/interview-playbook.md`, intended for the mock-interview
  feature on the `feature/mock-interview` branch. Not wired in on `main`; see
  [`.claude/knowledge/llm-runtime.md`](.claude/knowledge/llm-runtime.md).

<!-- last-sync-docs: 17158c00cb408d931d8259e8b4246d1799f5f66e -->
