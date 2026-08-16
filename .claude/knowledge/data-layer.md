# Data layer — Prisma, Server Actions, JSON boundary

Read this for: schema/model questions, adding a column, anything touching `src/actions/` or `src/lib/db/`.
Sibling files: [llm-runtime.md](llm-runtime.md), [app-surface.md](app-surface.md), [desktop-tauri.md](desktop-tauri.md).

## The hard rule

**Server = database only. LLM = client only.**

`src/actions/*` are `'use server'` files that do **only** Prisma/SQLite CRUD. No REST route handlers, no
server-side `fetch` to internal endpoints, no LLM call ever runs on the server. There is no `src/app/api/`
directory and adding one is a design violation, not a shortcut.

## Models (`prisma/schema.prisma`)

SQLite via Prisma. `generator client` outputs to `node_modules/.prisma/client`; `datasource db` takes its
URL from the environment (`DATABASE_URL`), which is why the dev DB and the packaged desktop DB can differ
(see [desktop-tauri.md](desktop-tauri.md)).

Every model is snake_case in SQLite via `@map`, camelCase in TypeScript.

| Model            | Table              | Notes                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Profile`        | `profiles`         | The base CV. Multi-profile: `label` distinguishes them. Scalar contact fields + **10 JSON string columns** (see below). EU/German CV fields: `photo` (base64 data URL), `nationality`, `dateOfBirth`, `hobbiesJson`, plus `workAuthorization`.                                                                                                      |
| `Company`        | `companies`        | Employer info (`industry`, `marketPosition`, `locationCity`/`locationCountry`). One-to-many with `Job`.                                                                                                                                                                                                                                             |
| `Contact`        | `contacts`         | Recruiter details. Optional 1:1 with `Job`.                                                                                                                                                                                                                                                                                                         |
| `Job`            | `jobs`             | Central row. `status` is a **string constrained at the application level**, not a DB enum — see `JOB_STATUSES` in `src/types/job.ts`. `jobDetailsJson` holds parsed JD. Optional `url` (deduped by `findJobByUrl`).                                                                                                                                 |
| `Resume`         | `resumes`          | `contentJson` = `ResumeJSON`. Required 1:1 `Customization`. Has many `ResumeSnapshot`.                                                                                                                                                                                                                                                              |
| `ResumeSnapshot` | `resume_snapshots` | Version history — `contentJson` + `label`, indexed on `resumeId`. Powers `HistoryDrawer.tsx`.                                                                                                                                                                                                                                                       |
| `CoverLetter`    | `cover_letters`    | `contentText` is **plain text, not JSON** — unlike `Resume`. Required 1:1 `Customization`.                                                                                                                                                                                                                                                          |
| `Customization`  | `customizations`   | Per-document styling. Legacy scalar columns (`template`, `fontSize`, `pageFormat`, `fontFamily`, `lineHeight`, `marginSize` as a CSV of inches, `colors` as a CSV, `background`, `dateFormat`, `fitToPage`) **plus** `themeJson`. `themeJson == null` means "derive from the legacy scalars via `legacyToTheme()`" — do not assume it is populated. `coverLetterTemplate` (nullable) is the cover letter's own template id, independent of `template` (the resume's); null means "not chosen yet, derive from `template`" — see [rendering.md](rendering.md). |
| `TokenUsage`     | `token_usage`      | Analytics. `id` is a uuid string (every other model is autoincrement Int). Cost stored as `costMicrocents` (USD × 1e6) to stay integer. Indexed on provider/model/createdAt/purpose/requestId.                                                                                                                                                      |
| `ATSAnalysis`    | _(unmapped)_       | `contentJson` = `ATSAnalysisJSON`. The only model **without** an `@@map`, so its table is `ATSAnalysis`. Attached to both `Job` (as `baseProfileAnalysis`) and `Resume`.                                                                                                                                                                            |

### JSON string columns

SQLite has no JSON type here — these are `String` columns holding serialized JSON. Parse/stringify **at the
Server Action boundary** so callers only ever see typed objects.

- `Profile`: `skillsJson`, `experienceJson`, `projectsJson`, `educationJson`, `certificationsJson` (all
  `@default("[]")`, non-null) and `publicationsJson`, `languagesJson`, `volunteerJson`, `awardsJson`,
  `hobbiesJson` (nullable — absent means the section was never filled).
- `Job.jobDetailsJson` → `JobDetailsJSON`; `Resume.contentJson` / `ResumeSnapshot.contentJson` → `ResumeJSON`;
  `ATSAnalysis.contentJson` → `ATSAnalysisJSON`. All defined in `src/types/resume.ts`.

A `Profile`'s content is structurally a `ResumeJSON` too — that is what lets `applyResumeOps()` edit a profile
(the MCP profile-edit trio, see `.claude/knowledge/chat-mcp.md`).

### Cascades

Nearly every relation is `onDelete: Cascade`, so deleting a `Job` takes its `Resume`, `CoverLetter`, `Contact`,
and `ATSAnalysis` with it. `Job.profile` is the exception (no cascade) — deleting a `Profile` does not delete
its jobs.

## Server Actions (`src/actions/`)

| File              | Exports                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `job.ts`          | `createJob`, `attachGeneratedMaterials`, `createResume`, `getAllJobs`, `getJobById`, `getJob`, `updateJobStatus`, `deleteJob`, `deleteJobById`, `getResumeByJobId`, `updateResume`, `getResumeSnapshots`, `restoreResumeSnapshot`, `saveAtsAnalysis`, `getCoverLetterByJobId`, `updateCoverLetter`, `updateOrCreateCustomization`, `findJobByUrl`, `getAllDocuments`, `getAllJob` |
| `profile.ts`      | `getAllProfiles`, `getProfileById`, `createProfile`, `updateProfile`, `deleteProfile`                                                                                                                                                                                                                                                                                             |
| `tokenUsage.ts`   | Token-usage persistence, written by `src/lib/llm/tokenTracker.ts`, read by `/analytics/tokens`.                                                                                                                                                                                                                                                                                   |
| `backup.ts`       | Full-database JSON export/import behind Settings → "Backup & Restore". **Excludes API keys** — they never live in SQLite (see [llm-runtime.md](llm-runtime.md)). Tested in `backup.test.ts`.                                                                                                                                                                                      |
| `urlFetcher.ts`   | Server-side fetch of a job-posting URL (this is fetching an _external_ page, which is allowed — the ban is on server→internal-endpoint calls and server-side LLM). Tested in `urlFetcher.test.ts`.                                                                                                                                                                                |
| `getServerUrl.ts` | Resolves the running server's own base URL (differs dev vs. bundled desktop).                                                                                                                                                                                                                                                                                                     |

`createJob` vs `attachGeneratedMaterials`: `createJob` makes a new `Job` row; `attachGeneratedMaterials`
attaches a resume/cover letter/ATS analysis to an **existing** row and flips its status — that is the bookmark
promotion path (see [app-surface.md](app-surface.md)).

`src/lib/db/job.ts` holds the non-`'use server'` query helpers the actions and the MCP server share
(`src/mcp/db.ts` reaches these through `McpDeps`), tested in `src/lib/db/job.test.ts`.
`src/lib/prisma.ts` is the singleton client.

## Changing the schema

1. Edit `prisma/schema.prisma`.
2. `npm run db:generate` then `npm run db:push`.
3. **Also update `scripts/migrate-app-db.mjs`** if installed desktop apps must carry the change forward — a
   `db push` only touches the local `dev.db`, never an existing user's `$APPDATA/app.db`. This step is the one
   most often forgotten; see [desktop-tauri.md](desktop-tauri.md).
