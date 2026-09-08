# Public Release Audit — 2026-08-19

Whole-repo review for going public as a solo indie developer: open-sourcing the repo and/or
shipping the Tauri desktop binary to strangers. Six parallel passes (security, data layer/LLM
runtime, rendering/export, app surface, Tauri packaging, MCP/repo hygiene) plus an OWASP-style
security-auditor pass. All findings below were verified by reading the actual code — nothing
here is speculative.

**Bottom line:** the app's core security posture is solid (no SQLi, XSS is properly sanitized,
prompt injection has a real chokepoint, API keys never touch the DB, the LLM-only-on-client
architecture rule holds everywhere). What's actually blocking a _public_ release is **code
signing** — right now every downloader gets an OS security warning — plus a handful of
support-burden and crash-risk issues that are cheap to fix.

---

## Critical — fix before shipping the binary

### 1. macOS builds are not notarized

`src-tauri/tauri.conf.json:56` uses `signingIdentity: "-"` (ad-hoc signing). Neither
`.github/workflows/release.yml` nor `build.yml` calls `xcrun notarytool`/`altool` or sets
`APPLE_ID`/`APPLE_PASSWORD`/`APPLE_TEAM_ID`. Every macOS downloader hits Gatekeeper's "app is
damaged / from an unidentified developer" — the release workflow's own install instructions
already tell users to right-click → Open to bypass it, i.e. the broken experience is treated as
expected rather than fixed.
**Fix:** get an Apple Developer ID cert, wire `tauri-action`'s notarization env vars into CI.

### 2. Windows signing is a throwaway self-signed cert, not real Authenticode

`release.yml:181-191` generates a fresh `New-SelfSignedCertificate` on every CI run. It produces
a signature but zero SmartScreen reputation — installers still get flagged (the release notes
already say "click More info → Run anyway"). No real Authenticode / Azure Trusted Signing / EV
cert path exists.
**Fix:** get a real code-signing certificate (or use Azure Trusted Signing, which is
cheaper/easier for indie devs than a traditional EV cert) and wire it into `signtool` in CI.

---

## High

### 3. npm high-severity advisories in shipped production dependencies

`npm audit --omit=dev` reports 8 high-severity advisories, notably `next@16.2.10` (Server
Actions DoS + Turbopack/single-locale middleware bypass) and `postcss` (XSS in CSS stringify /
arbitrary file read via `sourceMappingURL`). Next 16.3.x likely fixes the Next advisory. These
ship inside the bundled binary.
**Fix:** bump `next` to 16.3.x, run `npm audit fix` for the rest, re-check before every release.

### 4. API keys saved with zero validation

`src/app/settings/page.tsx:164-180` (`handleSaveKey`) persists a key with no format check or
connection test — `validateProviderConnection()` (`src/lib/llm/clientLLM.ts:81-102`) exists but
is only wired to a separate manual "Test" button, never called on save. A typo'd or revoked key
saves silently and only fails on the user's first real generation call, with whatever raw error
the provider SDK throws.
**Fix:** call `validateProviderConnection` (or a lightweight format check) inside `handleSaveKey`
before persisting, surface failures inline.

### 5. PDF export can crash entirely for non-Latin-script content

`src/lib/pdf/fonts.ts:49` fetches only the Latin-subset Google Font (`-latin-`); the fallback
chain in `src/lib/pdf/fonts.ts:6-15` (Helvetica/Times/Courier) is PDF Base-14 — also Latin-1
only. `src/lib/pdfExport.ts:103-117,174-183` catches the first `RangeError`/"not registered" and
retries with Helvetica, but Helvetica can't render Arabic/Hebrew/CJK/Cyrillic either, so the
retry throws the same error **uncaught**, killing the export. No RTL `direction` handling exists
anywhere in `src/lib/pdf/` or the render engine.
**Fix:** ship a Unicode-capable fallback font (e.g. Noto Sans) instead of Helvetica, add RTL
`direction` support. This affects any user whose name or AI-tailored content contains non-Latin
characters — not an edge case for a public, international audience.

### 6. No top-level error boundary anywhere in the app

`find src/app -iname "*error*"` returns nothing — no `error.tsx`, `global-error.tsx`, or
`not-found.tsx` in `src/app/`, and `layout.tsx` has no boundary either. Any unhandled render-time
throw crashes the whole React tree with no recovery UI — a first-time public user sees a blank
white screen instead of a friendly error.
**Fix:** add a root `src/app/error.tsx` (and ideally `global-error.tsx`) with a simple
"something went wrong, reload / report" fallback.

---

## Medium

### 7. Hardcoded legacy master password still shipped in source

`src/lib/keyStorage.ts:67` — `LEGACY_MASTER_PASSWORD = "resume-builder-master-key-change-in-production"`,
a publicly-committed string, is still used as a fallback decrypt path for pre-keychain
`keys.enc` files. New installs use a keychain-derived key and aren't affected, but once this repo
is public, anyone can read this password — if an old `keys.enc` is ever exfiltrated (stolen
laptop, backup leak, malware), it decrypts every provider API key in it.
**Fix:** keep the migration read path for upgraders but plan a hard cutoff after N versions so
the weak key isn't a permanent decrypt path once the source is public.

### 8. macOS app sandbox disabled

`src-tauri/entitlements.plist` — `com.apple.security.app-sandbox` is `false`, combined with
broad `files.user-selected.read-write`. Any future RCE-class bug (e.g. a dependency CVE reached
via the embedded browser webview) gets full user-level filesystem/process access instead of
being contained.
**Fix:** evaluate enabling the sandbox with narrower file-access entitlements; if impractical
given the bundled Next server, document the tradeoff in release notes.

### 9. Bundle identifier and branding look unfinished

`tauri.conf.json:5` sets `identifier: "com.resumebuilder.dev"` — the `.dev` suffix reads as
scaffolding never swapped for a release identifier (also baked into every user's `$APPDATA`
path). Separately, `productName` is `"Udaan"` but the release workflow text and
`shortDescription` still say "Resume Builder" — inconsistent branding for a public download.
**Fix:** pick the final product name and identifier once, apply consistently before the first
public release (identifier changes after release fragment update channels/user data paths).

### 10. `package.json` missing license/author/repository metadata

A proper MIT `LICENSE` file exists at repo root (copyright Pranav Raut, 2026), but
`package.json` doesn't declare `"license": "MIT"` or a `repository` URL — inconsistent with the
LICENSE file and visibly unfinished to anyone inspecting the manifest.
**Fix:** add `license`, `repository`, `author`, `homepage` fields to `package.json`.

### 11. Stray git worktree with internal planning docs on disk

`.claude/worktrees/quizzical-cannon-ad41b1/` contains a full duplicate source snapshot plus
internal plan files. Not currently tracked by git, but `.claude/` as a whole isn't gitignored
(only `.claude/plans/` is) — an accidental `git add -A` before going public would commit internal
planning docs and double the repo size.
**Fix:** add `.claude/worktrees/` to `.gitignore` explicitly; confirm nothing under `.claude/`
besides intended skill/agent config is tracked before flipping the repo public.

### 12. PDF fonts fetched live from a third-party CDN at export time

`src/lib/pdf/fonts.ts:22-59` fetches from `cdn.jsdelivr.net` at PDF-generation time in what's
otherwise a local-first app. Offline or CDN-down users silently get the wrong (fallback) font
with no warning.
**Fix:** bundle the default/most common fonts locally; toast when the fallback path is taken.

### 13. Icon-only buttons missing `aria-label`

`src/app/bookmarks/page.tsx` (external-link and delete icon buttons, ~lines 142/158) and
`FitCheckDrawer.tsx` (re-run buttons, ~lines 247/400) have icon-only content with no
`aria-label` — screen readers announce nothing. Pre-existing pattern, not a new regression, but
present in the recently-touched files.
**Fix:** add `aria-label` to icon-only interactive elements.

### 14. No friendly failure path when the local DB is missing/corrupted on first run

`src-tauri/src/lib.rs:250-266` — `seed_database_if_missing`/`sync_database_schema` `?`-propagate
into `.setup()`; failure just prints to stderr and exits (`lib.rs:319-322`) with no native error
dialog, even though `tauri-plugin-dialog` is already a dependency.
**Fix:** catch these errors in `setup()` and show a native dialog with a reset/reinstall path.

---

## Low

- **Custom Tauri commands have no capability/permission entries** (`get_or_create_master_key`,
  `browser_*`, `mcp_server_*` in `src-tauri/src/lib.rs:302-317`) — fine today since the only IPC
  caller is the app's own first-party frontend under a strict CSP, but a future XSS in the main
  window (not just the sandboxed browser webview) would reach these with no additional gate.
  Worth an explicit note for defense-in-depth; add ACL entries if Tauri later supports it for
  app-defined commands.
- **DNS-rebind TOCTOU window in the SSRF guard** — `src/actions/urlFetcher.ts:93-158` resolves
  DNS once to validate, then lets `fetch()` re-resolve for the real request. Low impact for a
  local single-user app with no cloud metadata endpoint to steal, but pin the resolved IP if this
  code is ever reused in a hosted/multi-user context.
- **Unsanitized `href` reaches the PDF `Link` component** — `src/lib/pdf/htmlToPdf.tsx:97-104`
  passes `getAttribute("href")` straight through with no scheme allowlist. Low impact (PDF
  viewers don't execute `javascript:` via `Link`), but allowlist `http(s):`/`mailto:` cheaply.
- **`migrate-app-db.mjs` is additive-only** (`scripts/migrate-app-db.mjs:1-10`) — no path today
  for a future column type/nullability change, rename, or drop; a landmine for the _next_ schema
  change, not a bug today. Keep hard rule 5 in mind — additive changes are covered, anything else
  needs a hand-written migration.
- **`FitCheck` Prisma model undocumented** in `.claude/knowledge/data-layer.md`'s model table
  despite being wired through `Job`/`Resume` and used throughout `src/actions/job.ts` — a
  knowledge-file staleness gap, not a runtime issue. Add a row before it misleads a future
  session that trusts the router pattern.
- **Chat-bot prompt-injection guard duplicates MCP's guard logic by hand** (`chat-mcp.md`
  documents `Chatbot.ts`'s `align_terms` handler as a hand-kept-in-sync mirror of
  `src/mcp/guards.ts`'s `guardAlignOps`, not a shared import) — a future fix to one side could
  silently miss the other. Worth a regression check before release, and eventually extracting a
  shared guard.
- **`FitCheckDrawer`'s seed effect** (`FitCheckDrawer.tsx:173-177`) intentionally excludes
  `ownResult` from its dependency array (eslint-disabled) to make "Re-run" work — correct today,
  but fragile: a future edit that re-adds `ownResult` would silently break Re-run. Worth a
  comment or a regression test.
- **CSP `connect-src` allows any HTTPS host** (`tauri.conf.json:31`) — presumably intentional
  since the app calls LLM provider APIs directly from the client, but means CSP provides no
  exfiltration containment if an XSS is ever found; only `script-src 'self'` is doing real work.

---

## Info / verified clean

- No SQL injection surface — no raw Prisma queries anywhere, all typed query builder.
- Hard rule "server = DB only, LLM = client only" holds across every file in `src/actions/`.
- Prompt injection: `sanitizeUntrustedText` sits at a single real chokepoint
  (`src/lib/llm/prompts/index.ts`) covering every untrusted field; no bypass found.
- XSS: only two `dangerouslySetInnerHTML` sinks, both safe (a static build-time constant, and
  `RichTextEditorContent.tsx` which routes through `DOMPurify.sanitize()`).
- API keys never touch SQLite; AES-256-GCM with a per-install OS-keychain-derived key; logger
  only records provider names, never key material.
- Tauri capabilities are properly scoped: `fs:*` limited to AppData, no `shell:execute`, no
  broad `http:` scope. Updater uses a genuine minisign-signed payload, independent of the
  code-signing gaps above.
- MCP server (`npm run mcp`) exposes only this app's own local SQLite-backed data via typed
  tools; `fetch_url` is SSRF-guarded against internal/private addresses; the in-app browser
  webview never gets IPC access to third-party sites by deliberate design.
- No secrets found anywhere in current files or full git history (a deleted historical `.env`
  contained only `DATABASE_URL`/`PORT`, no real secret). `.gitignore` correctly covers `.env*`,
  `dev.db*`, `keys.enc`, `.resume-builder/`, cert files.
- README.md is complete and self-contained, with no leaked personal paths or references to the
  private `udaan-marketing` sibling repo.
- No IDOR/auth surface applicable — single-user local-first app by design.

---

## Suggested order of operations

1. **Code signing (Critical #1, #2)** — this is the actual release blocker; everything else can
   ship without it looking broken, but unsigned binaries will tank first-run trust and conversion.
2. **Quick wins before next release**: bump `next` (#3), gate `handleSaveKey` on validation (#4),
   add a root `error.tsx` (#6), add `package.json` metadata (#10), gitignore the stray worktree
   (#11).
3. **Before claiming international/accessibility readiness**: fix the PDF font fallback (#5),
   add `aria-label`s (#13).
4. **Housekeeping, no rush**: sandbox entitlement review (#8), identifier/branding lock-in (#9),
   first-run DB failure dialog (#14), the Low-severity items as time allows.
