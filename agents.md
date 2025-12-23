You are an autonomous coding agent working on a local-first, open-source
desktop application described in requirements.md.

## Architecture: Client-First Next.js + Server Actions

This application uses a modern Next.js architecture:
- **Client Components**: Handle UI, state, user interaction
- **Server Actions**: Handle ALL database operations via Prisma
- **NO REST APIs**: No `/api/*` routes exist or should be created
- **NO Client-Side DB Access**: Clients never import Prisma directly

You must strictly follow these rules:

1. Status Tracking
- There exists a file named `STATUS.md`.
- This file contains a checklist of features and milestones.
- Before starting any task:
  - Read STATUS.md
  - Identify the next incomplete item
- After completing a task:
  - Mark it as completed with a clear timestamp
  - Add a short summary of what was done
  - Do NOT remove previous entries
- For any new features, fixes, or updates added during tasks:
  - Update STATUS.md with new entries under appropriate sections
  - Update requirements.md if the changes affect the project requirements or add new features
  - Ensure STATUS.md reflects the current state accurately
- Apply this for future prompts as well.

2. Incremental Progress
- Work on ONE logical unit at a time.
- Do not start a new feature until the current one is marked complete.
- Prefer small, verifiable commits over large changes.

3. Source of Truth
- `requirements.md` is the single source of truth.
- If something is unclear, infer conservatively.
- Never invent features not described unless explicitly marked as OPTIONAL.

4. TypeScript & Structure
- Use strict TypeScript.
- Prefer explicit types.
- Avoid `any`.
- Follow Next.js conventions consistently.
- Server Actions in `src/actions/` with `'use server'` directive.
- Client components call Server Actions directly, never via fetch/axios.

5. Local-First Constraint
- Do not introduce mandatory cloud services.
- Any cloud integration must be optional and configurable.
- Ollama and offline usage must remain functional.

6. Database Operations
- ALL database operations use Prisma via Server Actions.
- Prisma client imported from `@/lib/prisma`.
- Never use Drizzle or raw SQL.
- Schema in `prisma/schema.prisma`.

7. LLM Operations
- ALL LLM operations happen on CLIENT SIDE via `@/lib/clientLLM`.
- Server actions NEVER call LLM providers directly.
- API keys accessed via `@/lib/keyStorage` on client only.
- Pattern: Client does LLM work → Server Action saves to database.

6. Documentation
- When adding a new module, include:
  - A short README comment at the top
  - Clear function-level comments where logic is non-trivial

7. Continuation Behavior
- If interrupted, resume by:
  - Reading STATUS.md
  - Continuing from the first unchecked item
- Never redo completed work unless explicitly instructed.

Your objective is to fully implement the project described in requirements.md
by iteratively completing and marking tasks in STATUS.md.

## UI & Style Guidelines

All UI for agents, Copilot-like helpers, and internal system surfaces **must** follow the Tailwind-first style guide. See `STYLE_GUIDE.md` in the repository root for guidance on tokens, spacing-first layout, component patterns, accessibility, and microcopy. Any divergence from the guide must be documented and justified (accessibility reasons, platform constraint, or cross-browser bug).
