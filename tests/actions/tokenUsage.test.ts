/**
 * Token Usage Action Tests
 *
 * Tests for token usage tracking server actions with real database integration.
 */

import type { PrismaClient } from "@prisma/client";
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  vi,
} from "vitest";

import {
  createTokenUsage,
  getTokenUsageRecords,
  getTokenUsageCount,
  getTokenUsageAggregation,
  getTokenUsageByProvider,
  getTokenUsageByModel,
  getTokenUsageByDay,
  deleteTokenUsageOlderThan,
  TokenUsagePurpose,
  TokenUsageProvider,
} from "@/actions/tokenUsage";

import { getGlobalTestDb, clearDatabase, closeGlobalTestDb } from "../utils/db";
import { createTokenUsage as createTokenUsageFactory } from "../utils/factories";

// Module-level reference so vi.mock factory closure can access it lazily
let _testPrisma: PrismaClient;

// Mock @/lib/prisma so server actions use the in-memory test database
vi.mock("@/lib/prisma", () => ({
  get prisma() {
    return _testPrisma;
  },
}));

describe("Token Usage Actions", () => {
  beforeAll(async () => {
    const { prisma } = await getGlobalTestDb();
    _testPrisma = prisma;
  });

  beforeEach(async () => {
    await clearDatabase(_testPrisma);
  });

  afterAll(async () => {
    await closeGlobalTestDb();
  });

  describe("createTokenUsage", () => {
    it("should create a token usage record", async () => {
      const { prisma } = await getGlobalTestDb();

      const data = {
        model: "gpt-4o-mini",
        provider: "openai" as TokenUsageProvider,
        inputTokens: 100,
        outputTokens: 50,
        purpose: "RESUME_GENERATION" as TokenUsagePurpose,
        requestId: "test-request-123",
      };

      const result = await createTokenUsage(data);

      expect(result).toBeDefined();
      expect(result.model).toBe(data.model);
      expect(result.provider).toBe(data.provider);
      expect(result.inputTokens).toBe(data.inputTokens);
      expect(result.outputTokens).toBe(data.outputTokens);
      expect(result.purpose).toBe(data.purpose);
      expect(result.requestId).toBe(data.requestId);
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();

      // Verify in database
      const dbRecord = await prisma.tokenUsage.findUnique({
        where: { id: result.id },
      });
      expect(dbRecord).toBeDefined();
      expect(dbRecord?.model).toBe(data.model);
    });

    it("should create token usage without requestId", async () => {
      const data = {
        model: "gemini-1.5-flash",
        provider: "gemini" as TokenUsageProvider,
        inputTokens: 200,
        outputTokens: 100,
        purpose: "COVER_LETTER_GENERATION" as TokenUsagePurpose,
      };

      const result = await createTokenUsage(data);

      expect(result.requestId).toBeNull();
    });

    it("should handle all valid purposes", async () => {
      const purposes: TokenUsagePurpose[] = [
        "NEW_JOB",
        "RESUME_FIELD_IMPROVEMENT",
        "RESUME_GENERATION",
        "COVER_LETTER_GENERATION",
        "RESUME_PARSING",
        "JOB_PARSING",
        "ATS_ANALYSIS",
      ];

      for (const purpose of purposes) {
        const data = {
          model: "gpt-4o",
          provider: "openai" as TokenUsageProvider,
          inputTokens: 100,
          outputTokens: 50,
          purpose,
        };

        const result = await createTokenUsage(data);
        expect(result.purpose).toBe(purpose);
      }
    });

    it("should handle all valid providers", async () => {
      const providers: TokenUsageProvider[] = [
        "openai",
        "gemini",
        "grok",
        "perplexity",
        "ollama",
        "anthropic",
      ];

      for (const provider of providers) {
        const data = {
          model: "test-model",
          provider,
          inputTokens: 100,
          outputTokens: 50,
          purpose: "RESUME_GENERATION" as TokenUsagePurpose,
        };

        const result = await createTokenUsage(data);
        expect(result.provider).toBe(provider);
      }
    });
  });

  describe("getTokenUsageRecords", () => {
    it("should return all records when no filters applied", async () => {
      const { prisma } = await getGlobalTestDb();

      // Create test records
      await createTokenUsageFactory(prisma, { model: "gpt-4o" });
      await createTokenUsageFactory(prisma, { model: "gemini-pro" });

      const records = await getTokenUsageRecords();

      expect(records).toHaveLength(2);
      expect(records[0].model).toBeDefined();
    });

    it("should filter by provider", async () => {
      const { prisma } = await getGlobalTestDb();

      await createTokenUsageFactory(prisma, { provider: "openai" });
      await createTokenUsageFactory(prisma, { provider: "gemini" });
      await createTokenUsageFactory(prisma, { provider: "openai" });

      const records = await getTokenUsageRecords({ provider: "openai" });

      expect(records).toHaveLength(2);
      expect(records.every((r) => r.provider === "openai")).toBe(true);
    });

    it("should filter by model", async () => {
      const { prisma } = await getGlobalTestDb();

      await createTokenUsageFactory(prisma, { model: "gpt-4o" });
      await createTokenUsageFactory(prisma, { model: "gpt-4o-mini" });
      await createTokenUsageFactory(prisma, { model: "gpt-4o" });

      const records = await getTokenUsageRecords({ model: "gpt-4o" });

      expect(records).toHaveLength(2);
      expect(records.every((r) => r.model === "gpt-4o")).toBe(true);
    });

    it("should filter by purpose", async () => {
      const { prisma } = await getGlobalTestDb();

      await createTokenUsageFactory(prisma, { purpose: "RESUME_GENERATION" });
      await createTokenUsageFactory(prisma, {
        purpose: "COVER_LETTER_GENERATION",
      });
      await createTokenUsageFactory(prisma, { purpose: "RESUME_GENERATION" });

      const records = await getTokenUsageRecords({
        purpose: "RESUME_GENERATION",
      });

      expect(records).toHaveLength(2);
      expect(records.every((r) => r.purpose === "RESUME_GENERATION")).toBe(
        true
      );
    });

    it("should filter by date range", async () => {
      const { prisma } = await getGlobalTestDb();
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      await createTokenUsageFactory(prisma, {
        createdAt: now.toISOString(),
      });

      const records = await getTokenUsageRecords({
        startDate: yesterday.toISOString(),
        endDate: tomorrow.toISOString(),
      });

      expect(records.length).toBeGreaterThanOrEqual(1);
    });

    it("should respect limit parameter", async () => {
      const { prisma } = await getGlobalTestDb();

      // Create 5 records
      for (let i = 0; i < 5; i++) {
        await createTokenUsageFactory(prisma);
      }

      const records = await getTokenUsageRecords(undefined, 2);

      expect(records).toHaveLength(2);
    });

    it("should respect offset parameter", async () => {
      const { prisma } = await getGlobalTestDb();

      // Create records with different models
      await createTokenUsageFactory(prisma, { model: "model-1" });
      await createTokenUsageFactory(prisma, { model: "model-2" });
      await createTokenUsageFactory(prisma, { model: "model-3" });

      const records = await getTokenUsageRecords(undefined, 10, 1);

      expect(records).toHaveLength(2);
    });

    it("should return records ordered by createdAt desc", async () => {
      const { prisma } = await getGlobalTestDb();

      const oldDate = new Date("2024-01-01").toISOString();
      const newDate = new Date("2024-12-01").toISOString();

      await createTokenUsageFactory(prisma, { createdAt: oldDate });
      await createTokenUsageFactory(prisma, { createdAt: newDate });

      const records = await getTokenUsageRecords();

      expect(new Date(records[0].createdAt).getTime()).toBeGreaterThan(
        new Date(records[1].createdAt).getTime()
      );
    });
  });

  describe("getTokenUsageCount", () => {
    it("should return total count of records", async () => {
      const { prisma } = await getGlobalTestDb();

      await createTokenUsageFactory(prisma);
      await createTokenUsageFactory(prisma);

      const count = await getTokenUsageCount();

      expect(count).toBe(2);
    });

    it("should respect filters", async () => {
      const { prisma } = await getGlobalTestDb();

      await createTokenUsageFactory(prisma, { provider: "openai" });
      await createTokenUsageFactory(prisma, { provider: "gemini" });

      const count = await getTokenUsageCount({ provider: "openai" });

      expect(count).toBe(1);
    });
  });

  describe("getTokenUsageAggregation", () => {
    it("should aggregate token usage statistics", async () => {
      const { prisma } = await getGlobalTestDb();

      await createTokenUsageFactory(prisma, {
        inputTokens: 100,
        outputTokens: 50,
      });
      await createTokenUsageFactory(prisma, {
        inputTokens: 200,
        outputTokens: 100,
      });

      const aggregation = await getTokenUsageAggregation();

      expect(aggregation.totalInputTokens).toBe(300);
      expect(aggregation.totalOutputTokens).toBe(150);
      expect(aggregation.totalTokens).toBe(450);
      expect(aggregation.totalRequests).toBe(2);
    });

    it("should return zero values when no records", async () => {
      const aggregation = await getTokenUsageAggregation();

      expect(aggregation.totalInputTokens).toBe(0);
      expect(aggregation.totalOutputTokens).toBe(0);
      expect(aggregation.totalTokens).toBe(0);
      expect(aggregation.totalRequests).toBe(0);
    });

    it("should respect filters", async () => {
      const { prisma } = await getGlobalTestDb();

      await createTokenUsageFactory(prisma, {
        provider: "openai",
        inputTokens: 100,
        outputTokens: 50,
      });
      await createTokenUsageFactory(prisma, {
        provider: "gemini",
        inputTokens: 200,
        outputTokens: 100,
      });

      const aggregation = await getTokenUsageAggregation({
        provider: "openai",
      });

      expect(aggregation.totalInputTokens).toBe(100);
      expect(aggregation.totalOutputTokens).toBe(50);
      expect(aggregation.totalRequests).toBe(1);
    });
  });

  describe("getTokenUsageByProvider", () => {
    it("should group usage by provider", async () => {
      const { prisma } = await getGlobalTestDb();

      await createTokenUsageFactory(prisma, {
        provider: "openai",
        inputTokens: 100,
        outputTokens: 50,
      });
      await createTokenUsageFactory(prisma, {
        provider: "openai",
        inputTokens: 200,
        outputTokens: 100,
      });
      await createTokenUsageFactory(prisma, {
        provider: "gemini",
        inputTokens: 150,
        outputTokens: 75,
      });

      const byProvider = await getTokenUsageByProvider();

      expect(byProvider).toHaveLength(2);

      const openaiData = byProvider.find((p) => p.provider === "openai");
      expect(openaiData).toBeDefined();
      expect(openaiData?.inputTokens).toBe(300);
      expect(openaiData?.outputTokens).toBe(150);
      expect(openaiData?.totalTokens).toBe(450);
      expect(openaiData?.requestCount).toBe(2);
    });
  });

  describe("getTokenUsageByModel", () => {
    it("should group usage by model and provider", async () => {
      const { prisma } = await getGlobalTestDb();

      await createTokenUsageFactory(prisma, {
        provider: "openai",
        model: "gpt-4o",
        inputTokens: 100,
        outputTokens: 50,
      });
      await createTokenUsageFactory(prisma, {
        provider: "openai",
        model: "gpt-4o-mini",
        inputTokens: 200,
        outputTokens: 100,
      });
      await createTokenUsageFactory(prisma, {
        provider: "gemini",
        model: "gemini-pro",
        inputTokens: 150,
        outputTokens: 75,
      });

      const byModel = await getTokenUsageByModel();

      expect(byModel).toHaveLength(3);

      const gpt4oData = byModel.find((m) => m.model === "gpt-4o");
      expect(gpt4oData).toBeDefined();
      expect(gpt4oData?.provider).toBe("openai");
      expect(gpt4oData?.inputTokens).toBe(100);
    });
  });

  describe("getTokenUsageByDay", () => {
    it("should group usage by day", async () => {
      const { prisma } = await getGlobalTestDb();

      const today = new Date().toISOString();
      const yesterday = new Date(Date.now() - 86400000).toISOString();

      await createTokenUsageFactory(prisma, {
        createdAt: today,
        inputTokens: 100,
        outputTokens: 50,
      });
      await createTokenUsageFactory(prisma, {
        createdAt: today,
        inputTokens: 200,
        outputTokens: 100,
      });
      await createTokenUsageFactory(prisma, {
        createdAt: yesterday,
        inputTokens: 150,
        outputTokens: 75,
      });

      const byDay = await getTokenUsageByDay();

      expect(byDay.length).toBeGreaterThanOrEqual(1);

      // Find today's data
      const todayStr = today.split("T")[0];
      const todayData = byDay.find((d) => d.date === todayStr);
      if (todayData) {
        expect(todayData.inputTokens).toBe(300);
        expect(todayData.outputTokens).toBe(150);
        expect(todayData.requestCount).toBe(2);
      }
    });

    it("should return empty array when no records", async () => {
      const byDay = await getTokenUsageByDay();
      expect(byDay).toEqual([]);
    });
  });

  describe("deleteTokenUsageOlderThan", () => {
    it("should delete records older than specified date", async () => {
      const { prisma } = await getGlobalTestDb();

      const oldDate = new Date("2024-01-01").toISOString();
      const recentDate = new Date("2024-12-01").toISOString();

      await createTokenUsageFactory(prisma, { createdAt: oldDate });
      await createTokenUsageFactory(prisma, { createdAt: recentDate });

      const deletedCount = await deleteTokenUsageOlderThan("2024-06-01");

      expect(deletedCount).toBe(1);

      const remaining = await prisma.tokenUsage.findMany();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].createdAt).toBe(recentDate);
    });

    it("should return 0 when no records to delete", async () => {
      const deletedCount = await deleteTokenUsageOlderThan("2024-01-01");
      expect(deletedCount).toBe(0);
    });
  });
});
