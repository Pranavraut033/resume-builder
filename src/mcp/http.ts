/**
 * Streamable HTTP transport entry point, for hosts that want a URL instead
 * of a stdio subprocess. `./db` must be imported first — see stdio.ts/db.ts.
 *
 * Security (non-negotiable): this is a DB-mutating local port, reachable by
 * any page's JavaScript via fetch() unless guarded. Binding to 127.0.0.1
 * keeps it off the network; rejecting any request whose Origin isn't
 * localhost-derived (or absent, e.g. curl/MCP Inspector) closes the
 * DNS-rebinding/CSRF gap bind-only leaves open.
 */
import { randomUUID } from "node:crypto";
import http from "node:http";

import "./db";

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { buildServer } from "./server";

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT) || 39217;

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  try {
    const { hostname } = new URL(origin);
    return ["localhost", "127.0.0.1", "::1"].includes(hostname);
  } catch {
    return false;
  }
}

async function main() {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  await server.connect(transport);

  const httpServer = http.createServer((req, res) => {
    if (!isAllowedOrigin(req.headers.origin)) {
      res
        .writeHead(403, { "Content-Type": "text/plain" })
        .end("Origin not allowed");
      return;
    }
    void transport.handleRequest(req, res);
  });

  httpServer.listen(PORT, HOST, () => {
    console.error(`[mcp/http] listening on http://${HOST}:${PORT}`);
  });
}

main().catch((err) => {
  console.error("[mcp/http] fatal error:", err);
  process.exit(1);
});
