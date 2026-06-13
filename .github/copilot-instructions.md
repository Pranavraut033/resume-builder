# AI Coding Agent Instructions for Resume Builder

## Architecture Overview

This is a local-first desktop app using Next.js (App Router) frontend wrapped in Tauri, with Prisma ORM on SQLite. Architecture: Client components + Server Actions only—NO REST APIs. Core flow: Base profile → Job description → AI-tailored resume/cover letter → Manual editing → Export. All data stays local; cloud LLMs are optional.

## Key Patterns

- **Server Actions**: ALL database operations use Next.js Server Actions in `src/actions/`. Example: `await createJob({ description, selectedModel, selectedProvider })`.
- **Prisma Client**: Singleton instance in `src/lib/prisma.ts`. Server Actions import and use `prisma` directly.
- **LLM Abstraction**: Use `LLMProvider` interface in `src/lib/llm.ts`. Providers instantiated in server actions.
- **Resume Structure**: Strict `ResumeJSON` type in `src/types/resume.ts`. Sections: header, summary, experience[], projects[], skills[], education[], certifications[].
- **Drag & Drop**: Use `@dnd-kit` for reordering. See `ResumeEditor.tsx` for `DndContext`, `SortableContext`, and `SortableSection` component.
- **Database**: Prisma schema in `prisma/schema.prisma`. Tables: profiles, jobs, resumes, coverLetters. Use camelCase in code.
- **Secure Storage**: API keys via Tauri store in `src/lib/keyStorage.ts`. Never store plaintext; use `getKey()` and `setKey()`.

## Workflows

- **Development**: `npm run dev` for web, `tauri dev` for desktop. Build: `npm run build && tauri build`.
- **Database**: `npx prisma generate` after schema changes, `npx prisma db push` to sync database.
- **Code Quality**: `npm run lint:fix`, `npm run format`, `npm run type-check`. No TODO comments allowed.
- **Server Actions**: Create in `src/actions/`, mark with `'use server'` directive, export async functions only.

## Conventions

- **Architecture**: Client components call Server Actions only. NO REST APIs, NO fetch() to internal endpoints.
- **Server Actions**: All in `src/actions/` directory. Use `'use server'` directive. Import Prisma from `@/lib/prisma`.
- **Strict TypeScript**: Explicit types, no `any`. Follow Next.js conventions.
- **Local-First**: No mandatory cloud. Ollama for offline AI.
- **Status Tracking**: Update `STATUS.md` for tasks. Mark complete with timestamp and summary before starting new work.
- **Components**: Reusable UI in `src/components/ui/`. Use `Button`, `Modal` (Headless UI), `Select` (Combobox).
- **Exports**: PDF via `pdf-lib` in `src/lib/pdfExport.ts`, TXT in `src/lib/txtExport.ts`.

## Integration Points

- **LLM Providers**: OpenAI, Gemini, Grok, Ollama. Operations happen CLIENT-SIDE via `src/lib/clientLLM.ts`.
- **API Keys**: Accessed via `src/lib/keyStorage.ts` in Tauri context (client-side only).
- **Backup**: Optional Google Drive in `src/lib/backup.ts` (placeholder).
- **Job Parsing**: Use LLM for structured parsing via `parseJobDescription()` (client-side).

## Examples

- **Server Action (Database)**: Create `src/actions/feature.ts`, add `'use server'`, export async function using Prisma.
- **Client calling action**: `const result = await myAction(params)` from client component.
- **LLM Operation (Client)**: Import from `@/lib/clientLLM`, call in client component with API keys from keyStorage.
- **Edit resume**: Call `updateResume(jobId, contentJson)` Server Action from client.
- **Generate resume**: Use `generateResume()` from `clientLLM` on client, then save via Server Action.
- **New feature**: Check `docs/plans/requirements.md`, implement incrementally.
