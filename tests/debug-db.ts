/**
 * Debug script to test database initialization
 */

import { getGlobalTestDb, closeGlobalTestDb } from "./utils/db";

async function main() {
  try {
    console.log("Setting up test database...");
    const { prisma } = await getGlobalTestDb();

    console.log("Testing basic query...");
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log("Basic query result:", result);

    console.log("Listing tables...");
    const tables =
      await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`;
    console.log("Tables:", tables);

    console.log("Creating token usage record...");
    const tokenUsage = await prisma.tokenUsage.create({
      data: {
        model: "test-model",
        provider: "openai",
        inputTokens: 100,
        outputTokens: 50,
        purpose: "RESUME_GENERATION",
        createdAt: new Date().toISOString(),
      },
    });
    console.log("Token usage created:", tokenUsage);

    await closeGlobalTestDb();
    console.log("Success!");
  } catch (error) {
    console.error("Error:", error);
    await closeGlobalTestDb();
    process.exit(1);
  }
}

main();
