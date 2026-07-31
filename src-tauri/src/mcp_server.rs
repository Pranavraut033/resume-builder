use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::Mutex,
    time::Duration,
};

use tauri::Manager;

use crate::wait_for_local_server;

/// Local port the bundled MCP HTTP transport (`src/mcp/http.ts`) listens on
/// — matches that file's own `PORT` env fallback
/// (`Number(process.env.PORT) || 39217`), so this isn't a second source of
/// truth for the port, just the same default made explicit for the spawned
/// child. Distinct from 3008 (Next dev server) and 3009 (bundled Next
/// server).
const MCP_SERVER_PORT: u16 = 39217;

/// Separate from `NextServerState` — this process is independently
/// started/stopped by the user via the Settings toggle, never auto-started.
pub struct McpServerState(pub Mutex<Option<Child>>);

/// Repo root when running under `tauri dev`. `CARGO_MANIFEST_DIR` is
/// `<repo>/src-tauri`, baked in at compile time — this only ever makes sense
/// when developing this repo itself; an end user's installed app always
/// takes the release branch in `spawn_mcp_server` instead.
fn dev_repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("CARGO_MANIFEST_DIR should have a parent directory")
        .to_path_buf()
}

/// Locates `resources/next/mcp/` — produced by `scripts/prepareTauriServer.mjs`
/// alongside the Next server's own bundled resources — under either of the
/// two resource-dir shapes Tauri produces per-platform (see the identical
/// pattern in `spawn_bundled_next_server`, `lib.rs`). Shared by
/// `spawn_mcp_server` (which needs it to start the server) and
/// `mcp_server_stdio_command` (which needs it to tell an external MCP host
/// — Claude Code, Claude Desktop — where the bundled entrypoint lives,
/// without that host needing this repo cloned at all).
fn find_bundled_mcp_dir(resource_dir: &Path) -> Result<PathBuf, String> {
    let candidate_dirs = [
        resource_dir.join("next").join("mcp"),
        resource_dir.join("resources").join("next").join("mcp"),
    ];

    candidate_dirs
        .iter()
        .find(|dir| dir.join("stdio.js").exists())
        .cloned()
        .ok_or_else(|| {
            let checked_paths = candidate_dirs
                .iter()
                .map(|dir| dir.join("stdio.js").display().to_string())
                .collect::<Vec<_>>()
                .join(", ");
            format!(
                "Bundled MCP server entrypoint not found. Checked: {checked_paths}. Run `npm run build:mcp && npm run prepare:tauri-server` (or `npm run tauri build`) first."
            )
        })
}

/// The bundled Node runtime `mcp_dir`'s sibling `node-bin/node` — see
/// `spawn_bundled_next_server`'s own comment on why a bundled binary (ABI-
/// matched to the native `better-sqlite3` module built alongside it) is used
/// instead of trusting the end user's own system `node`, if any.
fn find_bundled_node_bin(mcp_dir: &Path) -> Result<PathBuf, String> {
    let node_bin = mcp_dir
        .parent()
        .ok_or_else(|| "Could not resolve the MCP server's parent directory".to_string())?
        .join("node-bin")
        .join("node");
    if !node_bin.exists() {
        return Err(format!(
            "Bundled Node runtime not found at {}. Run `npm run tauri build` (which runs scripts/prepareTauriServer.mjs) rather than invoking cargo/tauri directly.",
            node_bin.display()
        ));
    }
    Ok(node_bin)
}

/// Spawns the bundled MCP HTTP server using the same bundled Node runtime
/// the Next server uses — see `spawn_bundled_next_server` in `lib.rs`. Never
/// called from `.setup()`; only from `mcp_server_start`, on demand.
fn spawn_mcp_server(
    resource_dir: PathBuf,
    app_data_dir: &Path,
    log_file: &Path,
) -> Result<Child, String> {
    let mcp_dir = find_bundled_mcp_dir(&resource_dir)?;
    let node_bin = find_bundled_node_bin(&mcp_dir)?;

    // MCP server logs go here instead of Stdio::null(), separate from the
    // Next server's own server.log — see fs::File::create + try_clone below,
    // matching spawn_bundled_next_server's pattern.
    let stdout_file = fs::File::create(log_file).map_err(|e| e.to_string())?;
    let stderr_file = stdout_file.try_clone().map_err(|e| e.to_string())?;

    let mut command = Command::new(&node_bin);
    command
        .arg(mcp_dir.join("http.js"))
        .env("PORT", MCP_SERVER_PORT.to_string())
        .stdout(Stdio::from(stdout_file))
        .stderr(Stdio::from(stderr_file));

    if cfg!(debug_assertions) {
        // Dev: mirrors `npm run mcp` — there is no app_data_dir/app.db yet in
        // dev (the Next dev server, started separately via `npm run dev`,
        // reads dev.db from the repo-root `.env`). Running with the repo
        // root as the working directory lets `src/mcp/db.ts`'s own dotenv
        // fallback find that same `.env`/DATABASE_URL, instead of pointing at
        // an unrelated app.db.
        command.current_dir(dev_repo_root());
    } else {
        // Release: the exact same file spawn_bundled_next_server points the
        // Next server at, so MCP-made changes show up in the app immediately.
        let database_url = format!("file:{}", app_data_dir.join("app.db").display());
        command.current_dir(&mcp_dir).env("DATABASE_URL", &database_url);
    }

    command.spawn().map_err(|e| {
        format!(
            "Failed to spawn bundled MCP server node ({}): {e}",
            node_bin.display()
        )
    })
}

/// Starts the MCP server if it isn't already running and waits for its port
/// to accept connections, returning the port on success. Returns the same
/// port without respawning if it's already running.
#[tauri::command]
pub fn mcp_server_start(app: tauri::AppHandle) -> Result<u16, String> {
    let state = app.state::<McpServerState>();
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;

    if let Some(child) = guard.as_mut() {
        if matches!(child.try_wait(), Ok(None)) {
            return Ok(MCP_SERVER_PORT);
        }
        // Exited on its own (e.g. crashed) since the last check — clear the
        // stale handle and fall through to respawn.
        *guard = None;
    }

    let resource_dir = app.path().resource_dir().map_err(|e| e.to_string())?;
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
    let logs_dir = app_data_dir.join("logs");
    fs::create_dir_all(&logs_dir).map_err(|e| e.to_string())?;
    let log_path = logs_dir.join("mcp.log");

    let mut child = spawn_mcp_server(resource_dir, &app_data_dir, &log_path)?;

    if !wait_for_local_server("127.0.0.1", MCP_SERVER_PORT, Duration::from_secs(15)) {
        let _ = child.kill();
        return Err(format!(
            "Timed out waiting for the MCP server on 127.0.0.1:{MCP_SERVER_PORT}. Check {} for details.",
            log_path.display()
        ));
    }

    *guard = Some(child);
    Ok(MCP_SERVER_PORT)
}

/// Kills the MCP server child if running. No-op if it isn't.
#[tauri::command]
pub fn mcp_server_stop(app: tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<McpServerState>();
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = guard.take() {
        child.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Whether the MCP server is currently running, reaping the child handle if
/// it exited on its own (e.g. crashed) since the last check.
#[tauri::command]
pub fn mcp_server_status(app: tauri::AppHandle) -> Result<bool, String> {
    let state = app.state::<McpServerState>();
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(child) = guard.as_mut() {
        if matches!(child.try_wait(), Ok(None)) {
            return Ok(true);
        }
        *guard = None;
    }
    Ok(false)
}

#[derive(serde::Serialize)]
pub struct McpStdioCommand {
    /// Absolute path to this exact install's bundled Node binary — not a
    /// bare "node", so a host (Claude Code, Claude Desktop) never falls back
    /// to whatever system Node the user happens to have, which may not be
    /// ABI-compatible with the native `better-sqlite3` module bundled
    /// alongside it (see `find_bundled_node_bin`).
    pub node_path: String,
    /// Absolute path to the bundled `stdio.js` entrypoint. Together with
    /// `node_path`, this is a full `command + arg` a host can register
    /// directly — no repo clone, no `npm run mcp`, no Node install of the
    /// user's own required.
    pub stdio_path: String,
    /// This install's real `app.db`, as a `file:` URL — same value
    /// `spawn_mcp_server`'s release branch passes via `env("DATABASE_URL",
    /// ...)`. A host that spawns `stdio.js` directly bypasses that Rust
    /// code entirely, so without this the process falls back to
    /// `src/mcp/db.ts`'s dotenv/`./prisma/dev.db` default — the wrong
    /// database for an end user with no `.env` at all. Callers must set
    /// this as an env var on the process they register (e.g. `claude mcp
    /// add --env DATABASE_URL=...` or `claude_desktop_config.json`'s `env`
    /// field), not just pass it as an argument.
    pub database_url: String,
}

/// Resolves this install's bundled stdio entrypoint so an external MCP host
/// can be pointed at it directly, independent of this repo/a dev checkout.
/// Errors in dev (`tauri dev` never bundles `resources/next/mcp/`, see
/// `spawn_mcp_server`'s debug/release split) — callers fall back to the
/// `npm run mcp` dev workflow when this errors.
#[tauri::command]
pub fn mcp_server_stdio_command(app: tauri::AppHandle) -> Result<McpStdioCommand, String> {
    let resource_dir = app.path().resource_dir().map_err(|e| e.to_string())?;
    let mcp_dir = find_bundled_mcp_dir(&resource_dir)?;
    let node_bin = find_bundled_node_bin(&mcp_dir)?;
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let database_url = format!("file:{}", app_data_dir.join("app.db").display());

    Ok(McpStdioCommand {
        node_path: node_bin.display().to_string(),
        stdio_path: mcp_dir.join("stdio.js").display().to_string(),
        database_url,
    })
}

/// Writes a self-contained MCP plugin bundle (Claude Code plugin layout —
/// `.claude-plugin/plugin.json` + `.mcp.json` + `skills/`) as a single
/// `.plugin` zip file at `dest_path`, so a plugin-aware host (Claude Code,
/// Cowork, ...) can install it directly — installers scan an archive, not a
/// loose folder, hence zipping rather than writing the tree straight to
/// disk. Same this-machine-only caveat as `mcp_server_stdio_command`: the
/// paths baked into `.mcp.json` are this install's absolute bundled
/// node/stdio.js, not portable to another machine.
#[tauri::command]
pub fn export_cowork_plugin(app: tauri::AppHandle, dest_path: String) -> Result<String, String> {
    let resource_dir = app.path().resource_dir().map_err(|e| e.to_string())?;
    let mcp_dir = find_bundled_mcp_dir(&resource_dir)?;
    let node_bin = find_bundled_node_bin(&mcp_dir)?;
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let database_url = format!("file:{}", app_data_dir.join("app.db").display());

    let version = app.package_info().version.to_string();
    let plugin_json = serde_json::json!({
        "name": "udaan",
        "version": version,
        "description": "Drive Udaan's resume/job flows (parse, tailor, ATS analysis, cover letters, proofreading, humanizing) via MCP, using your own model instead of an API key stored in the app."
    });

    let mcp_json = serde_json::json!({
        "mcpServers": {
            "resume-builder": {
                "command": node_bin.display().to_string(),
                "args": [mcp_dir.join("stdio.js").display().to_string()],
                "env": { "DATABASE_URL": database_url }
            }
        }
    });

    let skill_src = mcp_dir.join("skills").join("resume-mcp").join("SKILL.md");
    let skill_md = fs::read_to_string(&skill_src).unwrap_or_default();

    let dest_path = PathBuf::from(dest_path);
    let file = fs::File::create(&dest_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options =
        zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);

    zip.start_file(".claude-plugin/plugin.json", options)
        .map_err(|e| e.to_string())?;
    zip.write_all(
        serde_json::to_string_pretty(&plugin_json)
            .map_err(|e| e.to_string())?
            .as_bytes(),
    )
    .map_err(|e| e.to_string())?;

    zip.start_file(".mcp.json", options)
        .map_err(|e| e.to_string())?;
    zip.write_all(
        serde_json::to_string_pretty(&mcp_json)
            .map_err(|e| e.to_string())?
            .as_bytes(),
    )
    .map_err(|e| e.to_string())?;

    zip.start_file("skills/resume-mcp/SKILL.md", options)
        .map_err(|e| e.to_string())?;
    zip.write_all(skill_md.as_bytes())
        .map_err(|e| e.to_string())?;

    zip.finish().map_err(|e| e.to_string())?;

    Ok(dest_path.display().to_string())
}
