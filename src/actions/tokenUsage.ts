"use server";

/**
 * Server Actions for Token Usage Tracking
 *
 * All database operations for token usage analytics including:
 * - Creating token usage records
 * - Querying with filters (date range, provider, model, purpose)
 * - Aggregations (total tokens, per-model, per-provider, per-day)
 */

import { prisma } from "@/lib/prisma";

export type TokenUsagePurpose =
  | "NEW_JOB"
  | "RESUME_FIELD_IMPROVEMENT"
  | "RESUME_GENERATION"
  | "COVER_LETTER_GENERATION"
  | "RESUME_PARSING"
  | "JOB_PARSING"
  | "ATS_ANALYSIS";

export type TokenUsageProvider =
  | "openai"
  | "gemini"
  | "grok"
  | "perplexity"
  | "ollama"
  | "anthropic";

export interface CreateTokenUsageData {
  model: string;
  provider: TokenUsageProvider;
  inputTokens: number;
  outputTokens: number;
  purpose: TokenUsagePurpose;
  requestId?: string;
}

export interface TokenUsageFilters {
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  provider?: TokenUsageProvider;
  model?: string;
  purpose?: TokenUsagePurpose;
}

export interface TokenUsageRecord {
  id: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  purpose: string;
  requestId: string | null;
  createdAt: string;
}

export interface TokenUsageAggregation {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalRequests: number;
}

export interface TokenUsageByProvider {
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestCount: number;
}

export interface TokenUsageByModel {
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestCount: number;
}

export interface TokenUsageByDay {
  date: string; // YYYY-MM-DD format
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestCount: number;
}

/**
 * Create a new token usage record
 */
export async function createTokenUsage(
  data: CreateTokenUsageData
): Promise<TokenUsageRecord> {
  const record = await prisma.tokenUsage.create({
    data: {
      model: data.model,
      provider: data.provider,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      purpose: data.purpose,
      requestId: data.requestId || null,
      createdAt: new Date().toISOString(),
    },
  });

  return {
    id: record.id,
    model: record.model,
    provider: record.provider,
    inputTokens: record.inputTokens,
    outputTokens: record.outputTokens,
    purpose: record.purpose,
    requestId: record.requestId,
    createdAt: record.createdAt,
  };
}

/**
 * Get token usage records with optional filters
 */
export async function getTokenUsageRecords(
  filters?: TokenUsageFilters,
  limit: number = 100,
  offset: number = 0
): Promise<TokenUsageRecord[]> {
  const where: Record<string, unknown> = {};

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      (where.createdAt as Record<string, unknown>).gte = filters.startDate;
    }
    if (filters.endDate) {
      (where.createdAt as Record<string, unknown>).lte = filters.endDate;
    }
  }

  if (filters?.provider) {
    where.provider = filters.provider;
  }

  if (filters?.model) {
    where.model = filters.model;
  }

  if (filters?.purpose) {
    where.purpose = filters.purpose;
  }

  const records = await prisma.tokenUsage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  return records.map((record) => ({
    id: record.id,
    model: record.model,
    provider: record.provider,
    inputTokens: record.inputTokens,
    outputTokens: record.outputTokens,
    purpose: record.purpose,
    requestId: record.requestId,
    createdAt: record.createdAt,
  }));
}

/**
 * Get total count of token usage records (for pagination)
 */
export async function getTokenUsageCount(
  filters?: TokenUsageFilters
): Promise<number> {
  const where: Record<string, unknown> = {};

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      (where.createdAt as Record<string, unknown>).gte = filters.startDate;
    }
    if (filters.endDate) {
      (where.createdAt as Record<string, unknown>).lte = filters.endDate;
    }
  }

  if (filters?.provider) {
    where.provider = filters.provider;
  }

  if (filters?.model) {
    where.model = filters.model;
  }

  if (filters?.purpose) {
    where.purpose = filters.purpose;
  }

  return await prisma.tokenUsage.count({ where });
}

/**
 * Get aggregated token usage statistics
 */
export async function getTokenUsageAggregation(
  filters?: TokenUsageFilters
): Promise<TokenUsageAggregation> {
  const where: Record<string, unknown> = {};

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      (where.createdAt as Record<string, unknown>).gte = filters.startDate;
    }
    if (filters.endDate) {
      (where.createdAt as Record<string, unknown>).lte = filters.endDate;
    }
  }

  if (filters?.provider) {
    where.provider = filters.provider;
  }

  if (filters?.model) {
    where.model = filters.model;
  }

  if (filters?.purpose) {
    where.purpose = filters.purpose;
  }

  const aggregation = await prisma.tokenUsage.aggregate({
    where,
    _sum: {
      inputTokens: true,
      outputTokens: true,
    },
    _count: true,
  });

  const totalInputTokens = aggregation._sum.inputTokens || 0;
  const totalOutputTokens = aggregation._sum.outputTokens || 0;

  return {
    totalInputTokens,
    totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    totalRequests: aggregation._count,
  };
}

/**
 * Get token usage grouped by provider
 */
export async function getTokenUsageByProvider(
  filters?: TokenUsageFilters
): Promise<TokenUsageByProvider[]> {
  const where: Record<string, unknown> = {};

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      (where.createdAt as Record<string, unknown>).gte = filters.startDate;
    }
    if (filters.endDate) {
      (where.createdAt as Record<string, unknown>).lte = filters.endDate;
    }
  }

  if (filters?.model) {
    where.model = filters.model;
  }

  if (filters?.purpose) {
    where.purpose = filters.purpose;
  }

  const groupedData = await prisma.tokenUsage.groupBy({
    by: ["provider"],
    where,
    _sum: {
      inputTokens: true,
      outputTokens: true,
    },
    _count: true,
  });

  return groupedData.map((item) => ({
    provider: item.provider,
    inputTokens: item._sum.inputTokens || 0,
    outputTokens: item._sum.outputTokens || 0,
    totalTokens: (item._sum.inputTokens || 0) + (item._sum.outputTokens || 0),
    requestCount: item._count,
  }));
}

/**
 * Get token usage grouped by model
 */
export async function getTokenUsageByModel(
  filters?: TokenUsageFilters
): Promise<TokenUsageByModel[]> {
  const where: Record<string, unknown> = {};

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      (where.createdAt as Record<string, unknown>).gte = filters.startDate;
    }
    if (filters.endDate) {
      (where.createdAt as Record<string, unknown>).lte = filters.endDate;
    }
  }

  if (filters?.provider) {
    where.provider = filters.provider;
  }

  if (filters?.purpose) {
    where.purpose = filters.purpose;
  }

  const groupedData = await prisma.tokenUsage.groupBy({
    by: ["model", "provider"],
    where,
    _sum: {
      inputTokens: true,
      outputTokens: true,
    },
    _count: true,
  });

  return groupedData.map((item) => ({
    model: item.model,
    provider: item.provider,
    inputTokens: item._sum.inputTokens || 0,
    outputTokens: item._sum.outputTokens || 0,
    totalTokens: (item._sum.inputTokens || 0) + (item._sum.outputTokens || 0),
    requestCount: item._count,
  }));
}

/**
 * Get token usage grouped by day (time series data)
 */
export async function getTokenUsageByDay(
  filters?: TokenUsageFilters
): Promise<TokenUsageByDay[]> {
  const where: Record<string, unknown> = {};

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      (where.createdAt as Record<string, unknown>).gte = filters.startDate;
    }
    if (filters.endDate) {
      (where.createdAt as Record<string, unknown>).lte = filters.endDate;
    }
  }

  if (filters?.provider) {
    where.provider = filters.provider;
  }

  if (filters?.model) {
    where.model = filters.model;
  }

  if (filters?.purpose) {
    where.purpose = filters.purpose;
  }

  // Fetch all records matching filters
  const records = await prisma.tokenUsage.findMany({
    where,
    select: {
      createdAt: true,
      inputTokens: true,
      outputTokens: true,
    },
  });

  // Group by date manually (SQLite doesn't support date truncation in groupBy)
  const groupedByDate: Record<string, TokenUsageByDay> = {};

  for (const record of records) {
    const date = record.createdAt.split("T")[0]; // Extract YYYY-MM-DD

    if (!groupedByDate[date]) {
      groupedByDate[date] = {
        date,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        requestCount: 0,
      };
    }

    groupedByDate[date].inputTokens += record.inputTokens;
    groupedByDate[date].outputTokens += record.outputTokens;
    groupedByDate[date].totalTokens += record.inputTokens + record.outputTokens;
    groupedByDate[date].requestCount += 1;
  }

  // Convert to array and sort by date
  return Object.values(groupedByDate).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

/**
 * Delete token usage records older than specified date
 */
export async function deleteTokenUsageOlderThan(
  beforeDate: string
): Promise<number> {
  const result = await prisma.tokenUsage.deleteMany({
    where: {
      createdAt: {
        lt: beforeDate,
      },
    },
  });

  return result.count;
}
