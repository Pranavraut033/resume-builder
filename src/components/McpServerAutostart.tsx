"use client";

import { useEffect, useRef } from "react";

import { isTauriContext } from "@/lib/keyStorage";
import { createLogger } from "@/lib/logger";
import { startMcpServer } from "@/lib/mcpServer";
import { useMcpServerStore } from "@/store/mcpServerStore";
import { useNotificationStore } from "@/store/notificationStore";

const logger = createLogger("McpServerAutostart");

/**
 * Re-starts the MCP server on app load if the user previously turned it on
 * in Settings (`useMcpServerStore`'s persisted preference). The server
 * itself never auto-starts on the Rust side (`mcp_server::mcp_server_start`
 * is only ever called on demand) — this is what makes "opt-in, off by
 * default" mean "off until turned on", not "forgotten every restart".
 *
 * A failed autostart used to be silent — logged, then dropped — which is
 * why "MCP got disabled" reports were really "autostart failed and nobody
 * knew". A notification here turns that into something the user can act on
 * (Settings still owns retry, via the same toggle).
 */
export function McpServerAutostart() {
  const enabled = useMcpServerStore((state) => state.enabled);
  const notify = useNotificationStore((state) => state.notify);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!enabled || !isTauriContext()) return;

    startMcpServer().catch((err) => {
      logger.error("Failed to auto-start MCP server", { err });
      notify({
        title: "MCP server didn't start",
        description: `${err instanceof Error ? err.message : "Unknown error"} Turn it back on from Settings.`,
        status: "error",
        transient: false,
      });
    });
  }, [enabled, notify]);

  return null;
}
