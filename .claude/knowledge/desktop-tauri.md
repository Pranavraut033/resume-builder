# Desktop — Tauri, the bundled server, logs, updates, CSP

Read this for: anything that only reproduces in the built/installed app, Tauri commands, the packaged
database, code signing, the updater, or CSP.

## Two servers, two databases

| Context             | Port     | Database            |
| ------------------- | -------- | ------------------- |
| `npm run dev`       | **3008** | repo-local `dev.db` |
| Built/installed app | **3009** | `$APPDATA/app.db`   |

The bundled Next server is spawned by `src-tauri/src/lib.rs::spawn_bundled_next_server`. The ports never
collide, so both can run at once — and then `curl localhost:3008` and `curl localhost:3009` return **different
job/resume data**. Never assume a request to one reflects the other's state.

`$APPDATA` per OS (bundle id `com.resumebuilder.dev`):

- macOS `~/Library/Application Support/com.resumebuilder.dev`
- Windows `%APPDATA%\com.resumebuilder.dev`
- Linux `~/.config/com.resumebuilder.dev`

## Debugging an installed-app-only bug

The built app has no attached terminal, so a bug that only appears "after build" (a button that's disabled,
an action that silently does nothing) must be diagnosed from log files. **Read both before speculating.**

- `$APPDATA/logs/server.log` — stdout+stderr of the bundled Next server: Server Action errors, Prisma errors,
  unhandled server exceptions. **Truncated fresh on every launch.**
- `$APPDATA/logs/client.log` — JSON-lines mirror of every `logger.*()` call from client code
  (`src/lib/logger.ts`) — the same errors browser devtools would show. **Appended across launches, no
  rotation.**

## Schema migration for installed apps

App updates replace the bundled template DB but **never touch a user's existing `$APPDATA/app.db`**. So on
every launch `sync_database_schema` (`src-tauri/src/lib.rs`) runs `scripts/migrate-app-db.mjs` against the
bundled `app-template.db` to ALTER the user's `app.db` onto the current schema. Harmless no-op once current.

**This is what carries a `prisma/schema.prisma` change forward for existing installs** — `npm run db:push`
only updates `dev.db`. Adding a column without updating the migration script ships a broken update.

## macOS quarantine

The macOS build is only ad-hoc signed (`signingIdentity: "-"`), so `com.apple.quarantine` propagates from the
running app to every file it writes — including the bundle the updater extracts on `downloadAndInstall()`.
Left alone, the updated app launches as "damaged" and forces a manual reinstall.

`clear_quarantine` (`src-tauri/src/lib.rs`) runs `xattr -dr com.apple.quarantine` on the app's own `.app`
bundle. It is called once at launch and again from `src/hooks/useAppUpdater.ts` immediately after an update
installs. No-op on non-macOS.

## Rust sources (`src-tauri/src/`)

| File            | Purpose                                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `main.rs`       | Binary entry point.                                                                                                                    |
| `lib.rs`        | App setup — `spawn_bundled_next_server`, `sync_database_schema`, `clear_quarantine`.                                                   |
| `keychain.rs`   | OS keychain access (`keyring`) for the per-install master key behind encrypted API-key storage — see [llm-runtime.md](llm-runtime.md). |
| `browser.rs`    | In-app browser webview backing `/find-jobs/browse` (client side: `src/lib/browserWebview.ts`).                                         |
| `mcp_server.rs` | Hosts the MCP server process (client side: `src/lib/mcpServer.ts`, `src/store/mcpServerStore.ts`).                                     |

## Build scripts

- `scripts/prepareTauriServer.mjs` (`npm run prepare:tauri-server`) — stages the standalone Next server into
  the bundle. On Linux it also recursively strips musl-libc native binaries (any `node_modules` dir whose name
  contains `musl`, e.g. `@img/sharp-linuxmusl-x64`, llm-core's rolldown) from the bundled output — `ldd`
  chokes on a musl-linked binary and aborts `linuxdeploy`. This must run _after_ `bundleMcpServer()`, which
  re-copies llm-core's real (symlink-dereferenced) directory and would otherwise reintroduce the stripped file.
- `scripts/migrate-app-db.mjs` — the launch-time migration above.
- `npm run build:mcp` (`tsup.mcp.config.ts`) — bundles the MCP server; part of `prebuild`.

Per-target builds: `desktop:build:mac`, `:mac:x64`, `:mac:universal`, `:windows`, `:linux`.
`npm run tauri` wraps the Tauri CLI with `dotenv-cli -e .env`, so Tauri commands get repo env vars.

## Content Security Policy

`src/proxy.ts` — **not** `next.config.ts`'s `headers()` — sets a per-request CSP with a fresh nonce. The App
Router needs `script-src` to allow its own inline RSC/hydration scripts, and a nonce permits that without
`'unsafe-inline'`. See `docs/SECURITY_AUDIT.md`.

`connect-src` includes `data:` — fontkit (a `@react-pdf/renderer` dependency, used for PDF export) fetches
its WASM binary as a `data:` URI; without it the fetch is CSP-blocked and PDF export's font subsetting fails.
`font-src`/`img-src` already allow `data:`, but that doesn't cover `connect-src`.
