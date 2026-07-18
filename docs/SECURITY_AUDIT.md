# Security Audit — resume-builder (Udaan)

Date: 2026-07-17
Scope: full repo (`src/`, `src-tauri/`, `server/llm-gateway/`, `packages/`, CI workflows, git history).
Read-only pass. No fixes applied. Findings below carry hints for the next agent instead of prescribed fixes — verify current state before acting, don't act on the memory of this report alone.

## Threat model

This is a **local-first desktop app** (Tauri wrapping a Next.js server bound to `127.0.0.1`, single local user, no auth layer by design — see `CLAUDE.md`'s "Server = database only, LLM = client only" rule). Untrusted inputs: pasted job descriptions/URLs, third-party job-site content scraped through an in-app embedded browser (`src-tauri/src/browser.rs`), and LLM responses. Secrets in scope: BYOK LLM API keys (meant to live in Tauri's encrypted store or dev-mode `localStorage`), and a *separate* multi-tenant paid gateway (`server/llm-gateway/`, Stripe + LiteLLM) that has a different, internet-facing threat model from the desktop app itself — audited separately below, not folded into the "it's just local" assumption.

---

## Findings (severity order)

### [Critical] Hardcoded master password defeats API-key-at-rest encryption
- **Where**: `src/lib/keyStorage.ts:27`
- **What**: `MASTER_PASSWORD = "resume-builder-master-key-change-in-production"` is a static string shipped in every build, used to derive the AES-256-GCM key that encrypts BYOK API keys before writing `keys.enc` to disk. The password is identical and public across every install, so the "encryption" only adds a decode step for anyone with the app source or binary (i.e. everyone) — it does not protect a stolen `keys.enc` at all.
- **Notes for next agent**: The project already wires up `tauri-plugin-stronghold` with argon2 (`src-tauri/src/lib.rs:180-191`, `capabilities/default.json`'s `stronghold:default`) — that's the vault primitive this file should be using instead of hand-rolled Web Crypto with a hardcoded password. Check whether `keyStorage.ts` predates the Stronghold wiring (looks like dead-end scaffolding vs. an intentional parallel system) and migrate onto it, deriving the vault key from something OS-keychain-backed rather than a source constant. The `localStorage` fallback path (web/dev mode) is unencrypted by explicit design in the same file — smaller, separate item; confirm web mode really is dev-only before deprioritizing it.

### [Critical/High] SSRF in job-description URL fetch Server Action
- **Where**: `src/actions/urlFetcher.ts:19-125` (`fetchJobDescriptionFromUrl`)
- **What**: Server-side `fetch()` of a user-supplied URL, gated only by an `http:`/`https:` protocol allowlist. No check against loopback, RFC1918 private ranges, link-local/cloud-metadata (`169.254.169.254`), or re-validation after redirects (Node's `fetch` follows redirects by default). A crafted "job posting URL" causes the Node process to hit arbitrary internal network targets and returns the parsed response text to the client.
- **Notes for next agent**: Matters today even in desktop mode — the process has the user's full LAN/localhost reach. Gets worse if `urlFetcher.ts` is ever reused for the project's web deployment mode (`npm run start`). Fix direction: resolve the hostname and reject private/loopback/link-local ranges before fetching, and re-check the final URL after following redirects rather than only validating the input.

### [High] macOS App Sandbox explicitly disabled
- **Where**: `src-tauri/entitlements.plist:12-13` (`com.apple.security.app-sandbox` = `false`)
- **What**: The shipped macOS app opts out of the sandbox entirely, alongside `csp: null` (next finding) and an embedded browser feature that loads arbitrary third-party origins (LinkedIn/Indeed/Glassdoor/etc., see `src-tauri/src/browser.rs`) into child webviews. If any other bug (e.g. the finding below on command ACLs, or a future XSS) is exploitable, the blast radius is materially larger without the sandbox.
- **Notes for next agent**: Check whether this was disabled because the bundled Next server (`spawn_bundled_next_server` in `lib.rs`) needs filesystem/network access the sandbox would otherwise scope — the two entitlements already declared (`network.client`, `files.user-selected.read-write`) suggest a scoped sandbox should work. Try re-enabling `app-sandbox: true` with just those entitlements and see what actually breaks before concluding it's required to stay off.

### [Medium/High] CSP explicitly disabled in Tauri webview
- **Where**: `src-tauri/tauri.conf.json` → `"security": { "csp": null }`
- **What**: No Content-Security-Policy for the main window, which renders LLM output, pasted job content, and resume/cover-letter templates. A CSP is meaningful defense-in-depth against any XSS gap elsewhere (see the DOMPurify race finding below).
- **Notes for next agent**: The main window loads only from `http://127.0.0.1:3008` (`frontendDist`/`devUrl` in `tauri.conf.json`), so a `default-src 'self'`-style policy is a reasonable starting point. Note the child job-site webviews created by `browser.rs` are separate `WebviewUrl::External` views not bound by the main window's CSP — a CSP here hardens the app UI, not the embedded browser (that surface needs its own hardening, if any, via the sandbox item above). Expect to iterate on allowances for Tailwind inline styles / react-pdf / TipTap before it's tight and non-breaking.

### [Medium] Custom Tauri commands not visibly covered by capability permissions
- **Where**: `src-tauri/capabilities/default.json` permissions list vs. every `#[tauri::command]` in `src-tauri/src/browser.rs` (`browser_create_webview`, `browser_go_back`, `browser_reload`, `browser_get_url`, `browser_extract_content`, `browser_set_bounds`, `browser_destroy_all`), registered in `src-tauri/src/lib.rs:231-239`.
- **What**: `default.json` grants only `core:*`, `fs:*`, `process:*`, `stronghold:default`, `updater:*`, `opener:allow-open-url`. None of the seven app-defined `browser_*` commands appear as explicit permission entries or a wildcard covering app commands.
- **Notes for next agent**: Verify against the exact Tauri version pinned (`@tauri-apps/cli` `^2.9.6` in `package.json`, check `src-tauri/Cargo.toml`) — Tauri v2's ACL behavior for app-defined (non-plugin) commands has evolved across minor versions, and `core:default` may implicitly cover the app's own commands in some configurations while plugin commands still need explicit grants. Cheapest way to resolve: try invoking `browser_create_webview` from the main window in a dev build — if it already works, this finding downgrades to "add explicit permissions for clarity/forward-compat," not a live gap. Also check `src-tauri/gen/schemas/` for an auto-generated allow-list this pass may have missed.

### [Medium] Async DOMPurify load creates a weak-sanitizer race window
- **Where**: `src/lib/htmlUtils.ts:1-22` (`sanitizeHtml`), consumed via `dangerouslySetInnerHTML` in `src/components/form/RichTextEditor/RichTextEditorContent.tsx:13`
- **What**: `DOMPurify` is loaded with a fire-and-forget `import("dompurify").then(...)` at module scope. Until that promise resolves, the module-level `DOMPurify` variable is `null`. `sanitizeHtml()`'s branch condition is `typeof window === "undefined" || !DOMPurify` — so on the client, *before* the dynamic import resolves, it silently takes the "server-side" fallback path (naive `<script>` strip + blanket tag-strip regex) even though it's running in a browser. That regex fallback is not a robust HTML sanitizer.
- **Notes for next agent**: Window is likely one microtask/module-eval tick, but "narrow" isn't "safe" — this is a WYSIWYG editor rendering LLM-touched content (humanizer/tailoring output) on every job page load. Simplest fix direction: import `dompurify` statically instead of racing a dynamic import, unless there's a bundle-size reason for the lazy load that should be re-examined. Correlate with the `quill` XSS advisory in the npm-audit finding below — same component.

### [Low/Medium] External-link guard doesn't scheme-allowlist before opening
- **Where**: `src/lib/externalLink.ts` (`isExternalHref`, `openExternalUrl`), `src/components/ExternalLinkGuard.tsx`
- **What**: `isExternalHref` only compares URL *origin*, not scheme. A `javascript:` (or other non-http) href has a different/null origin, so it passes the "external" check and reaches `openExternalUrl` — which calls the Tauri opener plugin or `window.open` depending on context. Exploitability looks low today (browsers largely block `javascript:` via `window.open`, and the opener plugin hands the string to the OS shell rather than evaluating it), but that's incidental behavior of the downstream sinks, not something this code enforces.
- **Notes for next agent**: Cheap hardening — explicitly allowlist `http:`/`https:`/`mailto:`/`tel:` in `isExternalHref` before calling `openExternalUrl`, rather than relying on every current and future consumer to be scheme-safe by luck. Low priority relative to the items above.

### [Info] `.env` is git-tracked despite `.env*` being gitignored
- **Where**: `.env` (tracked — see `git ls-files`), vs. `.gitignore`'s `.env*` rule (and a second, redundant `.env` line later in the same file)
- **What**: Current tracked content is non-sensitive (`DATABASE_URL`, `PORT`). It was added in commit `3a7b931` before/despite the ignore rules taking effect on it, so `git status` won't flag future edits to this specific file as untracked — a future secret dropped into `.env` would get committed silently.
- **Notes for next agent**: `git rm --cached .env` (keep the local file) lets the existing gitignore rule actually apply going forward. Not urgent given current contents, but worth closing before it becomes a real leak. Confirmed `dev.db`, `keys.enc`, `resume-builder.p12`, and `.env.test` are correctly *not* tracked — only `.env` and `.env.test.example` were ever committed.

### [Info] Managed-gateway `/success` redemption page and the `.p12`/`keys.enc` files on disk
- **Where**: `server/llm-gateway/webhook-handler/index.js` `/success` route (GET); `resume-builder.p12`, `keys.enc` in repo root (both gitignored, present locally only)
- **What**: `/success` renders the LiteLLM virtual key into an HTML page keyed only by Stripe's `session_id` query param. The webhook itself does correctly verify `stripe-signature` via `stripe.webhooks.constructEvent` before granting a key, and Stripe session IDs are long/random/single-purpose by design, so this is a defensible pattern rather than a bug as written.
- **Notes for next agent**: Just confirm `session_id` isn't logged anywhere (reverse proxy access logs, error trackers, `Referer` leakage to a third-party script if one is ever added to that page) in a way that would let someone else replay the URL and steal the key. `resume-builder.p12` (code-signing cert, mode 600) and `keys.enc` (a local encrypted-key-store artifact) are correctly gitignored and untracked — confirmed, not a finding, noted so it's not re-checked from scratch next time.

### [Info] Build-error suppression and npm audit
- **Where**: `next.config.ts` (`typescript: { ignoreBuildErrors: true }`)
- **What**: Matches the audit checklist's "no build-error-suppression flags" item, but the inline comment explains this is a deliberate tradeoff — `npm run type-check` is a separate, already-wired release gate, and Next's in-build type-check was OOMing CI on this submodule-heavy type graph.
- **Notes for next agent**: Just confirm the `type-check` gate the comment references is still actually enforced in `.github/workflows/build.yml` / `release.yml` and hasn't silently drifted out of the pipeline — if it has, this becomes a real gap instead of a documented tradeoff.
- `npm audit --omit=dev` (2026-07-17): 9 known vulns, 2 low / 7 moderate, none directly exploited by current app code paths:
  - **`quill` (via `react-quill-new`)** — GHSA-v3m3-f69x-jf25, XSS via HTML export. Worth prioritizing over the others because `RichTextEditor` is quill-based and directly correlates with the DOMPurify race finding above — same component, compounding risk.
  - **`postcss` <8.5.10** (via Next's bundled copy) — XSS via unescaped `</style>`; build-time only, low relevance unless a CSS-in-JS path ever interpolates user content.
  - **`@hono/node-server` <1.19.13** (via a `prisma` devDependency chain) — dev-only path, not shipped.
  - **`uuid` <11.1.1** (via `gaxios`, transitive) — buffer bounds check; `npm audit fix` (non-breaking) resolves it.
  - Re-run `npm audit --omit=dev` after any dependency bump here to confirm before closing.

---

## Clean areas (checked, no findings)

- **SQL injection**: no `$queryRaw`/`$executeRaw`/raw-query usage anywhere in `src/`, `server/`, `packages/` — Prisma's typed client is used exclusively. No surface found.
- **Command injection**: the only `Command::new` call (`src-tauri/src/lib.rs:57`, `spawn_bundled_next_server`) runs with a fixed `"server.js"` arg and a `node_cmd` chosen from a hardcoded candidate list / `TAURI_NODE_PATH` env var — not derived from request/user input at runtime.
- **Secrets in working tree / git history**: no live-looking secret patterns found (`gitleaks`/`trufflehog` not installed locally — hand-rolled greps only, re-run with a real scanner if one becomes available). Only `.env` and `.env.test.example` were ever committed, both non-sensitive. CI workflows (`build.yml`, `release.yml`) source `KEYCHAIN_PASSWORD` from `secrets.*`, never hardcoded.
- **Webhook auth**: `server/llm-gateway/webhook-handler` correctly verifies the Stripe signature before trusting any payload.
- **CORS**: no wildcard `Access-Control-Allow-Origin`; `next.config.ts` sets no CORS headers at all (not a hosted multi-origin API today).
- **Auth/IDOR in Server Actions**: N/A by design, not an oversight — this is a local-first, single-user desktop app; `src/actions/` does only local SQLite CRUD with no session/auth layer, matching the architecture documented in `CLAUDE.md`. **Caveat for next agent**: if the web deployment mode (`npm run start`) is ever exposed beyond `localhost` to more than one user, every file in `src/actions/` needs a full IDOR/auth re-audit from scratch — none of it has ownership checks today because none was ever needed.

## Not applicable

- No `#[tauri::command]` handlers outside `src-tauri/src/browser.rs` take path or shell arguments, so path-traversal/shell-argument-injection checks on handler inputs are covered by the ACL finding above rather than a separate section.
- Windows/Linux OS-sandbox equivalents (AppArmor/snap, Windows app manifest capabilities) — not configured in this repo (macOS-only signing/entitlements setup found); flag if Windows/Linux distribution is added later.

## Explicitly not re-verified this pass

- **Prompt injection templates**: `CLAUDE.md` states untrusted data is wrapped in delimiters before interpolation as a hard project rule (`src/lib/llm/prompts/`). This pass confirmed the directory structure and convention exist but did **not** do an exhaustive line-by-line check of every template under `src/lib/llm/prompts/templates/` for a bypass. Since this is the one area the project's own CLAUDE.md calls out as load-bearing, the next agent should do a dedicated full pass there rather than trust this spot-check.
