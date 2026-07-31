---
name: resume-mcp
description: Drive this app's resume-building flows (tailoring, cover letters, ATS analysis, editing, proofreading, humanizing) through its local MCP server instead of hand-writing resume content. Use whenever the user pastes a job posting or URL and wants a tailored resume, or asks to edit, proofread, humanize, or fix ATS issues on a resume that already exists in the app. Requires the app's MCP server to be running and connected (see docs/MCP.md) — if tools like `list_flows` aren't available, tell the user to enable the MCP toggle in Settings first.
---

# Resume MCP

This app (a local-first resume/cover-letter builder) exposes its own prompts,
validation, and persistence as MCP tools, so you do the reasoning while the
server stays authoritative on prompt content and write safety. Your job is
to **drive the tool chain**, not to freelance resume content outside it.

## Core rule: never shortcut the chain

Every flow is a fixed sequence of purposes. The server tells you what comes
next via the `next` field on `submit`'s response — that is the _only_ source
of truth for what to call next. Do not:

- Hand-write a tailored resume, cover letter, or ATS analysis yourself and
  `submit` it without first calling `get_prompt` for that purpose and
  following its `systemPrompt`/`userPrompt` exactly.
- Skip a step in a flow (e.g. jump straight to `generate_tailored_resume`
  without `analyze_ats` first) even if you think you already have enough
  information.
- Reorder steps, or stop before `next` is absent from a response.

The app's own in-app chat runs these exact same steps under the hood — the
whole point of this skill is to reproduce that discipline, not to improvise
a shortcut.

## Tool reference

| Tool                                      | Input                                                                                                            | What it does                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_flows()`                            | —                                                                                                                | Returns the flow catalog: every flow's ordered steps and purposes. Call this first in a new session — it is self-documenting, so treat its output as authoritative over this doc if they ever disagree.                                                                                                              |
| `get_prompt({ purpose, jobId?, input? })` | `purpose` (string), optional `jobId`, optional `input` (non-DB fields like `jobDescription`, `url`, `userInput`) | Hydrates the prompt from the app's database (base profile, job details, resume, ATS results, cover letter) and returns `{ systemPrompt, userPrompt, outputSchema, next }`. Follow `systemPrompt`/`userPrompt` as given — they encode this app's anti-hallucination and prompt-injection guards, do not rewrite them. |
| `submit({ purpose, jobId?, result })`     | `purpose`, optional `jobId`, `result` (JSON matching that purpose's `outputSchema`), optional `input` (carry-forward fields, see `add_job` below) | Validates `result`, applies purpose-specific safety guards (e.g. rejects a gutted resume, re-stamps proofread issue sources), and returns `{ ok, jobId, next? }`. When `jobId` is given, persists immediately. In `add_job`, before a job exists, there is no `jobId` yet — those steps validate/guard only and return `jobId: null`; you must carry the result forward via `input` to later calls, and the job is only actually created at the flow's last step. `next` names the purpose to call `get_prompt` for next, if any. |
| `apply_resume_ops({ jobId, ops })`        | `jobId`, `ops` (array of deterministic edit operations, e.g. JSON-Pointer-addressed field edits)                 | The editor primitive used for surgical edits (field edits, applying proofread/ATS fixes). Never throws — returns `{ applied, rejected }` so you can see exactly which ops landed and retry only the failed ones.                                                                                                     |
| `validate({ purpose, result })`           | `purpose`, `result`                                                                                              | Dry-run of `submit`'s validation with no persistence. Use this to self-check a result's shape before committing, especially if you're unsure it matches `outputSchema`.                                                                                                                                              |
| `list_profiles()`                         | —                                                                                                                | Lists base profiles (`profileId` + `label`). Call before `add_job`'s final `generate_cover_letter` submit whenever more than one profile exists — see the note in `add_job` below.                                                                                                                                    |
| `list_jobs()`                             | —                                                                                                                | Lists jobs already tracked in the app.                                                                                                                                                                                                                                                                               |
| `get_job_state({ jobId })`                | `jobId`                                                                                                          | Returns job details, resume path-lines (`resumePathLines`, the addressable field paths for `apply_resume_ops`), ATS scores, and whether a cover letter exists. Call this before an edit/proofread/ats_fix/humanize flow if you don't already know the job's current state.                                           |

## Flow runbook

For every flow below, the pattern is the same:

1. Call `get_prompt` with the purpose named.
2. Follow the returned `systemPrompt`/`userPrompt` exactly — do not add,
   remove, or reinterpret instructions.
3. Produce JSON that matches the returned `outputSchema` exactly. If
   uncertain, call `validate({ purpose, result })` first and fix any errors
   it reports before calling `submit`.
4. Call `submit({ purpose, jobId, result })`.
5. If the response includes `next`, repeat from step 1 with that purpose.
   If `next` is absent, the flow is complete.

### add_job — paste a job posting, get a tailored resume + cover letter

Trigger: the user pastes a job posting (text or URL) and wants a resume
tailored to it.

`parse_job` → `analyze_ats` → `generate_tailored_resume` → `generate_cover_letter`

**No job exists yet at the start of this flow, so there is no `jobId` to pass
until the very last step.** The server has nothing in the database to hydrate
`get_prompt` from during these steps — instead, YOU must carry each prior
step's result forward yourself, as `input` fields on every subsequent
`get_prompt` and `submit` call:

- `parse_job`: pass the pasted description or URL via `get_prompt`'s `input`
  (`jobDescription` or `url`). No `jobId`. Produces structured job
  requirements — keep this JSON, call it `jobDetails`.
- `analyze_ats`: call `get_prompt`/`submit` with `input.jobDetails` set to
  the `jobDetails` from the previous step (still no `jobId`). At this step in
  `add_job`, this scores the user's **base profile** against the parsed job
  (not yet the tailored resume) — this mirrors the in-app "new job" flow
  exactly, do not skip it thinking it's redundant with a later ATS check.
  Keep this result, call it `atsAnalysis`.
- `generate_tailored_resume`: call `get_prompt`/`submit` with
  `input.jobDetails` and `input.atsAnalysis` set to the two values above
  (still no `jobId`). Produces the tailored resume JSON. **Use the value in
  `submit`'s response `result` field, not your own submitted draft** — the
  server's guard may adjust it (e.g. carrying over `sectionLayout` from the
  base profile). Keep that as `tailoredResume`.
- `generate_cover_letter`: call `get_prompt` with `input.jobDetails` and
  `input.tailoredResume` set to the values above (still no `jobId`) so the
  prompt has real job/resume context. Produce the cover letter text, then
  call `submit` with `result` set to that text AND `input.jobDetails` +
  `input.tailoredResume` still set (plus `input.atsAnalysis`/`input.url` if
  you have them) — **this call is what actually creates the job**, and it
  fails if `input.jobDetails` or `input.tailoredResume` is missing. Its
  response's `jobId` is the new job's id; `next` should be absent.

  **If more than one profile exists, also set `input.profileId`.** The
  app's dashboard only shows jobs whose `profileId` matches the
  currently-selected profile there — a job created without one is invisible
  in the UI even though it's really in the database. When exactly one
  profile exists the server picks it automatically; when there's more than
  one, `submit` rejects with an error telling you to call `list_profiles()`
  first and pick the right `profileId` (ask the user if it's not obvious
  which one this job belongs to).

If a step's `submit` response comes back with `jobId: null`, that is
expected for every step except the last — it means "validated, not yet
persisted, carry the result forward." Only the final `generate_cover_letter`
submit returns a real `jobId`.

For every OTHER flow below (edit, proofread, ats_fix, humanize, cover_letter),
the job already exists — pass its `jobId` on every call instead, and the
server hydrates prompts from the database automatically; you do not need to
carry results forward via `input`.

### edit — targeted field edits to an existing resume

Trigger: the user asks to change specific content on a resume already in
the app ("update my third bullet under X", "change my title to Y").

`get_prompt({ purpose: "extract_fields_to_edit" })` → `apply_resume_ops`

- Call `get_job_state` first if you don't already know the resume's current
  field paths (`resumePathLines`).
- `extract_fields_to_edit` turns the user's request into a set of ops
  addressed by those field paths.
- Call `apply_resume_ops({ jobId, ops })` with the result. Check the
  response's `rejected` array — see "Handling rejections" below.

### proofread — grammar/consistency/unquantified-claim review

Trigger: the user asks to proofread or review their resume.

`proofread_resume` → `submit` → `apply_resume_ops`

- `submit` here both persists and returns the combined issue list: the
  app's deterministic lint fixes are auto-applied server-side, and any
  LLM-judged issues are returned for review — do not assume every issue
  returned was auto-applied.
- Turn the reviewed/approved LLM-judged issues into ops and apply them via
  `apply_resume_ops`, the same as the edit flow.

### ats_fix — fix all flagged ATS issues at once

Trigger: the user asks to fix ATS issues (keyword gaps, knockout risks,
title-alignment problems) flagged on a resume.

`analyze_ats` → `fix_ats_issues` → `apply_resume_ops`

- Run `analyze_ats` fresh against the current tailored resume (not the base
  profile — that variant is only for `add_job`'s step 2).
- `fix_ats_issues` proposes fixes; apply them via `apply_resume_ops`.

### humanize — rewrite content to read less like AI output

Trigger: the user asks to make the resume or cover letter sound more human.

`humanize_content` → `submit`

- This rewrites the cover letter (per the plan's scope for this purpose).
  `submit` persists the rewrite directly; there is no separate
  `apply_resume_ops` step for this flow.

### cover_letter — regenerate the cover letter alone

Trigger: the user asks to regenerate or restyle just the cover letter
(without re-tailoring the resume).

`generate_cover_letter` → `submit`

## Handling rejections and uncertainty

- **`apply_resume_ops` rejections**: if the response's `rejected` array is
  non-empty, retry those specific ops once (e.g. fix a malformed JSON
  Pointer path, re-derive it from a fresh `get_job_state` call) before
  giving up. Do not silently drop a rejected op without telling the user
  what didn't apply and why.
- **Uncertain output shape**: call `validate({ purpose, result })` before
  `submit` whenever you're not fully confident the JSON matches
  `outputSchema` — it's a free, non-destructive check.
- **A purpose the model doesn't recognize**: if `get_prompt` or `submit`
  errors on a purpose name, re-check `list_flows()` rather than guessing at
  a purpose name — do not invent one.

## Non-goals

- Base-profile builder purposes (summary/experience/skills/projects/education
  generation) are not exposed here — this skill only covers job-scoped flows
  (`add_job`, `edit`, `proofread`, `ats_fix`, `humanize`, `cover_letter`).
- This skill never calls an LLM API itself outside of your own reasoning —
  the MCP server never calls an LLM and never touches API keys. All content
  generation is you, the connected model, working from the server's prompts.
