import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import Database from "better-sqlite3";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create adapter with better-sqlite3
const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./prisma/dev.db";
const _db = new Database(dbPath);
const adapter = new PrismaBetterSqlite3(
  { url: `file:${dbPath}` },
  { timestampFormat: "unixepoch-ms" } // For backward compatibility
);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
