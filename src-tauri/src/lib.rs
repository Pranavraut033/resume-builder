use std::{
    fs, io,
    net::TcpStream,
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::Mutex,
    thread,
    time::{Duration, Instant},
};

use tauri::{Manager, WebviewUrl};

mod browser;
mod keychain;

struct NextServerState(Mutex<Option<Child>>);

fn wait_for_local_server(host: &str, port: u16, timeout: Duration) -> bool {
    let address = format!("{host}:{port}");
    let start = Instant::now();

    while start.elapsed() < timeout {
        if TcpStream::connect(&address).is_ok() {
            return true;
        }
        thread::sleep(Duration::from_millis(200));
    }

    false
}

fn spawn_bundled_next_server(
    resource_dir: PathBuf,
    db_path: &Path,
    log_file: &Path,
) -> Result<Child, String> {
    let candidate_dirs = [
        resource_dir.join("next"),
        resource_dir.join("resources").join("next"),
    ];

    let server_dir = candidate_dirs
        .iter()
        .find(|dir| dir.join("server.js").exists())
        .cloned();

    let Some(server_dir) = server_dir else {
        let checked_paths = candidate_dirs
            .iter()
            .map(|dir| dir.join("server.js").display().to_string())
            .collect::<Vec<_>>()
            .join(", ");

        return Err(format!(
            "Bundled Next server entrypoint not found. Checked: {checked_paths}"
        ));
    };

    // End users aren't expected to have Node installed, so we don't search
    // their system for it (that also made native-module ABI compatibility
    // (better-sqlite3) a footgun — see docs/DEBUGGING.md). Instead
    // scripts/prepareTauriServer.mjs bundles the exact Node binary its own
    // build ran under, guaranteeing an ABI match by construction.
    let node_bin = server_dir.join("node-bin").join("node");
    if !node_bin.exists() {
        return Err(format!(
            "Bundled Node runtime not found at {}. Run `npm run tauri build` (which runs scripts/prepareTauriServer.mjs) rather than invoking cargo/tauri directly.",
            node_bin.display()
        ));
    }

    let database_url = format!("file:{}", db_path.display());

    // Next.js server logs (including unhandled Server Action errors) go
    // here instead of Stdio::null() so they're recoverable after install
    // — see docs/DEBUGGING.md.
    let stdout_file = fs::File::create(log_file).map_err(|e| e.to_string())?;
    let stderr_file = stdout_file.try_clone().map_err(|e| e.to_string())?;

    Command::new(&node_bin)
        .arg("server.js")
        .current_dir(&server_dir)
        .env("HOSTNAME", "127.0.0.1")
        .env("PORT", "3009")
        .env("NODE_ENV", "production")
        // Absolute path outside the app bundle so the database survives
        // app updates, which replace the bundle (and any relative-path
        // db file inside it) wholesale.
        .env("DATABASE_URL", &database_url)
        .stdout(Stdio::from(stdout_file))
        .stderr(Stdio::from(stderr_file))
        .spawn()
        .map_err(|e| format!("Failed to spawn bundled node ({}): {e}", node_bin.display()))
}

/// A fresh app-data dir has no `app.db`. If the Next server creates it
/// itself (via better-sqlite3's open-or-create), it comes back with zero
/// tables and every Server Action fails with "table does not exist" — see
/// docs/DEBUGGING.md. Seed it from the already-migrated template DB bundled
/// alongside the server (see scripts/prepareTauriServer.mjs) instead.
fn seed_database_if_missing(resource_dir: &Path, db_path: &Path) -> Result<(), String> {
    if db_path.exists() {
        return Ok(());
    }

    let candidate_templates = [
        resource_dir.join("next").join("app-template.db"),
        resource_dir
            .join("resources")
            .join("next")
            .join("app-template.db"),
    ];

    let template = candidate_templates
        .iter()
        .find(|path| path.exists())
        .ok_or_else(|| {
            format!(
                "Database template not found. Checked: {}",
                candidate_templates
                    .iter()
                    .map(|p| p.display().to_string())
                    .collect::<Vec<_>>()
                    .join(", ")
            )
        })?;

    fs::copy(template, db_path)
        .map_err(|e| format!("Failed to seed database from template: {e}"))?;
    Ok(())
}

/// App updates replace the bundle (and its fresh app-template.db) but never
/// touch the user's existing app.db, so a schema change (e.g. a new column)
/// ships in the code while already-installed users' databases stay on the
/// old shape — see migrate-app-db.mjs, which does the actual diff-and-ALTER
/// against app-template.db as the source of truth. Runs on every launch
/// (harmless no-op once db_path is already current, including right after
/// seed_database_if_missing on a fresh install).
fn sync_database_schema(resource_dir: &Path, db_path: &Path) -> Result<(), String> {
    let candidate_dirs = [
        resource_dir.join("next"),
        resource_dir.join("resources").join("next"),
    ];

    let server_dir = candidate_dirs
        .iter()
        .find(|dir| dir.join("migrate-app-db.mjs").exists())
        .ok_or_else(|| {
            format!(
                "migrate-app-db.mjs not found. Checked: {}",
                candidate_dirs
                    .iter()
                    .map(|d| d.join("migrate-app-db.mjs").display().to_string())
                    .collect::<Vec<_>>()
                    .join(", ")
            )
        })?;

    let node_bin = server_dir.join("node-bin").join("node");
    let template_path = server_dir.join("app-template.db");

    let output = Command::new(&node_bin)
        .arg("migrate-app-db.mjs")
        .arg(&template_path)
        .arg(db_path)
        .current_dir(server_dir)
        .output()
        .map_err(|e| format!("Failed to run migrate-app-db.mjs: {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "migrate-app-db.mjs failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let mut next_server_child = None;

            if !cfg!(debug_assertions) {
                let resource_dir = app.path().resource_dir().map_err(|_| {
                    io::Error::new(
                        io::ErrorKind::NotFound,
                        "could not resolve resource directory",
                    )
                })?;

                let app_data_dir = app.path().app_data_dir().map_err(|_| {
                    io::Error::new(
                        io::ErrorKind::NotFound,
                        "could not resolve app data directory",
                    )
                })?;
                fs::create_dir_all(&app_data_dir)?;
                let db_path = app_data_dir.join("app.db");
                seed_database_if_missing(&resource_dir, &db_path).map_err(io::Error::other)?;
                sync_database_schema(&resource_dir, &db_path).map_err(io::Error::other)?;

                let logs_dir = app_data_dir.join("logs");
                fs::create_dir_all(&logs_dir)?;
                let server_log_path = logs_dir.join("server.log");

                let child = spawn_bundled_next_server(resource_dir, &db_path, &server_log_path)
                    .map_err(io::Error::other)?;

                if !wait_for_local_server("127.0.0.1", 3009, Duration::from_secs(30)) {
                    return Err(io::Error::new(
                        io::ErrorKind::TimedOut,
                        "Timed out waiting for local Next server on 127.0.0.1:3009",
                    )
                    .into());
                }

                next_server_child = Some(child);
            }

            app.manage(NextServerState(Mutex::new(next_server_child)));

            let mut window_config = app
                .config()
                .app
                .windows
                .first()
                .ok_or_else(|| {
                    io::Error::new(io::ErrorKind::NotFound, "No window configuration found")
                })?
                .clone();

            if cfg!(debug_assertions) {
                // ponytail: config's window.url is the release-mode bundled-server
                // port (3009); dev mode never spawns that server (see above), so
                // point at devUrl (3008) instead of hitting whatever else is on 3009.
                let dev_url = app.config().build.dev_url.clone().ok_or_else(|| {
                    io::Error::new(io::ErrorKind::NotFound, "No devUrl configured")
                })?;
                window_config.url = WebviewUrl::External(dev_url);
            }

            tauri::WebviewWindowBuilder::from_config(app, &window_config)?.build()?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            browser::browser_create_webview,
            browser::browser_go_back,
            browser::browser_reload,
            browser::browser_get_url,
            browser::browser_extract_content,
            browser::browser_set_bounds,
            browser::browser_destroy_all,
            keychain::get_or_create_master_key,
        ])
        .build(tauri::generate_context!())
        .unwrap_or_else(|error| {
            eprintln!("error building tauri application: {error}");
            std::process::exit(1);
        });

    app.run(|app_handle, event| {
        if let tauri::RunEvent::Exit = event {
            if let Some(state) = app_handle.try_state::<NextServerState>() {
                if let Ok(mut guard) = state.0.lock() {
                    if let Some(mut child) = guard.take() {
                        let _ = child.kill();
                    }
                }
            }
        }
    });
}
