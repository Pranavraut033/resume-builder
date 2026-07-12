use std::time::{Duration, Instant};

use base64::{engine::general_purpose::STANDARD, Engine};
use tauri::Manager;

/// Injected into every child browser webview as an initialization script.
///
/// Runs before page HTML is parsed on every top-level navigation, so it
/// persists across in-webview navigation (unlike a one-shot `eval` call).
///
/// What it does:
/// - Overrides `window.open()` to navigate the current frame instead of
///   requesting a new OS window (which Tauri would drop or open in Safari).
/// - Intercepts `<a target="_blank">` clicks for the same reason — some job
///   sites set `target` on anchors rather than calling `window.open` directly.
const NEW_WINDOW_REDIRECT_SCRIPT: &str = r#"
(function () {
  // Redirect window.open() to navigate the current frame.
  window.open = function (url) {
    if (url && url !== '' && url !== 'about:blank') {
      window.location.href = url;
    }
    return null;
  };

  // Intercept <a target="_blank"> clicks before the browser handles them.
  document.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el.tagName !== 'A') {
      el = el.parentElement;
    }
    if (el && el.getAttribute('target') === '_blank' && el.href) {
      e.preventDefault();
      window.location.href = el.href;
    }
  }, true);
})();
"#;

/// Creates a child browser webview inside the main window with the new-window
/// redirect script pre-installed.
///
/// Doing this on the Rust side (rather than via `new Webview()` from JS) lets
/// us attach an `initialization_script` that Tauri re-injects on every
/// top-level navigation — `eval()` from JS only runs once and is lost when the
/// page navigates away.
///
/// Evicts any surviving webview with the same label first (can happen after a
/// dev-mode hot-reload).
#[tauri::command]
pub fn browser_create_webview(
    app: tauri::AppHandle,
    label: String,
    url: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    // Evict stale webview from a previous JS context (e.g. page refresh).
    if let Some(stale) = app.get_webview(&label) {
        let _ = stale.close();
    }

    let window = app
        .get_window("main")
        .ok_or_else(|| "main window not found".to_string())?;

    let parsed_url: url::Url = url.parse().map_err(|e: url::ParseError| e.to_string())?;

    let builder = tauri::webview::WebviewBuilder::new(
        label.as_str(),
        tauri::WebviewUrl::External(parsed_url),
    )
    .initialization_script(NEW_WINDOW_REDIRECT_SCRIPT);

    window
        .add_child(
            builder,
            tauri::LogicalPosition::new(x, y),
            tauri::LogicalSize::new(width, height),
        )
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn browser_go_back(app: tauri::AppHandle, label: String) -> Result<(), String> {
    app.get_webview(&label)
        .ok_or_else(|| format!("webview '{label}' not found"))?
        .eval("history.back()")
        .map_err(|e| e.to_string())
}

/// Triggers `location.reload()` inside the child webview identified by `label`.
#[tauri::command]
pub fn browser_reload(app: tauri::AppHandle, label: String) -> Result<(), String> {
    app.get_webview(&label)
        .ok_or_else(|| format!("webview '{label}' not found"))?
        .eval("location.reload()")
        .map_err(|e| e.to_string())
}

/// Returns the current URL of the child webview identified by `label`.
/// Uses the Rust-side url() so it reflects the live URL after
/// in-page navigation, even for cross-origin single-page applications.
#[tauri::command]
pub fn browser_get_url(app: tauri::AppHandle, label: String) -> Result<String, String> {
    app.get_webview(&label)
        .ok_or_else(|| format!("webview '{label}' not found"))?
        .url()
        .map(|u| u.to_string())
        .map_err(|e| e.to_string())
}

/// Injected by `browser_extract_content` to read the rendered page's visible
/// text and hand it back to Rust.
///
/// `eval()` is fire-and-forget — Tauri has no API to read a return value
/// from evaluated JS without granting the page IPC access (which we don't
/// want for third-party origins like LinkedIn/Indeed/Glassdoor). Instead we
/// reuse the read-only `url()` accessor: this script base64-encodes the
/// extracted text into a `data:` URL and navigates the webview to it, and
/// `browser_extract_content` polls `url()` until it observes that
/// navigation and decodes the payload.
const EXTRACT_CONTENT_SCRIPT: &str = r#"
(function () {
  var text = document.body ? (document.body.innerText || document.body.textContent || '') : '';
  text = text.replace(/\s+/g, ' ').trim().slice(0, 50000);
  var b64 = btoa(unescape(encodeURIComponent(text)));
  location.replace('data:text/plain;base64,' + b64);
})();
"#;

const EXTRACTED_CONTENT_URL_PREFIX: &str = "data:text/plain;base64,";

/// Extracts the visible text content of the child webview identified by
/// `label`, then restores the URL it was showing before extraction.
///
/// Used instead of a server-side `fetch()` of the job posting URL: sites
/// like LinkedIn/Indeed/Glassdoor block automated server-side requests with
/// a 403, but the page already rendered inside the user's own webview is
/// not blocked — reading it directly sidesteps the block entirely.
#[tauri::command]
pub fn browser_extract_content(app: tauri::AppHandle, label: String) -> Result<String, String> {
    let webview = app
        .get_webview(&label)
        .ok_or_else(|| format!("webview '{label}' not found"))?;

    let original_url = webview.url().map_err(|e| e.to_string())?;

    webview
        .eval(EXTRACT_CONTENT_SCRIPT)
        .map_err(|e| e.to_string())?;

    let deadline = Instant::now() + Duration::from_secs(5);
    let encoded = loop {
        let current = webview.url().map_err(|e| e.to_string())?.to_string();
        if let Some(encoded) = current.strip_prefix(EXTRACTED_CONTENT_URL_PREFIX) {
            break encoded.to_string();
        }
        if Instant::now() >= deadline {
            return Err("Timed out extracting page content".to_string());
        }
        std::thread::sleep(Duration::from_millis(50));
    };

    // Restore the page the user was looking at, regardless of decode outcome.
    let _ = webview.navigate(original_url);

    let bytes = STANDARD
        .decode(encoded)
        .map_err(|e| format!("Failed to decode extracted content: {e}"))?;
    String::from_utf8(bytes).map_err(|e| format!("Extracted content was not valid UTF-8: {e}"))
}

/// Repositions and resizes a child webview in a single Rust call.
///
/// Prefer this over the JS-side `setPosition` + `setSize` pair which issue two
/// independent IPC round-trips.  On macOS the WKWebView layout engine can see
/// both partial frames simultaneously, causing the view to end up at the wrong
/// position or size.  Doing both mutations here serialises them on the Tauri
/// main-thread dispatcher, eliminating the race.
#[tauri::command]
pub fn browser_set_bounds(
    app: tauri::AppHandle,
    label: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    let webview = app
        .get_webview(&label)
        .ok_or_else(|| format!("webview '{label}' not found"))?;
    webview
        .set_position(tauri::LogicalPosition::new(x, y))
        .map_err(|e| e.to_string())?;
    webview
        .set_size(tauri::LogicalSize::new(width, height))
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Closes every child webview whose label is not "main" in a single
/// synchronous Rust call.  Use this before route transitions and on
/// page unload — it is reliable where fire-and-forget async close() calls
/// from JS can race with the unload / navigation.
#[tauri::command]
pub fn browser_destroy_all(app: tauri::AppHandle) {
    for (label, webview) in app.webviews() {
        if label != "main" {
            let _ = webview.close();
        }
    }
}
