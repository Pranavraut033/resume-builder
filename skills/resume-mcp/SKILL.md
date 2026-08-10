---
name: resume-mcp
description: Drive this app's resume-building flows (tailoring, cover letters, ATS analysis, gap analysis, editing, proofreading, humanizing) through its local MCP server instead of hand-writing resume content. Use whenever the user pastes a job posting or URL and wants a tailored resume, or asks to edit, proofread, humanize, fix ATS issues, or get an honest fit/gap assessment on a resume that already exists in the app. Requires the app's MCP server to be running and connected (see docs/MCP.md) — if tools like `list_flows` aren't available, tell the user to enable the MCP toggle in Settings first.
---

# Resume MCP

This app exposes its own prompts, validation, and persistence as MCP tools,
so you do the reasoning while the server stays authoritative on prompt
content and write safety. Drive the tool chain; don't freelance resume
content outside it. Each tool's own `description` (visible in your tool
list) documents its inputs and outputs — this doc only covers the loop and
per-flow ordering.

## Core rule: never shortcut the chain

Every flow is a fixed sequence of purposes. `submit`'s response is the only
source of truth for what comes next — its `next` field names the purpose,
and (when non-null) its `nextPrompt` field already contains that purpose's
resolved prompt, ready to reason over. Do not:

- Hand-write a tailored resume, cover letter, or ATS analysis yourself and
  `submit` it without first following a `get_prompt`/`nextPrompt`'s
  `systemPrompt`/`userPrompt` exactly.
- Skip a step (e.g. jump straight to `generate_tailored_resume` without
  `analyze_ats` first) even if you think you already have enough
  information.
- Reorder steps, or stop before `next`/`nextPrompt` is absent.

## The loop

1. Call `get_prompt({ purpose })` to start a flow (or use the `nextPrompt`
   already returned by the previous `submit`).
2. Follow `systemPrompt`/`userPrompt` exactly.
3. Produce JSON matching `outputSchema`.
4. Call `submit({ purpose, jobId?, draftId?, result })`. A failed `submit`
   reports the same validation errors a separate dry-run would — fix and
   retry rather than calling anything else first.
5. If the response has `next`, use its `nextPrompt` and repeat from step 2.
   If `next` is absent, the flow is done.

**Before a job exists** (mid-`add_job`, no `jobId` yet), `submit` mints a
`draftId` on first use and returns it — pass that same `draftId` on every
following `get_prompt`/`submit` call in the flow instead of re-sending
`jobDetails`/the ATS analysis/the tailored resume yourself; the server
carries them forward and only actually creates the job on the flow's last
step (`generate_cover_letter`). If more than one profile exists, that last
`submit` needs `input.profileId` — call `list_profiles()` first and ask the
user which one if it's not obvious.

**Once a job exists** (every other flow below), pass its `jobId` instead —
the server hydrates prompts from the database automatically.

## Flows

- **add_job** — paste a job posting, get a tailored resume + cover letter:
  `parse_job` → `analyze_ats` → `generate_tailored_resume` →
  `generate_cover_letter`. No `jobId` until the final `submit`, which
  returns the new one.
- **edit** — targeted field edits ("update my third bullet under X"): call
  `get_job_state` if you don't know the resume's field paths yet, then
  `get_prompt({ purpose: "extract_fields_to_edit" })` → `apply_resume_ops`.
- **proofread** — grammar/consistency review: `proofread_resume` →
  `submit` (persists lint fixes automatically and returns the combined
  issue list — not every returned issue was auto-applied) →
  `apply_resume_ops` for the reviewed LLM-judged issues.
- **ats_fix** — fix flagged ATS issues: `analyze_ats` (against the current
  tailored resume, not the base profile) → `fix_ats_issues` →
  `apply_resume_ops`.
- **humanize** — rewrite AI-sounding text: `get_prompt({ purpose: "humanize_content", input: { userInput } })` → `submit`. `userInput` must be the exact text to rewrite — a resume bullet, a whole cover letter, anything. The server has no DB fallback for it (unlike every other purpose) since it can't guess which content you mean; if you already have the text from earlier in the conversation (e.g. a cover letter you just generated), pass that. Omitting `input.userInput` is a hard error, not an empty-content no-op.
- **cover_letter** — regenerate just the cover letter: `generate_cover_letter`
  → `submit`.
- **gap_analysis** — honest, substantive fit assessment against the JD (not
  a keyword/format score like `ats_fix`): `analyze_resume_gaps` → `submit`
  (validate-only, nothing persisted) → `apply_resume_ops` for any gap that
  carries a `resume_fix` (never present for `missing`/`seniority` gaps —
  those need an offline action, not a text edit). Report the `verdict` and
  gaps to the user plainly; don't soften a blocking or major gap into
  something it isn't, and always relay the closing `strengths` too.
- **bookmark** — save a job posting URL for later, no resume/cover letter
  generated: a single `parse_job` step, persisted immediately. When the user
  hands you one or more URLs to save/bookmark, for each one: `fetch_url` →
  `get_prompt({ purpose: "parse_job" })` → reason → `submit({ purpose:
"parse_job", result, input: { url, bookmark: true, profileId? } })`. This
  submit does **not** return a `nextPrompt` — `next` is `null` on purpose,
  don't chain into `analyze_ats`. Call `list_profiles()` once up front if
  more than one profile exists and reuse that `profileId` for every URL
  rather than asking per URL. A URL that's already bookmarked comes back
  with `duplicate: true` and the existing `jobId` — not an error, just skip
  it. If one URL in a batch fails (bad fetch, parse error), report it and
  keep going with the rest rather than aborting the whole batch; summarize
  saved/duplicate/failed at the end.

## Handling rejections and uncertainty

- **`apply_resume_ops` rejections**: retry a rejected op once (e.g.
  re-derive its path from a fresh `get_job_state`) before giving up. Tell
  the user what didn't apply and why rather than dropping it silently.
- **Uncertain output shape**: `submit` and see what it reports — it
  validates before persisting, so a bad shape never gets written.
- **Unrecognized purpose**: re-check `list_flows()` rather than guessing a
  purpose name.

## Non-goals

- Base-profile builder purposes (summary/experience/skills/projects/education
  generation) aren't exposed here — only job-scoped flows.
- This skill never calls an LLM API itself outside your own reasoning — the
  server never calls an LLM and never touches API keys.
