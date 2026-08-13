# LLM runtime — providers, keys, prompts, token tracking

Read this for: provider/model wiring, API-key storage, prompt registry, token accounting.

**For the chat assistant and MCP server specifically, read [chat-mcp.md](chat-mcp.md) instead** — it indexes
`src/lib/llm/chat-bot/` + `src/mcp/` and their shared machinery. This file covers the layer underneath and
deliberately does not restate it.

## The hard rule

**LLM calls only ever run client-side** (`src/lib/llm/`, incl. `clientLLM.ts`) so API keys never leave the
client / Tauri secure storage. A server-side LLM call is a design violation. `src/mcp/*` never calls an LLM
either — it serves prompts and validates responses that an external host's model produced.

## Submodule packages

Two workspace-local packages, consumed via `file:` deps and **built by `predev`/`prebuild`** before
`next dev`/`next build` run. If you see stale types from either, re-run the build.

| Package                      | Path                    | Contains                                                                                                                   |
| ---------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `@pranavraut033/llm-core`    | `packages/llm-core/`    | Provider base classes (`LLMProvider`, `OpenAICompatibleProvider`), prompt resolver/validation, `ProviderFactory` registry. |
| `@pranavraut033/ats-checker` | `packages/ats-checker/` | ATS scoring/parsing logic.                                                                                                 |

## Providers (`src/lib/llm/providers/`)

App-local providers extend the `llm-core` base classes and **self-register via `ProviderFactory`** — never
instantiate a provider class directly, always go through the factory.

- `factory.ts` — registration + resolution.
- `index.ts` — barrel; importing it is what triggers registration side effects.
- `managedProvider.ts` — `ManagedProvider`, an OpenAI-compatible provider pointed at the self-hosted LiteLLM
  gateway in `server/llm-gateway/`, for users without their own key (paid, prepaid credits). Same client-only
  call path as BYOK; the gateway only proxies upstream.

Known provider ids: `openai`, `anthropic`, `gemini`, `grok`, `perplexity`, `ollama`, `groq`, `mistral`,
`deepseek`, `openrouter`, `managed`. Display metadata lives in `src/lib/llm/providerMetaInfo.ts`.

## API key storage (`src/lib/keyStorage.ts`)

Exports: `setApiKey`, `getApiKey`, `deleteApiKey`, `listApiKeys`, `isTauriContext`, `setKeychainConsentHandler`.

- **Desktop**: AES-256-GCM encrypted file, key derived from a per-install master key held in the OS keychain
  (`src-tauri/src/keychain.rs`, `keyring` crate). `setKeychainConsentHandler` lets the UI prompt before the
  first keychain touch.
- **Web**: `localStorage`.

Never store a key anywhere else, never put one in SQLite, and never include one in a backup export.

## Operation layer

| File                            | Purpose                                                                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/llm/domainOps.ts`      | Free functions per resume-domain operation: parsing, tailoring, ATS analysis (incl. knockout-risk and title-alignment), humanizer, proofreading, gap analysis. Provider-agnostic.                       |
| `src/lib/llm/llmService.ts`     | High-level entry points built on `domainOps`: `parseJobDescription()`, `generateResume()`, `generateCoverLetter()`, ATS analysis, `humanizeContent()`, resume proofreading.                             |
| `src/lib/llm/clientLLM.ts`      | Client-side call plumbing.                                                                                                                                                                              |
| `src/lib/llm/atsLLMClient.ts`   | ATS-specific client wrapper.                                                                                                                                                                            |
| `src/lib/llm/verifiedResume.ts` | Post-generation verification pass (`verifiedResume.test.ts`).                                                                                                                                           |
| `src/lib/llm/ResumeHistory.ts`  | In-memory resume undo/redo history backing the chat `undo` intent.                                                                                                                                      |
| `src/lib/llm/tokenTracker.ts`   | Records usage per call, persisted through the `tokenUsage` server action. Understands cache-read/cache-creation and reasoning tokens per provider (see `TokenUsage` in [data-layer.md](data-layer.md)). |

## Prompts (`src/lib/llm/prompts/`)

- `registry.ts` — the `templateRegistry` singleton mapping `PromptPurpose` → template. Templates
  **self-register on import**, so a missing prompt is usually a missing import, not a missing file.
- `types.ts` — `PromptContext`, `PromptPurpose`, `PromptTemplate`.
- `templates/` — one module per purpose (`ats.ts`, `cover-letter.ts`, `gap-analysis.ts`, `education.ts`,
  `field-experience.ts`, `field-projects.ts`, `field-skills.ts`, `field-summary.ts`, …) with
  `__snapshots__/` locking rendered prompt text.
- `sanitize.ts` + `injection.test.ts` — **untrusted/user-supplied data is wrapped in delimiters before
  interpolation to block prompt injection.** Any new template interpolating job-description or profile text
  must go through this; `injection.test.ts` is the guard.
- `regionGuidance.ts` — region-specific CV conventions (EU/German photo, DOB, nationality).
- `coverLetterStyles.ts` — selectable tone/style presets surfaced in the cover-letter action bar.
- `documentation.ts` — human-readable descriptions of purposes, used by MCP's `get_prompt`.

## Applying model output to a resume

`src/lib/resume/editor.ts`'s **`applyResumeOps()` is the single deterministic path-based resume mutator** —
shared by proofread, humanizer, chat edit, ATS fix, gap fix, the tailor pipeline, and MCP. It uses RFC-6902
JSON Patch (`fast-json-patch`): the model names a JSON Pointer path per op instead of echoing whole
text/arrays back. Each op is re-validated against `ResumeSchema`, and a bad op is rejected **without blocking
the rest of the batch**. Never write a second mutation path.

`src/lib/proofread/` — `lint.ts` (deterministic rule-based checks, auto-applied) and `applyFixes.ts`;
LLM-judged issues go to `ProofreadDrawer.tsx` for review. `src/lib/humanizer/` holds the humanizer helpers.

## Mock interview — current state

On `main` there is only `INTERVIEW_PROMPT` (`src/lib/llm/chat-bot/prompts/interviewPrompt.ts`), the chat
`interview` intent's prompt: interview-prep Q&A and STAR structuring, explicitly forbidden from editing the
resume. The fuller mock-interview feature (a `/practice` route, `interviewSession.ts`) lives on the
`feature/mock-interview` branch and **does not exist on `main`** — do not cite those paths here.

Its intended knowledge base is drafted outside this repo at
`/Users/pranavraut/Documents/Workspace/interview-kb/interview-playbook.md` and is not wired into any prompt
yet. Design decision on record: ground it via an on-demand retrieval tool, **not** by stuffing the playbook
into every turn's system prompt (small/local models this app supports have short effective context and poor
mid-context recall).
