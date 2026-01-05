/**
 * Clean Token Usage Seed Data
 *
 * Removes all test token usage records created by the seed script
 * Run with: npx tsx scripts/cleanTokenUsage.ts
 */

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./prisma/dev.db";
const adapter = new PrismaBetterSqlite3(
  { url: `file:${dbPath}` },
  { timestampFormat: "unixepoch-ms" }
);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.warn("Cleaning test token usage data...");

  // Delete all records with IDs starting with "test-"
  const result = await prisma.tokenUsage.deleteMany({
    where: {
      id: {
        startsWith: "test-",
      },
    },
  });

  console.warn(
    `✅ Successfully deleted ${result.count} test token usage records`
  );
}

main()
  .catch((e) => {
    console.error("Error cleaning data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
