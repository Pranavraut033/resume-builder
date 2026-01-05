/**
 * Seed Token Usage Data for Testing
 *
 * Creates sample token usage records to test the analytics dashboard
 * Run with: npx tsx scripts/seedTokenUsage.ts
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
  console.warn("Seeding token usage data...");

  // Import provider registry to get all available providers dynamically
  // This ensures the seed script stays in sync with registered providers
  const { getAvailableProviderTypes, getRegistry } = await import(
    "@/lib/llm/providers"
  );
  const registry = getRegistry();
  const providerTypes = getAvailableProviderTypes();
  const providers = providerTypes;

  // Build models map from registry metadata
  const models: Record<string, string[]> = {};
  for (const providerType of providerTypes) {
    const metadata = registry.getMetadata(providerType);
    models[providerType] = metadata?.defaultModels || [];
  }
  const purposes = [
    "NEW_JOB",
    "RESUME_GENERATION",
    "COVER_LETTER_GENERATION",
    "RESUME_PARSING",
    "JOB_PARSING",
    "RESUME_FIELD_IMPROVEMENT",
  ];

  // Create records for the last 30 days
  const records = [];
  const now = new Date();

  for (let day = 0; day < 30; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);

    // Create 5-10 records per day
    const recordsPerDay = Math.floor(Math.random() * 6) + 5;

    for (let i = 0; i < recordsPerDay; i++) {
      const provider = providers[Math.floor(Math.random() * providers.length)];
      const modelList = models[provider as keyof typeof models];
      const model = modelList[Math.floor(Math.random() * modelList.length)];
      const purpose = purposes[Math.floor(Math.random() * purposes.length)];

      // Generate realistic token counts based on purpose
      let inputTokens, outputTokens;
      switch (purpose) {
        case "RESUME_GENERATION":
          inputTokens = Math.floor(Math.random() * 2000) + 1000;
          outputTokens = Math.floor(Math.random() * 3000) + 2000;
          break;
        case "COVER_LETTER_GENERATION":
          inputTokens = Math.floor(Math.random() * 1500) + 800;
          outputTokens = Math.floor(Math.random() * 800) + 400;
          break;
        case "JOB_PARSING":
          inputTokens = Math.floor(Math.random() * 800) + 300;
          outputTokens = Math.floor(Math.random() * 500) + 200;
          break;
        case "RESUME_PARSING":
          inputTokens = Math.floor(Math.random() * 1200) + 500;
          outputTokens = Math.floor(Math.random() * 1000) + 500;
          break;
        case "RESUME_FIELD_IMPROVEMENT":
          inputTokens = Math.floor(Math.random() * 500) + 200;
          outputTokens = Math.floor(Math.random() * 300) + 150;
          break;
        default:
          inputTokens = Math.floor(Math.random() * 1000) + 500;
          outputTokens = Math.floor(Math.random() * 1000) + 500;
      }

      records.push({
        id: `test-${day}-${i}-${Date.now()}`,
        model,
        provider,
        inputTokens,
        outputTokens,
        purpose,
        requestId: `req-${day}-${i}`,
        createdAt: date.toISOString(),
      });
    }
  }

  // Insert all records
  console.warn(`Creating ${records.length} token usage records...`);

  for (const record of records) {
    await prisma.tokenUsage.create({
      data: record,
    });
  }

  console.warn(`✅ Successfully created ${records.length} token usage records`);
  console.warn("\nSummary:");
  console.warn(
    `- Date range: ${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString()} to ${now.toLocaleDateString()}`
  );
  console.warn(`- Providers: ${providers.join(", ")}`);
  console.warn(`- Total records: ${records.length}`);

  const totalInput = records.reduce((sum, r) => sum + r.inputTokens, 0);
  const totalOutput = records.reduce((sum, r) => sum + r.outputTokens, 0);
  console.warn(
    `- Total tokens: ${(totalInput + totalOutput).toLocaleString()} (${totalInput.toLocaleString()} input + ${totalOutput.toLocaleString()} output)`
  );

  const estimatedCost =
    (totalInput / 1000) * 0.0015 + (totalOutput / 1000) * 0.002;
  console.warn(`- Estimated cost: $${estimatedCost.toFixed(2)}`);
}

main()
  .catch((e) => {
    console.error("Error seeding data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
