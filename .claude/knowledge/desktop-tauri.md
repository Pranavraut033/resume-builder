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

## The updater's `Finished` event fires before install is done

`tauri-plugin-updater`'s `downloadAndInstall(onEvent)` reports `Finished` when the **download** stream ends
— not when the app is actually installed. The install (gunzip + untar the whole bundle, `rename` the old
`.app` aside, `rename` the new one into place) runs afterwards, still inside the same `await`. The bundled
app is 442 MB, so that extract alone takes tens of seconds. `useAppUpdater.ts` tracks this with a distinct
`installing` state between `Finished` and the `await` actually resolving — **never** treat `Finished` as
"safe to relaunch". `UpdatePrompt.tsx` only offers the Restart button once `status === "ready"`, which is
set after `downloadAndInstall()` returns and `clear_quarantine` has run. Getting this wrong is why updates
used to "succeed" and silently leave the app on the old version — relaunching mid-extract exec's back into
whichever bundle happened to be on disk at that instant.

## Updater logging

Both sides now log every step — before this, a failed update left literally no trace anywhere, which is why
past fixes were guesses:

- JS: `useAppUpdater.ts` logs through `src/lib/logger.ts` (tag `updater`) into `$APPDATA/logs/client.log` —
  check start/result, download start (with size), install finish, quarantine-clear result, every error.
- Rust: `tauri_plugin_log` is registered in `lib.rs` with a `LogDir` target (`file_name: "rust"`), which
  captures `tauri-plugin-updater`'s own internal `log::` calls (e.g. the admin-privileges AppleScript
  branch, install IO errors) that were previously discarded. Written to the OS log dir, **not**
  `$APPDATA/logs`: `~/Library/Logs/<bundle id>/rust.log` on macOS, `%LOCALAPPDATA%\<bundle id>\logs\` on
  Windows, `$XDG_DATA_HOME/<bundle id>/logs/` on Linux.

## DMG/installer fallback

`download_installer(version)` (`src-tauri/src/lib.rs`) is the manual escape hatch: queries the GitHub API
for the named release's assets (rather than reconstructing the filename — a bundler naming change can't
silently 404 this), downloads the platform-matching one to `std::env::temp_dir()`, strips quarantine on
macOS, and opens it via `tauri_plugin_opener` (mounts the DMG, runs the NSIS installer, or reveals the
AppImage). `useAppUpdater.ts`'s `downloadInstaller()` wraps this and then `exit(0)`s so the old copy isn't
still holding port 3009 when the user replaces it. Wired into `UpdatePrompt` (secondary action on
`available`, primary on `error`) and Settings (next to "Check for Updates", shown only when a newer
version is known).

## Local update testing

`npm run test:local-update` (`scripts/test-local-update.sh`) is the fastest way to exercise the race above —
no CI, no cut release. It builds the app twice under a throwaway `com.resumebuilder.localtest` identifier
(isolated from real `$APPDATA`, but still binds the real port 3009 — quit any running Udaan/Udaan Canary
first): once at the current version with its updater endpoint pointed at a local `python3 -m http.server`,
and once one version up as the signed payload that server serves. A plain `http://` endpoint needs
`dangerousInsecureTransportProtocol: true` in the overlay config — without it `tauri-plugin-updater` rejects
the endpoint during plugin init and the app fails to open a window at all, silently, unless launched from a
terminal that shows stderr (this cost real debugging time before the flag was added).

## Canary channel

Push to the `canary` branch and `.github/workflows/canary.yml` builds "Udaan Canary" — a separate app that
installs alongside the real one, for exercising the self-update path (including the trap above) against a
real GitHub release — not a local server, so this also covers platforms other than macOS aarch64 — without
touching the live install/DB:

- **Separate everything except code**: `src-tauri/canary.conf.json` (merged via `--config`, same pattern
  `windows-signing.conf.json` uses in `release.yml`) overrides only `productName` → "Udaan Canary",
  `identifier` → `com.resumebuilder.canary`, and `plugins.updater.endpoints`. Different identifier means a
  different `$APPDATA` (own `app.db`, own logs) — a canary bug can't touch real data.
- **Version**: the workflow computes `<package.json version>-canary.<run number>` and patches it into
  `canary.conf.json` before building. Semver prerelease ordering makes each push a valid update over the
  last (`…canary.2 > …canary.1`) while staying below the real release version (irrelevant anyway — it's a
  separate app with a separate endpoint).
- **Distribution**: a single moving `canary` tag/release (deleted and recreated every run) at
  `releases/download/canary/update.json` — the endpoint canary.conf.json points at. Can't use
  `releases/latest/download/` the way the real endpoint does, since GitHub's "latest" skips prereleases and
  this release is marked `prerelease: true`.
- **Known ceilings, left as-is**: canary shares stable's keychain service name (`keychain.rs`'s
  `SERVICE_NAME`), so it reads the same encrypted API keys — convenient, and safe since the key is only
  read, never rotated, when one already exists. Port 3009 is hardcoded (`lib.rs`), so canary and stable
  can't run at the same time.

## Rust sources (`src-tauri/src/`)

| File            | Purpose                                                                                                                                                                                                                                                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main.rs`       | Binary entry point.                                                                                                                                                                                                                                                                                                                                 |
| `lib.rs`        | App setup — `spawn_bundled_next_server`, `sync_database_schema`, `clear_quarantine`. On restart (e.g. after an update install), it kills the old bundled-server child and `.wait()`s for it before a new one spawns — without the wait, the new instance's bind can race a still-open port-3009 socket and the app exits before its window appears. |
| `keychain.rs`   | OS keychain access (`keyring`) for the per-install master key behind encrypted API-key storage — see [llm-runtime.md](llm-runtime.md).                                                                                                                                                                                                              |
| `browser.rs`    | In-app browser webview backing `/find-jobs/browse` (client side: `src/lib/browserWebview.ts`).                                                                                                                                                                                                                                                      |
| `mcp_server.rs` | Hosts the MCP server process (client side: `src/lib/mcpServer.ts`, `src/store/mcpServerStore.ts`). Autostart checks for a stranger already bound to the MCP port (a leftover child from a prior instance whose `RunEvent::Exit` cleanup was skipped) before spawning, verifies the new child is still alive after the readiness probe passes, and gives first-launch-after-update a longer timeout for Gatekeeper's scan of the freshly-extracted Node binary. Autostart failures surface as a notification instead of being dropped silently in the logger. |

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
