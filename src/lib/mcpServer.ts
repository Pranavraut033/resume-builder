/**
 * MCP Server Control
 *
 * Typed wrappers around the Tauri commands (`src-tauri/src/mcp_server.rs`)
 * that start/stop the bundled MCP server (`src/mcp/http.ts`) as a managed
 * child process, letting external MCP hosts (Claude Desktop, etc.) drive
 * this app's resume flows — see `docs/MCP.md`.
 *
 * This only makes sense in the desktop app: the web build has no Tauri
 * process to spawn, so every export here throws if called outside a Tauri
 * context (`isTauriContext()`).
 */

import { invoke } from "@tauri-apps/api/core";

import { isTauriContext } from "@/lib/keyStorage";

/**
 * Local port the bundled MCP HTTP transport listens on. Matches
 * `src/mcp/http.ts`'s own `PORT` env fallback and
 * `src-tauri/src/mcp_server.rs`'s `MCP_SERVER_PORT` constant, which is what
 * the spawned child is actually told to bind via `env("PORT", ...)` — this
 * is the single place the frontend needs it, for display purposes only.
 */
export const MCP_SERVER_PORT = 39217;

function assertTauriContext(): void {
  if (!isTauriContext()) {
    throw new Error(
      "The MCP server is only available in the desktop app, not the web build."
    );
  }
}

/**
 * Starts the MCP server if it isn't already running and waits for it to
 * accept connections. Returns the port it's listening on.
 */
export async function startMcpServer(): Promise<number> {
  assertTauriContext();
  return invoke<number>("mcp_server_start");
}

/** Stops the MCP server if running. No-op if it isn't. */
export async function stopMcpServer(): Promise<void> {
  assertTauriContext();
  return invoke<void>("mcp_server_stop");
}

/** Whether the MCP server is currently running. */
export async function getMcpServerStatus(): Promise<boolean> {
  assertTauriContext();
  return invoke<boolean>("mcp_server_status");
}

export type McpStdioCommand = {
  nodePath: string;
  stdioPath: string;
  /** Must be set as a `DATABASE_URL` env var on the spawned process — see
   * `mcp_server_stdio_command`'s Rust doc comment for why this can't just
   * be baked into an argument. */
  databaseUrl: string;
};

/**
 * This install's bundled Node binary + `stdio.js` path, so an external MCP
 * host (Claude Code, Claude Desktop) can be pointed directly at THIS app
 * install — no repo clone, no `npm run mcp`, no dependency on the user
 * having their own Node. Rejects in dev (`tauri dev` never bundles
 * `resources/next/mcp/`) — callers should fall back to the `npm run mcp`
 * dev-workflow instructions when this rejects.
 */
export async function getMcpStdioCommand(): Promise<McpStdioCommand> {
  assertTauriContext();
  const result = await invoke<{
    node_path: string;
    stdio_path: string;
    database_url: string;
  }>("mcp_server_stdio_command");
  return {
    nodePath: result.node_path,
    stdioPath: result.stdio_path,
    databaseUrl: result.database_url,
  };
}

/**
 * Prompts the user for a save location, then writes a self-contained MCP
 * plugin bundle — a `.plugin` zip containing `.claude-plugin/plugin.json` +
 * `.mcp.json` + `skills/resume-mcp/` (the Claude Code plugin layout) — there,
 * for any plugin-aware host (Claude Code, Cowork, ...) that installs from a
 * single downloaded archive rather than a hand-typed command. Returns the
 * written path, or `null` if the user cancelled the save dialog. Same
 * dev-build caveat as `getMcpStdioCommand()`: rejects when nothing is
 * bundled yet.
 */
export async function exportCoworkPlugin(): Promise<string | null> {
  assertTauriContext();
  const { save } = await import("@tauri-apps/plugin-dialog");
  const destPath = await save({
    defaultPath: "udaan.plugin",
    filters: [{ name: "Cowork plugin", extensions: ["plugin"] }],
  });
  if (!destPath) return null;
  return invoke<string>("export_cowork_plugin", { destPath });
}
