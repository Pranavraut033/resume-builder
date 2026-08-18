# Chat assistant & MCP server — one surface, two front doors

Read this for: adding/updating/removing a chat intent or MCP tool, a new prompt template driving either,
"what tool handles X", or a report that the two sides have drifted.

Not for resume template/rendering work ([rendering.md](rendering.md)) or unrelated app code.

## The core invariant

The in-app chat assistant (a human typing into `ChatOverlay.tsx`) and the MCP server (an external host like
Claude Desktop driving `src/mcp/`) are **one capability surface with two front doors**. Every resume-domain
capability — tailor, Deep Analysis, term alignment, humanize, cover letter, edit-by-instruction, Fit Check,
undo, bookmark — should be reachable from both, because both are just different callers of the same
prompt/apply-ops machinery underneath.

A purpose left in `MCP_PURPOSES` with no chat equivalent (or vice versa) is drift. Where one-sided support is
genuinely correct, it is documented under "Known intentional asymmetry" at the bottom — add to that list
rather than leaving a surface silently lopsided.

**Never:**

- Call an LLM from `src/mcp/*` — the server only serves/validates prompts, per the client-only-LLM hard rule.
- Add a REST endpoint or server-side `fetch` for chat/MCP glue.
- Duplicate prompt-building or resume-mutation logic instead of reusing `templateRegistry` / `applyResumeOps()`.

## Evaluating a new-tool request

Before writing any code:

1. **Overlap check** — does an existing `IntentLabel` (chat) or `MCP_PURPOSES`/`FLOW_CATALOG` entry (MCP)
   already cover this under a different name? Read `intentClassifier.ts`'s checklist and `src/mcp/flows.ts`
   in full before concluding it's new.
2. **Usefulness check** — a resume-domain capability a real user invokes repeatedly, or a speculative one-off?
3. **Scope check** — a prompt template + one intent/purpose is in scope. A new UI surface, DB model, or
   external API integration is not: flag and stop.

## Adding a capability (both sides)

1. **Prompt template** — new module under `src/lib/llm/prompts/templates/` (or `chat-bot/prompts/` if
   chat-shaped, e.g. needs `IntentLabel` context) registering a new `PromptPurpose` with `templateRegistry`.
   `deep-analysis.ts`/`fit-check.ts` are the models to copy: system/user prompt builder + Zod output schema.
2. **Chat side** — add the `IntentLabel` + classifier checklist entry in `intentClassifier.ts` (**order
   matters**: insert where an earlier check can't shadow it), `INTENT_STATUS_TEXT` narration in `Chatbot.ts`,
   and wire the handler (a `domainOps`/`llmService` branch, or a new `ToolDefinition` in `chat-bot/tools/`).
3. **MCP side** — add the purpose to `MCP_PURPOSES` and its Zod schema to `RESULT_SCHEMAS` in `server.ts`; add
   or extend a `FLOW_CATALOG` entry in `flows.ts`. A capability that's a direct, no-reprompt tool call rather
   than an LLM purpose (like `align_resume_terms`) is a standalone `server.registerTool`, not a
   `MCP_PURPOSES`/`FLOW_CATALOG` entry — see its own section below. If it needs DB access beyond `McpDeps`,
   extend `McpDeps` + `defaultDeps` — never call a DB function directly, the DI seam is what tests fake.
4. **Docs** — `docs/MCP_ARCHITECTURE.md` if the tool surface or `add_job` state machine changed, `docs/MCP.md`
   if setup/security-relevant, `skills/resume-mcp/SKILL.md` if a flow's step sequence changed (this is the
   wire-facing runbook an external host actually reads — update it in the SAME change, not later).
5. **Tests** — mirror `tests/lib/mcp/` for the MCP side, the chat-bot pipeline tests for the chat side.
6. **Update the tables below** — an index that drifts actively misdirects the next lookup.

Structural model to copy: `document_fix` (analyze → structured findings → `align_resume_terms` for additive
swaps or `apply_resume_ops` for everything else).

## Updating / deprecating

Updating touches the same file set, usually only one or two of them. Update the tables below only if a file's
_purpose_ changed, not for a wording tweak.

To deprecate: confirm nothing in `FLOW_CATALOG`/`nextPurposeFor` or the intent checklist depends on it
(`codegraph_callers`/`codegraph_impact` on the purpose/intent symbol), remove from **both sides in the same
change**, delete dead templates/tools/schemas/tests together — no re-exports or `// removed` comments.

---

## Chat side (`src/lib/llm/chat-bot/`)

| File                              | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Chatbot.ts`                      | Entry point — `chat()` streams `ChatStreamEvent`s. Classifies intent, dispatches to a handler, holds `INTENT_STATUS_TEXT` narration. `case "deep_analysis"` calls `domainOps.analyzeDocument`; `case "fit_check"` calls `domainOps.analyzeFit` and stashes the result on `this.fitCheck` — never mutates the resume, so it's excluded from the shared resume-mutating `ChatStreamEvent` branch. `case "align_terms"` runs `analyzeDocument` again if there's no cached findings, then resolves each additive finding into a verified `ResumeOp` itself (`resolveAlignOp`/`normalizeTokens`/`isStrictSubset`, near the top of the file) — this is a hand-kept-in-sync mirror of `src/mcp/guards.ts`'s `guardAlignOps`/`normalizeTokens`, not a shared import (this module reaches into provider calls elsewhere and the MCP guard must never call an LLM), so a change to one's additive-only rule must be mirrored in the other by hand. |
| `pipeline/agents.ts`              | 4 single-responsibility functions for the tailoring pipeline: `extractRequirements` (deterministic), `rewriteBullets`, `checkHallucinations`, `scoreResume` (LLM).                                                                                                                                                                                                                                                                                                                                                                                    |
| `pipeline/pipeline.ts`            | Orchestrates `agents.ts` into the tailoring loop (requirements → rewrite → verify → score, one bounded retry loop). Plain async generator, no graph lib.                                                                                                                                                                                                                                                                                                                                                                                              |
| `pipeline/pipeline.test.ts`       | Tests for the tailoring pipeline loop.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `prompts/index.ts`                | Barrel export for chat-bot prompt modules.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `prompts/intentClassifier.ts`     | `INTENT_CLASSIFIER_PROMPT` + `IntentLabel` enum + numbered checklist that maps a user message to exactly one intent. `IntentLabel`: `deep_analysis` (typos/wording/keywords/title — "what to change in the document"), `align_terms` (instructing findings to actually be fixed), `fit_check` (substantive resume-vs-JD fit — "should I apply", disambiguated from `deep_analysis`/`question`). The old standalone editorial-review intent no longer exists as its own label — it was absorbed into `deep_analysis`. Read in full before adding/reordering an intent.                                                                                                                                                                                            |
| `prompts/editFieldPrompt.ts`      | Builds the prompt for the `edit` intent's field-targeted rewrite.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `prompts/extractFieldsToEdit.ts`  | `extract_fields_to_edit` purpose — maps a free-text instruction to the resume paths it targets. Self-registers with `templateRegistry` on import; MCP's `server.ts` re-imports it as a side effect.                                                                                                                                                                                                                                                                                                                                                    |
| `prompts/interviewPrompt.ts`      | `interview` intent prompt (interview prep / likely questions).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `prompts/keywordMappingPrompt.ts` | No longer registers a `PromptTemplate` — the old ATS-fix-mapping round trip is gone. Exports `AtsFixMappingSchema` (the `item`/`op`/`path`/`value` argument contract for MCP's `align_resume_terms` tool) and `mappingsToResumeOps` (used only by `src/mcp/guards.ts`'s `guardAlignOps` to convert an accepted mapping into `ResumeOp[]`). Chat's own `align_terms` handler in `Chatbot.ts` does **not** use this module — it resolves `DocumentFinding`s directly with its own hand-kept-in-sync additive-only logic (see the `Chatbot.ts` row above).                                                                                                                                                                                                    |
| `prompts/questionPrompt.ts`       | `question` intent prompt (user asking, not instructing).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `tools/index.ts`                  | `RESUME_TOOLS` — the `edit_resume` `ToolDefinition` (JSON-Patch-shaped ops) the LLM calls as a function tool for the `edit` intent, plus `validateEditResumeArgs`.                                                                                                                                                                                                                                                                                                                                                                                     |

## MCP side (`src/mcp/`)

| File        | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `server.ts` | `buildServer()` — defines the 12 MCP tools (`list_flows`, `get_prompt`, `submit`, `apply_resume_ops`, `align_resume_terms`, `list_profiles`, `list_jobs`, `fetch_url`, `get_job_state`, `get_profile`, `preview_profile_edit`, `apply_profile_edit`). `MCP_PURPOSES` is the `PromptPurpose` allowlist exposed via `get_prompt`/`submit`: `parse_job`, `analyze_document`, `analyze_fit`, `generate_tailored_resume`, `generate_cover_letter`, `humanize_content`, `extract_fields_to_edit` — the four now-retired ATS/gap/proofread/keyword-fix purposes from before this schema collapse are gone. Never calls an LLM — only serves prompts and validates/persists the external LLM's structured response. `submit`'s `analyze_document` case behaves differently depending on whether the job already has a resume: no resume yet (add_job) re-stamps findings and carries them forward on the draft; a resume already exists (document_fix) guards + persists via `saveAtsAnalysis` and returns the merged result inline, ending the flow (`nextPurposeFor` returns `null`). `analyze_fit`'s `submit` case is validate-only (joins `humanize_content`/`extract_fields_to_edit`) — nothing persisted server-side; `FitCheckSchema`'s `Gap` carries no `resume_fix`/apply field at all, so there is no follow-up ops step for Fit Check, unlike `document_fix`. `align_resume_terms` is a standalone tool (not a `get_prompt`/`submit` purpose) — see its own row below. `get_profile`/`preview_profile_edit`/`apply_profile_edit` are a standalone propose-then-confirm tool trio for editing the base `Profile` row (MCP-only — see "Known intentional asymmetry"): `get_profile` reads full content via `getProfileById`, `preview_profile_edit` dry-runs `applyResumeOps` against it (with the non-schema `label` field split out first, else every op would spuriously reject), `apply_profile_edit` re-runs the same ops and persists via `updateProfile` — but only when the SAME call passes `confirm: true`; its description/response both tell the caller to advise a Settings → "Backup & Restore" export first. Not in `MCP_PURPOSES`/`FLOW_CATALOG` — no `PromptPurpose`/prompt template involved, so there's no `get_prompt`/`submit` step to model. |
| `flows.ts`  | `FLOW_CATALOG` — data mirror of the chat intents: `add_job`, `edit`, `document_fix`, `humanize`, `cover_letter`, `bookmark`, `fit_check`. `nextPurposeFor()` resolves the next `get_prompt` step, including `analyze_document`'s two-caller disambiguation via `hasResume` (add_job: scores the base profile, continues to `generate_tailored_resume`; `document_fix`: scores the already-tailored resume, flow ends there — caller turns findings into `align_resume_terms`/`apply_resume_ops` calls itself). The old standalone editorial-review flow entry no longer exists — it was absorbed into `document_fix`'s `analyze_document` step (which now also merges in `lintResume()`'s deterministic findings); the old keyword/format-scoring flow was renamed to `document_fix`, and the old substantive-fit flow was renamed to `fit_check`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `draft.ts`  | Server-side scratch state (process-memory, not persisted) for the `add_job` flow before a `Job` row exists — holds intermediate `jobDetails`/`atsAnalysis`/resume (the `atsAnalysis` field name is kept for historical reasons — see the field's own doc comment — but carries a `DocumentAnalysisJSON`, i.e. a Deep Analysis result, not the old ATS shape), and `lastSent` to avoid re-inlining data the host already has.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `guards.ts` | Post-Zod validation checks applied in `submit`/`align_resume_terms` before persistence (mirrors `domainOps.ts`'s guards minus the LLM call, since this server never calls one). `guardDocumentAnalysis` re-stamps every submitted finding to `source: "llm"` and merges in `lintResume()`'s own findings as the only `"lint"`-sourced ones — security-relevant, not just dedup: downstream consumers auto-apply `source === "lint"` findings without review. `guardAlignOps` is the `align_resume_terms` guard — the additive-only rule (every op's current resume value must be a strict token subset of its proposed value) — and the one MCP write path allowed to auto-apply a term swap without a human reviewing it first; `apply_resume_ops` has no equivalent content check by design.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `db.ts`     | Must be imported first (before `./server`) — resolves `DATABASE_URL` and flips SQLite to WAL mode before Prisma opens its connection.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `http.ts`   | Streamable HTTP transport entry point. Binds 127.0.0.1 + Origin-checks to close the DNS-rebinding/CSRF gap.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `stdio.ts`  | Stdio transport entry point — what `claude_desktop_config.json` points at.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

### `align_resume_terms` — a tool, not a `get_prompt`/`submit` purpose

Turns Deep Analysis `"keyword"`/`"correctness"` findings the calling model already has (from an `analyze_document`
call) into resume ops and applies them directly, in one call — no re-prompt, no separate mapping-purpose round
trip the way the old keyword-fix purpose needed. Its argument shape is `AtsFixMappingSchema.shape.ops` (from
`chat-bot/prompts/keywordMappingPrompt.ts`, unchanged from that old purpose's output shape). Guarded server-side
by `guardAlignOps`
(additive-only — see the `guards.ts` row above); rejects the WHOLE call if any single op isn't additive. Not in
`FLOW_CATALOG` on its own, but is `document_fix`'s second step (see that flow's description in
`skills/resume-mcp/SKILL.md`, the wire-facing description of exactly what it does).

## Shared machinery (both sides call this — never duplicate)

| File                                              | Purpose                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/llm/prompts/registry.ts`                 | `templateRegistry` singleton — the `PromptPurpose` → template map both chat (`domainOps`/`llmService`) and MCP (`get_prompt`/`submit`) read from.                                                                                                                                                                                                                    |
| `src/lib/llm/prompts/types.ts`                    | `PromptContext`, `PromptPurpose`, `PromptTemplate` type definitions.                                                                                                                                                                                                                                                                                                 |
| `src/lib/llm/domainOps.ts`                        | Free functions for resume-domain LLM ops: `parseJobDetails`, `parseResume`, `generateResume`, `analyzeDocument` (Deep Analysis — merges the LLM pass with `lintResume()`'s deterministic checks), `analyzeFit` (Fit Check — single LLM call, no deterministic merge), `generateCoverLetter`, `humanizeContent`. Chat calls these directly; MCP's `guards.ts` mirrors their validation but not the LLM call itself.                                              |
| `src/lib/llm/llmService.ts`                       | High-level chat-only entry points (`parseJobDescription`, `generateResume`, etc.) built on `domainOps.ts`.                                                                                                                                                                                                                                                          |
| `src/lib/resume/editor.ts`                        | `applyResumeOps()` — the one deterministic, path-based resume mutator. Chat calls it directly; MCP exposes it as `apply_resume_ops`, reuses it internally for the guarded `align_resume_terms` write, and reuses it (unexposed to chat) for MCP-only base-profile edits via `preview_profile_edit`/`apply_profile_edit` in `src/mcp/server.ts` — a `Profile` row's content is a `ResumeJSON` too.                                |
| `src/lib/proofread/lint.ts`                       | Deterministic lint checks (`lintResume`), auto-merged into Deep Analysis (`analyzeDocument`/`analyze_document`) results on both sides — there is no longer a separate standalone proofread pass.                                                                                                                                                                    |
| `src/types/llm.ts`                                | `ToolDefinition`, `JSONSchemaProperty` — shared tool-schema shape used by chat's `RESUME_TOOLS` and (structurally) MCP's Zod tool schemas.                                                                                                                                                                                                                          |
| `src/types/documentAnalysis.ts`                   | `DocumentAnalysisSchema`/`DocumentAnalysisJSON` — Deep Analysis's shape: a flat `findings[]` array (`kind`: correctness/impact/keyword/duplication/provenance/title; `path`/`original`/`suggestion`/`severity`/`why`/`source`) + `summary`. Replaces the deleted `src/types/gapAnalysis.ts`'s ATS/proofread halves. `v: z.literal(2)` — a pre-shape stored blob fails to parse rather than being tolerantly back-filled.                                        |
| `src/types/fitCheck.ts`                           | `FitCheckSchema`/`FitCheckJSON` — Fit Check's shape: `fit_level`, blunt `verdict`, `knockout_risks[]`, `gaps[]` (`requirement`/`severity`/`gap_type: "missing" \| "seniority" \| "domain"`/`evidence_in_resume`/`solution` — **no `resume_fix`/edit-op field**, deliberately: a fit judgment isn't a document edit), `.min(1)` `strengths[]`. Also replaces half of the deleted `src/types/gapAnalysis.ts`. `v: z.literal(2)`, same non-tolerant-parsing convention as above.                                    |
| `src/lib/llm/prompts/templates/deep-analysis.ts`  | `analyze_document` template ("what do I change in the document?") — merges the old ATS-analysis and proofread purposes into one findings pass; lite/full mode varies the prompt body, not the output schema. Self-registers with `templateRegistry`; imported by `src/lib/llm/prompts/index.ts`'s barrel. Replaces the deleted `ats.ts`/`proofread.ts`/`gap-analysis.ts` templates (the ATS half).                                |
| `src/lib/llm/prompts/templates/fit-check.ts`      | `analyze_fit` template ("should I apply, and what's blocking me?") — hard knockout gates, missing experience, seniority, domain mismatch; never wording or keyword matching. Self-registers with `templateRegistry`; imported by the same barrel. Replaces the gap-analysis half of the deleted templates above.                                                    |

## The exported `.plugin` bundle and its versioning

`export_cowork_plugin` (`src-tauri/src/mcp_server.rs`, invoked from `src/lib/mcpServer.ts`'s
`exportCoworkPlugin()`) zips `.claude-plugin/plugin.json` + `.mcp.json` + `skills/resume-mcp/SKILL.md` into a
single `.plugin` file a plugin-aware host (Claude Code, Cowork, ...) can install from directly. Two things worth
knowing before touching any of this:

- **The bundle is versioned automatically off the app's own version** (`app.package_info().version`, kept in
  sync across `package.json`/`tauri.conf.json`/`Cargo.toml` by the `git-release` skill) — `plugin.json`'s
  `"version"` field is set from it dynamically, and `exportCoworkPlugin()`'s save-dialog `defaultPath` reads
  the same version via `@tauri-apps/api/app`'s `getVersion()` to name the download `udaan-<version>.plugin`.
  There is no separate skill-bundle version number to maintain by hand — don't invent one, and don't revert the
  filename to a bare `udaan.plugin` for cosmetic reasons; the version in the filename is what lets a user with
  several old downloads in `~/Downloads` tell which is current without opening any of them.
- **`plugin.json`'s hardcoded `"description"` field** (in `mcp_server.rs`, next to the `"version"` line) is a
  second, independent summary of this app's MCP capability that can silently drift from `SKILL.md` — the actual
  wire-facing runbook. Whenever `src/mcp/**` changes shape (a purpose, a flow, a tool's argument schema), update
  `skills/resume-mcp/SKILL.md` in the same change (this file, `chat-mcp.md`, is a map to it, not a substitute),
  and check whether `plugin.json`'s description still names the right capabilities too.

## Docs referencing this surface

| File                                                     | Purpose                                                                                                        |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `docs/MCP.md`                                             | Setup/security docs for the MCP server — update when the tool surface or auth story changes.                     |
| `docs/MCP_ARCHITECTURE.md`                                | Diagrams: tool surface, request lifecycle, `add_job` draft state machine.                                         |
| `skills/resume-mcp/SKILL.md`                              | Tool-driving runbook for an external MCP host — update when a flow's step sequence changes, in the SAME change.  |
| `src/lib/mcpServer.ts` (`exportCoworkPlugin`)             | Frontend trigger for the plugin export — versions the downloaded filename off the app's own version.             |
| `src-tauri/src/mcp_server.rs` (`export_cowork_plugin`)    | Builds the `.plugin` zip — `plugin.json`'s `"version"`/`"description"`, `.mcp.json`, and the bundled `SKILL.md`. |

## Manual-trigger UI entry points (not chat/MCP internals, but reach the same purposes)

- `src/hooks/useDeepAnalysis.ts` / `src/hooks/useFitCheck.ts` — `useMutation` wrappers around
  `LLMService.analyzeDocument`/`LLMService.analyzeFit` respectively (replace the deleted
  `src/hooks/useGapAnalysis.ts`). The toolbar/drawer entry points into the same `analyze_document`/`analyze_fit`
  purposes the chat intents and MCP flows use.
- `src/components/job-v2/DeepAnalysisDrawer.tsx` — toolbar-triggered drawer wrapping
  `src/components/job/DeepAnalysisPanel.tsx`, reachable from `FloatingActionBar`. Renders `DocumentAnalysisJSON`
  (findings grouped by kind, plus a deterministic offline check view). Replaces the deleted `ATSDrawer.tsx`/
  `ProofreadDrawer.tsx` — Deep Analysis absorbed both.
- `src/components/job-v2/FitCheckDrawer.tsx` — toolbar-triggered drawer (replaces the deleted `GapDrawer.tsx`)
  reachable from `FloatingActionBar`'s overflow menu. Renders `FitCheckJSON` (fit level, blunt verdict, knockout
  risks, gaps grouped by severity, strengths pinned last) — no apply path, since `Gap` carries no `resume_fix`.
  Accepts an `externalResult` prop so the chat-driven `fit_check` intent can hand it an already-fetched analysis
  instead of re-running the mutation.
- `src/components/job-v2/InlineJobPageLayout.tsx` — owns `activeDrawer` (the mutually-exclusive canvas drawers,
  `FitCheckDrawer`/`DeepAnalysisDrawer` among them) and wires `onOpenFitCheckDrawer={() => setActiveDrawer("fitCheck")}`
  into `ChatContextProvider` (`src/components/chat/ChatContext.tsx`), which stashes the chat's `fit_check` result
  so `FitCheckDrawer`'s `externalResult` can read it without re-running the mutation. Note: the chat `fit_check`
  tool-result card deliberately does NOT auto-open the drawer — `ChatContext.tsx`'s side-effect switch only
  stashes the analysis; `src/components/chat/ChatToolResult.tsx`'s "Open fit check" button is what calls
  `onOpenFitCheckDrawer`, on click.
- `src/components/job-v2/FloatingActionBar.tsx` — toolbar splits into inline high-value actions (PDF, Undo/Redo,
  Customize, Deep Analysis, Humanize, Chat) and an overflow `⋯` menu (Sections, History, Fit Check). `DrawerName`
  (exported from this file, six mutually-exclusive canvas-overlay drawers) is the single source of truth for
  which drawer a caller can open.

## Known intentional asymmetry

- `bookmark` (MCP `FLOW_CATALOG` entry) has no distinct chat `IntentLabel` — in-app bookmarking is a page
  (`/bookmarks`), not a chat capability; MCP's `submit`'s `input.bookmark: true` flag is the equivalent for an
  external host. Not drift.
- `get_profile`/`preview_profile_edit`/`apply_profile_edit` (MCP tools, `src/mcp/server.ts`) have no chat
  `IntentLabel` and no `FLOW_CATALOG` entry — the in-app chat already has its own base-Profile editing UI (the
  Profile page), so there's no reason to add a duplicate chat intent for it; and unlike every other MCP
  capability these three need no `PromptPurpose`/prompt template (the external host reasons about the fetched
  profile directly), so they don't fit `FLOW_CATALOG`'s purpose-sequence shape either. Deliberately MCP-only and
  deliberately outside `FLOW_CATALOG` — not drift. `src/actions/profile.ts` (`getAllProfiles`, `getProfileById`,
  `updateProfile`) is the server-only Profile CRUD these tools call through `McpDeps`, same DI pattern as every
  other MCP write.
