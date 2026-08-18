# MCP server

This app can expose its resume-building flows — job parsing, tailoring, Deep Analysis,
Fit Check, cover letter generation, editing, proofreading,
humanizing — as
[Model Context Protocol](https://modelcontextprotocol.io) tools, so you can
drive them from Claude Desktop (or any other MCP-capable host) instead of the
in-app chat. The server hands out this app's own prompts and validates/
persists whatever structured result the connected model sends back; the
_reasoning_ runs on your existing Claude/chat subscription, not a
provider API key configured in this app. That means no API key is needed for
this path, you can use a better model than you'd otherwise pay for per token,
and the app's prompt engineering and anti-hallucination guards stay
authoritative instead of being reimplemented in a chat window.

The server is purely additive — it never calls an LLM itself and never
touches API keys. It only reads/writes this app's local SQLite database and
returns prompts for whatever's connected to reason over. The in-app chat
(`Chatbot.ts`) is completely unaffected by whether this is enabled.

See `skills/resume-mcp/SKILL.md` for the step-by-step runbook a connected
model should follow once it's talking to this server, and
[`MCP_ARCHITECTURE.md`](./MCP_ARCHITECTURE.md) for how the server itself is
built (module map, request lifecycle, the `add_job` draft state machine,
guard/validation flow) — this doc covers setup and security, not internals.

The server exposes 12 tools: `list_flows`, `get_prompt`, `submit`,
`apply_resume_ops`, `align_resume_terms`, `list_profiles`, `list_jobs`,
`fetch_url`, `get_job_state`, `get_profile`, `preview_profile_edit`,
`apply_profile_edit`.
`fetch_url` fetches a job posting URL server-side and
returns its extracted text when a host's own fetch is blocked (e.g.
LinkedIn). There is no standalone `validate` tool — `submit` already runs
the same schema check
before persisting anything, so a failed `submit` doubles as the dry run.
Before a job exists yet (mid-`add_job`), `submit` mints a short-lived
`draftId` and returns it — pass that on subsequent calls instead of
re-uploading `jobDetails`/the Deep Analysis findings/the tailored resume
yourself, and `submit`'s response includes the next step's prompt inline as
`nextPrompt` so a full `add_job` run is 5 tool calls, not 8+.

To just save a job posting URL for later without generating a resume (the
`bookmark` flow — the MCP equivalent of pasting a URL into `/bookmarks`),
submit `parse_job`'s result with `input: { url, bookmark: true }`: it creates
a `BOOKMARKED` job immediately and stops (`next: null`), one LLM call per
URL. Re-submitting a URL that's already bookmarked returns the existing job
(`duplicate: true`) instead of creating a second one.

The `fit_check` flow (`analyze_fit`) is deliberately not a keyword/format
scorer — it reads an existing job's tailored resume against the JD the way
a hiring manager would: missing experience, seniority shortfalls, domain
mismatch, each with a concrete solution and a rated knockout risk (work
authorization, a license, a location), always closing with evidence-based
strengths. Nothing is persisted server-side, and a gap carries no follow-up
`resume_fix`/apply step of its own — a fixable version of the same issue
shows up in `document_fix`'s Deep Analysis findings instead, which do carry
one.

Base-profile editing (`get_profile` / `preview_profile_edit` /
`apply_profile_edit`) is MCP-only — the in-app chat already has its own
Profile page for this, so there's no equivalent chat intent. Fetch the
profile with `get_profile`, dry-run your proposed edit ops with
`preview_profile_edit` (writes nothing, returns a before/after diff), then
call `apply_profile_edit` with `confirm: true` to actually persist it —
without `confirm: true` on that same call, nothing is written. Before
confirming, the connected host should tell you to back up your data first
via this app's Settings page → "Backup & Restore" (full-database JSON
export) — a profile edit through this tool has no undo.

## Setup

### 1. Enable the server in this app

Open **Settings → the MCP toggle** and turn it on. The server is **off by
default** — nothing starts until you opt in. Once enabled, note the port
shown in Settings; you'll need it for the HTTP transport below (stdio doesn't
need a port).

### 2. Connect Claude Desktop or Claude Code (stdio, recommended)

Claude Desktop/Code launches the server itself as a subprocess and talks to
it over stdio — no port, no network exposure, and **no repo clone or
separate Node install needed**: the app bundles its own Node binary and the
built `stdio.js` entrypoint inside the install itself, at
`resources/next/{node-bin/node, mcp/stdio.js}`, and it must be launched with
that bundled `node`, not whatever `node` (if any) happens to be on the
user's `PATH` — the bundled binary is ABI-matched to the native
`better-sqlite3` module shipped alongside it, and a mismatched system Node
will fail with a `NODE_MODULE_VERSION` error.

A `DATABASE_URL` env var pointing at this install's real `app.db` is
**required** too — spawning `stdio.js` directly this way bypasses
`spawn_mcp_server` (`src-tauri/src/mcp_server.rs`), the only other place
that sets it, entirely. Without it, `src/mcp/db.ts` falls back to
`dotenv`/`./prisma/dev.db`, which doesn't exist for a real end user and
silently creates the wrong (empty) database. This bit twice in practice:
first as dotenv's own "injected env" banner corrupting the stdio JSON-RPC
stream on stdout (fixed by loading it with `{ quiet: true }`), then as the
process quietly pointing at the wrong file even once that was fixed.

The **Settings → MCP Server** panel and the in-app **Connect Claude Code**
page (linked from there) both resolve the node/stdio paths _and_ this
install's `DATABASE_URL` automatically — via the `mcp_server_stdio_command`
Tauri command (`src-tauri/src/mcp_server.rs`) — and render copy-paste-ready
`claude_desktop_config.json` / `claude mcp add` snippets with all three.
Prefer those over hand-writing the paths below.

For reference, the shape either surface produces:

```json
{
  "mcpServers": {
    "resume-builder": {
      "command": "<install>/resources/next/node-bin/node",
      "args": ["<install>/resources/next/mcp/stdio.js"],
      "env": { "DATABASE_URL": "file:<app-data-dir>/app.db" }
    }
  }
}
```

or, for `claude mcp add`:

```bash
claude mcp add resume-builder --scope user \
  --env DATABASE_URL=file:<app-data-dir>/app.db \
  -- <install>/resources/next/node-bin/node <install>/resources/next/mcp/stdio.js
```

Restart Claude Desktop after editing its config for it to pick up the new
server; Claude Code picks up `claude mcp add` registrations immediately.

Developing this repo itself (not using a built install) is the one case
where the bundled paths don't exist yet — fall back to
`claude mcp add resume-builder --scope local -- npm run mcp`, run from the
repo root, exactly as the in-app instructions do when they can't find a
bundled entrypoint.

### 2b. Connect a plugin-aware host (Cowork, Claude Code's plugin marketplace)

Hosts that install MCP servers from a downloaded plugin archive instead of a
hand-typed command can use the **"Download udaan.plugin"** button on the
same in-app **Connect Claude Code** page. It writes a single `udaan.plugin`
zip file — the Claude Code plugin layout inside
(`.claude-plugin/plugin.json`, `.mcp.json` with this install's node/stdio.js
paths and `DATABASE_URL`, and `skills/resume-mcp/SKILL.md`) — so the host can
install straight from that one file instead of the JSON/CLI snippets above.
Backed by the `export_cowork_plugin` Tauri command
(`src-tauri/src/mcp_server.rs`, using the `zip` crate with `Stored`/no
compression since the contents are tiny text files); same this-machine-only
caveat as the stdio paths elsewhere in this doc.

### 3. The HTTP alternative

For MCP hosts that connect over a URL instead of spawning a stdio process,
the server also serves Streamable HTTP on its own local port (the same one
shown in Settings). Point that host at:

```
http://127.0.0.1:<port>
```

Everything else — tools, flows, validation, persistence — is identical
between the two transports; they're two entrypoints over the same server
definition.

## Security posture

- **Localhost-only bind.** The HTTP transport binds `127.0.0.1` only — it is
  never reachable from another machine on your network.
- **Origin header validation.** The HTTP transport validates the `Origin`
  header on every request, so an arbitrary web page's JavaScript can't reach
  it via DNS-rebinding/CSRF even though it's on localhost. The stdio
  transport has no network exposure at all, so this doesn't apply to it.
- **No bearer token in v1.** Auth is localhost-bind + Origin validation only;
  there is no separate API key/token to leak or manage for this server. This
  may change if remote (non-localhost) access is ever supported — not
  planned today.
- **No LLM calls, ever.** This server never calls an LLM provider itself. It
  only returns prompts and validates/persists structured results that a
  connected model sends back.
- **No API keys touched.** This server has no code path that reads, writes,
  or transmits your BYOK provider keys (`src/lib/keyStorage.ts`) — those stay
  entirely within the existing client-only LLM path.

## Which database it talks to

The MCP server reads and writes the exact same database the running app
uses — there's no separate/synced copy:

- **Built desktop app**: `$APPDATA/app.db` (same file `spawn_bundled_next_server`
  uses — see `CLAUDE.md`'s "Debugging the built (installed) desktop app").
- **Local dev** (`npm run dev` + `npm run mcp`): the `dev.db` pointed at by
  `.env`'s `DATABASE_URL`.

Because it's the same file the app's own Next server writes to, changes made
via MCP (a new job, an edited resume) show up immediately in the app UI, and
vice versa.

## Troubleshooting

If Claude Desktop (or another host) can't connect:

- **Server toggle off.** Check Settings — the server does not auto-start;
  confirm the toggle is on and the app is running.
- **Wrong path in config.** Double-check `claude_desktop_config.json`'s
  `args` path actually points at the built `stdio.js` on disk for your OS —
  a stale or relative path is the most common stdio failure. Re-run
  `npm run build:mcp` if the file is missing.
- **Port in use (HTTP transport only).** If another process already holds
  the configured port, the HTTP transport won't bind. Check Settings for the
  port in use, or restart the app to release it.
- **Claude Desktop needs a restart.** Config changes to
  `claude_desktop_config.json` only take effect after fully restarting
  Claude Desktop, not just reopening a window.
- **Still stuck?** For the built desktop app, check `$APPDATA/logs/mcp.log`
  for the server's own stdout/stderr, alongside `client.log`/`server.log` as
  described in `CLAUDE.md`'s desktop debugging section.
