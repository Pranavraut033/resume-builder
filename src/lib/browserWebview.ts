/**
 * Browser Webview Manager
 *
 * Typed wrappers around the Tauri @tauri-apps/api/webview API for managing
 * inline child webviews used in the Find Jobs browser panel.
 *
 * - Creation, show/hide, resize via the TypeScript Webview class
 * - Back navigation, reload, and URL capture via custom Rust commands
 *   (browser_go_back, browser_reload, browser_get_url) because those
 *   operations act on the child webview from the Rust side, which is
 *   reliable regardless of cross-origin content.
 */

import { invoke } from "@tauri-apps/api/core";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import { Webview } from "@tauri-apps/api/webview";
import { getCurrentWindow } from "@tauri-apps/api/window";

export interface WebviewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Creates a new child webview inside the main Tauri window at the given
 * logical-pixel bounds, loading the specified URL.
 *
 * Closes any surviving webview with the same label first — child webviews
 * are OS-level views that outlive JS context resets (e.g. page refresh in
 * Tauri dev mode), so we must evict stale ones before re-creating.
 *
 * Awaits the `tauri://created` event so that every subsequent call
 * (hide, setPosition, close …) is guaranteed to find the webview on the
 * Rust side.  Without this the constructor fires its IPC message and returns
 * immediately, causing hide/close to fail silently before Rust registers the
 * view.
 */
export async function createBrowserWebview(
  label: string,
  url: string,
  bounds: WebviewBounds
): Promise<Webview> {
  // Create via Rust so we can attach an initialization_script that persists
  // across in-webview navigation.  The script intercepts window.open() calls
  // and target="_blank" anchor clicks, redirecting them to the current frame
  // instead of trying to spawn a new OS window that Tauri would drop.
  // Stale-webview eviction is also handled on the Rust side.
  await invoke("browser_create_webview", {
    label,
    url,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  });

  // The Rust command returns only after add_child() completes, so the webview
  // is guaranteed to exist when we look it up here.
  const webview = await Webview.getByLabel(label);
  if (!webview) {
    throw new Error(`Webview '${label}' not found after creation`);
  }

  return webview;
}

/** Makes a hidden webview visible. */
export async function showBrowserWebview(webview: Webview): Promise<void> {
  await webview.show();
}

/** Hides a visible webview without destroying it (preserves navigation state). */
export async function hideBrowserWebview(webview: Webview): Promise<void> {
  await webview.hide();
}

/**
 * Logical position used to park inactive webviews off-screen.
 * hide() is unreliable on child Webviews (not WebviewWindow) on some
 * platforms — moving off-screen is the safe alternative.
 */
export const OFFSCREEN_POSITION = new LogicalPosition(-99999, -99999);

/** Parks a webview off-screen without hiding it (hide() is unreliable on child Webviews). */
export async function parkBrowserWebview(webview: Webview): Promise<void> {
  await webview.setPosition(OFFSCREEN_POSITION);
}

/**
 * Moves a parked webview back to its container bounds.
 *
 * Uses a single Rust-side IPC call (`browser_set_bounds`) instead of two
 * parallel JS calls.  On macOS, firing `setPosition` and `setSize` as separate
 * concurrent IPC messages can race in the WKWebView layout engine, leaving the
 * view stuck at the wrong frame.  The Rust command serialises both mutations.
 */
export async function unparkBrowserWebview(
  webview: Webview,
  bounds: WebviewBounds
): Promise<void> {
  await invoke("browser_set_bounds", {
    label: webview.label,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  });
}

/**
 * Converts a DOM element's getBoundingClientRect() into WebviewBounds that
 * Tauri child webviews understand.
 *
 * The mismatch: getBoundingClientRect() is relative to the viewport (content
 * area), but LogicalPosition for child Webviews is relative to the outer OS
 * window origin — which includes the native title bar on macOS/Windows.
 * Without this correction the webview is placed ~title-bar-height pixels too
 * high, overlapping chrome elements (tabs, toolbar) above the container.
 *
 * Fix: compute the chrome offset as
 *   (innerPosition − outerPosition) / scaleFactor
 * and add it to the rect coordinates.
 */
export async function domRectToWebviewBounds(
  rect: DOMRect
): Promise<WebviewBounds> {
  const win = getCurrentWindow();
  const [outerPos, innerPos, scaleFactor] = await Promise.all([
    win.outerPosition(), // OS window frame top-left in physical pixels
    win.innerPosition(), // content area top-left in physical pixels
    win.scaleFactor(),
  ]);
  const chromeOffsetX = (innerPos.x - outerPos.x) / scaleFactor;
  const chromeOffsetY = (innerPos.y - outerPos.y) / scaleFactor;
  return {
    x: rect.left + chromeOffsetX,
    y: rect.top + chromeOffsetY + 32, // Additional offset to account for the custom toolbar height
    width: rect.width,
    height: rect.height,
  };
}

/** Permanently closes a webview and frees its resources. */
export async function destroyBrowserWebview(webview: Webview): Promise<void> {
  await webview.close();
}

/**
 * Repositions and resizes a webview to match new container bounds.
 * Uses the Rust-side `browser_set_bounds` so both mutations are serialised
 * on the Tauri dispatcher, avoiding the parallel-IPC race on macOS.
 */
export async function updateWebviewBounds(
  webview: Webview,
  bounds: WebviewBounds
): Promise<void> {
  await invoke("browser_set_bounds", {
    label: webview.label,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  });
}

/**
 * Returns the current URL of the webview (including after in-page navigation).
 * Uses a Rust command so it works even for cross-origin content.
 */
export async function getBrowserWebviewUrl(label: string): Promise<string> {
  return invoke<string>("browser_get_url", { label });
}

/**
 * Triggers history.back() inside the webview via a Rust eval command.
 */
export async function goBackBrowserWebview(label: string): Promise<void> {
  return invoke<void>("browser_go_back", { label });
}

/**
 * Triggers location.reload() inside the webview via a Rust eval command.
 */
export async function reloadBrowserWebview(label: string): Promise<void> {
  return invoke<void>("browser_reload", { label });
}

/**
 * Destroys ALL non-main webviews via a single synchronous Rust command.
 * Use this before route transitions and on beforeunload — it is reliable
 * where fire-and-forget async close() calls can race with unload/navigation.
 */
export async function destroyAllBrowserWebviews(): Promise<void> {
  return invoke<void>("browser_destroy_all");
}
