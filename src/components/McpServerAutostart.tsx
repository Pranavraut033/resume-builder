"use client";

import { useEffect, useRef } from "react";

import { isTauriContext } from "@/lib/keyStorage";
import { createLogger } from "@/lib/logger";
import { startMcpServer } from "@/lib/mcpServer";
import { useMcpServerStore } from "@/store/mcpServerStore";

const logger = createLogger("McpServerAutostart");

/**
 * Re-starts the MCP server on app load if the user previously turned it on
 * in Settings (`useMcpServerStore`'s persisted preference). The server
 * itself never auto-starts on the Rust side (`mcp_server::mcp_server_start`
 * is only ever called on demand) — this is what makes "opt-in, off by
 * default" mean "off until turned on", not "forgotten every restart".
 */
export function McpServerAutostart() {
  const enabled = useMcpServerStore((state) => state.enabled);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!enabled || !isTauriContext()) return;

    startMcpServer().catch((err) => {
      logger.error("Failed to auto-start MCP server", { err });
    });
  }, [enabled]);

  return null;
}
