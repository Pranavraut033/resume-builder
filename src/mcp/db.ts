/**
 * MCP-server DB bootstrap.
 *
 * Import this module FIRST, before anything that transitively imports
 * `@/lib/prisma` (i.e. before `./server`) — it resolves `DATABASE_URL` and
 * flips the SQLite file to WAL mode before `src/lib/prisma.ts`'s
 * module-level `PrismaClient` opens its own connection to the same file.
 *
 * WAL is a setting persisted in the SQLite file header, not a per-connection
 * flag — once any connection enables it, every later connection to that file
 * (this process's own Prisma client, and the separate Next.js dev/Tauri
 * server process that may be running against the same `app.db`/`dev.db`
 * concurrently) opens it already in WAL mode. Enabling it here, before this
 * process's Prisma client exists, is therefore enough; nothing needs to
 * "hold open" a WAL connection afterward.
 */
import Database from "better-sqlite3";
import { config as loadDotenv } from "dotenv";

// Nothing else loads .env at MCP-server runtime (only the Prisma CLI does,
// via its own config, which this process doesn't go through) — load it
// ourselves before reading DATABASE_URL below. `quiet: true` matters more
// than it looks: this process's stdout is the MCP JSON-RPC stream when run
// under the stdio transport (Claude Code/Desktop spawn `node stdio.js`
// directly, with no DATABASE_URL set, so this branch always runs for them)
// — dotenv's default "injected env (N) from .env" banner on stdout corrupts
// that framing and makes every client-side connection attempt fail.
if (!process.env.DATABASE_URL) {
  loadDotenv({ quiet: true });
}

// Matches src/lib/prisma.ts's own fallback convention (`./prisma/dev.db`)
// and the repo-root `.env`'s `DATABASE_URL="file:dev.db"`.
const DEFAULT_DB_PATH = "./prisma/dev.db";

export const dbPath = (process.env.DATABASE_URL ?? `file:${DEFAULT_DB_PATH}`)
  .trim()
  .replace(/^file:/, "");

// Make sure src/lib/prisma.ts (and anything else reading the env var)
// resolves to the exact same file this bootstrap just touched.
process.env.DATABASE_URL = `file:${dbPath}`;

const bootstrapConnection = new Database(dbPath);
bootstrapConnection.pragma("journal_mode = WAL");
bootstrapConnection.close();
