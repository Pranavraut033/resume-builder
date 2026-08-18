---
name: resume-mcp
description: Drive this app's resume-building flows (tailoring, cover letters, Deep Analysis, Fit Check, term alignment, editing, humanizing) and base-profile editing through its local MCP server instead of hand-writing resume content. Use whenever the user pastes a job posting or URL and wants a tailored resume, asks to edit their resume, run Deep Analysis (typos, wording, keywords, title alignment), align resume wording to the job description, humanize AI-sounding text, or get an honest Fit Check assessment on a resume that already exists in the app, or asks to view/edit their base profile directly. Requires the app's MCP server to be running and connected (see docs/MCP.md) — if tools like `list_flows` aren't available, tell the user to enable the MCP toggle in Settings first.
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

- Hand-write a tailored resume, cover letter, or Deep Analysis result
  yourself and `submit` it without first following a `get_prompt`/
  `nextPrompt`'s `systemPrompt`/`userPrompt` exactly.
- Skip a step (e.g. jump straight to `generate_tailored_resume` without
  `analyze_document` first) even if you think you already have enough
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
   If `next` is absent, the flow is done (later steps in that flow, if any,
   are direct tool calls — `apply_resume_ops`/`align_resume_terms` — not
   another `get_prompt`/`submit` purpose).

**Before a job exists** (mid-`add_job`, no `jobId` yet), `submit` mints a
`draftId` on first use and returns it — pass that same `draftId` on every
following `get_prompt`/`submit` call in the flow instead of re-sending
`jobDetails`/the Deep Analysis result/the tailored resume yourself; the
server carries them forward and only actually creates the job on the flow's
last step (`generate_cover_letter`). If more than one profile exists, that
last `submit` needs `input.profileId` — call `list_profiles()` first and ask
the user which one if it's not obvious.

**Once a job exists** (every other flow below), pass its `jobId` instead —
the server hydrates prompts from the database automatically.

## Flows

**Which flow does a URL/job posting message trigger?** Default to **add_job**
(the full tailored resume + cover letter chain) whenever the user hands you a
job posting or URL — including phrasing like "add this job", "add job",
"apply to this", or a bare URL with no verb. Only use **bookmark** (save-only,
no generation) when the user's own words say so explicitly: "bookmark",
"remember this/these", "save for later", or similar — not merely because the
message contains the word "add" or "job". If in doubt, ask.

- **add_job** — paste a job posting, get a tailored resume + cover letter:
  `parse_job` → `analyze_document` (Deep Analysis run against the base
  profile, before a resume is tailored) → `generate_tailored_resume` →
  `generate_cover_letter`. No `jobId` until the final `submit`, which
  returns the new one.
- **edit** — targeted field edits ("update my third bullet under X"): call
  `get_job_state` if you don't know the resume's field paths yet, then
  `get_prompt({ purpose: "extract_fields_to_edit" })` → `apply_resume_ops`.
- **document_fix** — run Deep Analysis against an existing job's already
  tailored resume, then turn findings into edits: `analyze_document`
  (correctness, impact, keyword, duplication, provenance, and title
  findings — this server's own deterministic lint findings are merged in
  automatically) → `submit` (never touches the resume's own content — it
  re-stamps every submitted finding to `source: "llm"`, merges in this
  server's deterministic lint findings, persists the merged result, and
  returns it inline as `result`). From there, turn the findings you want
  fixed into ops yourself: form-only alignment
  swaps (acronym ↔ expansion, an alias the JD uses — e.g. "CPA" →
  "Certified Public Accountant (CPA)") go through the `align_resume_terms`
  tool directly — no `get_prompt`/`submit` round trip, it's a standalone
  tool call taking the findings you already have as its arguments and
  applying them itself (see the tool's own `description` for the exact
  additive-only rule it enforces — a genuine rewrite or new claim is
  rejected, not just the swap that triggered it). Everything else (a real
  rewrite, a new bullet, a non-string field) goes through
  `apply_resume_ops` instead. There is no standalone **proofread** flow any
  more — Deep Analysis absorbed it; grammar/typo/consistency findings show
  up in the same `findings[]` array as keyword/title findings, distinguished
  by `kind`.
- **humanize** — rewrite AI-sounding text: `get_prompt({ purpose: "humanize_content", input: { userInput } })` → `submit`. `userInput` must be the exact text to rewrite — a resume bullet, a whole cover letter, anything. The server has no DB fallback for it (unlike every other purpose) since it can't guess which content you mean; if you already have the text from earlier in the conversation (e.g. a cover letter you just generated), pass that. Omitting `input.userInput` is a hard error, not an empty-content no-op.
- **cover_letter** — regenerate just the cover letter: `generate_cover_letter`
  → `submit`.
- **fit_check** — honest, substantive fit assessment against the JD (not a
  keyword/wording review like `document_fix`): `analyze_fit` → `submit`
  (validate-only, nothing persisted server-side). Fit Check has **no apply
  step at all** — every gap is reported, none is auto-appliable: its `Gap`
  schema carries no `resume_fix`/edit-op field (that's the point — a fit
  judgment like "you're two years short of the seniority bar" or "this role
  requires a domain you haven't worked in" isn't a document edit). Report
  the `verdict`, `knockout_risks`, and `gaps` to the user plainly; don't
  soften a `blocking` or `major` gap into something it isn't, and always
  relay the closing `strengths` too — the analysis always ends with at
  least one genuinely evidence-based strength.
- **bookmark** — save a job posting URL for later, no resume/cover letter
  generated: a single `parse_job` step, persisted immediately. When the user
  hands you one or more URLs to save/bookmark, for each one: `fetch_url` →
  `get_prompt({ purpose: "parse_job" })` → reason → `submit({ purpose:
"parse_job", result, input: { url, bookmark: true, profileId? } })`. This
  submit does **not** return a `nextPrompt` — `next` is `null` on purpose,
  don't chain into `analyze_document`. Call `list_profiles()` once up front
  if more than one profile exists and reuse that `profileId` for every URL
  rather than asking per URL. A URL that's already bookmarked comes back
  with `duplicate: true` and the existing `jobId` — not an error, just skip
  it. If one URL in a batch fails (bad fetch, parse error), report it and
  keep going with the rest rather than aborting the whole batch; summarize
  saved/duplicate/failed at the end.

## Base-profile editing (not a `get_prompt`/`submit` flow)

`get_profile` / `preview_profile_edit` / `apply_profile_edit` let you fetch
and edit the user's base profile directly — not part of `list_flows`'s
catalog, since there's no LLM prompt to resolve for it (you already have
the full profile content). Never skip straight to `apply_profile_edit`:

1. `get_profile({ profileId? })` — full profile content plus `pathLines`
   (same JSON-Pointer format `apply_resume_ops` uses) so you can construct
   ops without guessing field paths. Omit `profileId` to get the first/only
   profile; call `list_profiles()` first if you need to disambiguate.
2. Reason about the user's requested edit and build RFC-6902 ops
   (`replace`/`add`/`remove`) against those paths.
3. `preview_profile_edit({ profileId, ops })` — dry-run, writes nothing,
   returns `applied`/`rejected` plus the before/after profile. Show the user
   the diff.
4. Before calling `apply_profile_edit`, tell the user to back up their data
   first via this app's Settings page → "Backup & Restore" (full-database
   JSON export) — a profile edit through this tool has no undo. Get their
   go-ahead.
5. `apply_profile_edit({ profileId, ops, confirm: true })` — only this call,
   with `confirm: true` on the same call, actually persists. Omitting
   `confirm` (or passing `false`) returns an error and writes nothing, even
   if the ops themselves are valid.

## Handling rejections and uncertainty

- **`apply_resume_ops` rejections**: retry a rejected op once (e.g.
  re-derive its path from a fresh `get_job_state`) before giving up. Tell
  the user what didn't apply and why rather than dropping it silently.
- **`align_resume_terms` rejections**: this tool rejects the **whole call**
  — nothing applied — if even one op in the batch isn't a strictly additive
  term swap (see the tool's own `description`). Split out the offending op
  and either drop it or route it through `apply_resume_ops` instead (for a
  genuine rewrite), then resubmit the rest.
- **Uncertain output shape**: `submit` and see what it reports — it
  validates before persisting, so a bad shape never gets written.
- **Unrecognized purpose**: re-check `list_flows()` rather than guessing a
  purpose name.

## Non-goals

- Base-profile builder purposes (summary/experience/skills/projects/education
  _generation_ — i.e. writing a profile from scratch) aren't exposed here,
  only job-scoped flows. Editing an _existing_ profile's fields is exposed,
  via `get_profile`/`preview_profile_edit`/`apply_profile_edit` above — that
  is not a generation purpose, just a targeted-ops write.
- This skill never calls an LLM API itself outside your own reasoning — the
  server never calls an LLM and never touches API keys.
