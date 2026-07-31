/**
 * Stdio transport entry point — what `claude_desktop_config.json` points at
 * directly. `./db` must be imported first: it flips the SQLite file to WAL
 * mode before `./server`'s transitive import of `@/lib/prisma` constructs
 * the module-level PrismaClient (see db.ts's doc comment).
 */
import "./db";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { buildServer } from "./server";

async function main() {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("[mcp/stdio] fatal error:", err);
  process.exit(1);
});
