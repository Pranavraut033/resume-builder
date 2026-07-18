use std::{
    env, fs, io,
    net::TcpStream,
    path::PathBuf,
    process::{Child, Command, Stdio},
    sync::Mutex,
    thread,
    time::{Duration, Instant},
};

use tauri::Manager;
use tauri_plugin_stronghold::Builder;

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

fn spawn_bundled_next_server(resource_dir: PathBuf) -> Result<Child, String> {
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

    let mut attempted = Vec::new();

    for node_cmd in node_command_candidates() {
        let spawn_result = Command::new(&node_cmd)
            .arg("server.js")
            .current_dir(&server_dir)
            .env("HOSTNAME", "127.0.0.1")
            .env("PORT", "3008")
            .env("NODE_ENV", "production")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn();

        match spawn_result {
            Ok(child) => return Ok(child),
            Err(error) => attempted.push(format!("{node_cmd} ({error})")),
        }
    }

    Err(format!(
        "Failed to start bundled Next server. Tried node commands: {}",
        attempted.join(", ")
    ))
}

fn node_command_candidates() -> Vec<String> {
    let mut candidates = Vec::new();

    if let Ok(value) = env::var("TAURI_NODE_PATH") {
        let trimmed = value.trim();
        if !trimmed.is_empty() {
            candidates.push(trimmed.to_string());
        }
    }

    if let Ok(home) = env::var("HOME") {
        let home_path = PathBuf::from(&home);

        // nvm
        let nvm_dir = home_path.join(".nvm").join("versions").join("node");
        if let Ok(entries) = fs::read_dir(nvm_dir) {
            let mut versions = entries
                .filter_map(Result::ok)
                .map(|entry| entry.path())
                .filter(|path| path.is_dir())
                .collect::<Vec<_>>();

            versions.sort();
            versions.reverse();

            for version_dir in versions {
                let candidate = version_dir.join("bin").join("node");
                if candidate.exists() {
                    candidates.push(candidate.to_string_lossy().into_owned());
                }
            }
        }

        // fnm (fast node manager)
        for fnm_base in [
            home_path.join(".fnm").join("node-versions"),
            home_path
                .join("Library")
                .join("Application Support")
                .join("fnm")
                .join("node-versions"),
        ] {
            if let Ok(entries) = fs::read_dir(&fnm_base) {
                let mut versions = entries
                    .filter_map(Result::ok)
                    .map(|entry| entry.path())
                    .filter(|path| path.is_dir())
                    .collect::<Vec<_>>();

                versions.sort();
                versions.reverse();

                for version_dir in versions {
                    let candidate = version_dir.join("installation").join("bin").join("node");
                    if candidate.exists() {
                        candidates.push(candidate.to_string_lossy().into_owned());
                    }
                }
            }
        }

        // volta
        let volta_node = home_path.join(".volta").join("bin").join("node");
        if volta_node.exists() {
            candidates.push(volta_node.to_string_lossy().into_owned());
        }

        // asdf
        let asdf_node = home_path.join(".asdf").join("shims").join("node");
        if asdf_node.exists() {
            candidates.push(asdf_node.to_string_lossy().into_owned());
        }

        // mise (formerly rtx)
        let mise_node = home_path
            .join(".local")
            .join("share")
            .join("mise")
            .join("shims")
            .join("node");
        if mise_node.exists() {
            candidates.push(mise_node.to_string_lossy().into_owned());
        }
    }

    for absolute in [
        "/opt/homebrew/bin/node",
        "/opt/homebrew/opt/node/bin/node",
        "/usr/local/bin/node",
        "/usr/local/opt/node/bin/node",
        "/usr/bin/node",
    ] {
        if PathBuf::from(absolute).exists() {
            candidates.push(absolute.to_string());
        }
    }

    // Keep PATH-based lookup as a final fallback.
    candidates.push("node".to_string());

    candidates
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let salt_path = app
                .path()
                .app_local_data_dir()
                .map_err(|_| {
                    io::Error::new(
                        io::ErrorKind::NotFound,
                        "could not resolve app local data path",
                    )
                })?
                .join("salt.txt");
            app.handle()
                .plugin(Builder::with_argon2(&salt_path).build())?;

            let mut next_server_child = None;

            if !cfg!(debug_assertions) {
                let resource_dir = app.path().resource_dir().map_err(|_| {
                    io::Error::new(
                        io::ErrorKind::NotFound,
                        "could not resolve resource directory",
                    )
                })?;

                let child = spawn_bundled_next_server(resource_dir).map_err(io::Error::other)?;

                if !wait_for_local_server("127.0.0.1", 3008, Duration::from_secs(30)) {
                    return Err(io::Error::new(
                        io::ErrorKind::TimedOut,
                        "Timed out waiting for local Next server on 127.0.0.1:3008",
                    )
                    .into());
                }

                next_server_child = Some(child);
            }

            app.manage(NextServerState(Mutex::new(next_server_child)));

            let window_config = app.config().app.windows.first().ok_or_else(|| {
                io::Error::new(io::ErrorKind::NotFound, "No window configuration found")
            })?;

            tauri::WebviewWindowBuilder::from_config(app, window_config)?.build()?;

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
