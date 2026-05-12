"use server";

/**
 * Server Actions for Token Usage Tracking
 *
 * All database operations for token usage analytics including:
 * - Creating token usage records
 * - Querying with filters (date range, provider, model, purpose)
 * - Aggregations (total tokens, per-model, per-provider, per-day)
 */

import { TokenUsage } from "@prisma/client";

import { PromptPurpose } from "@/lib/llm/prompts";
import { prisma } from "@/lib/prisma";
import { ProviderType } from "@/types/llm";

export interface LLMUsageInfo {
  // Core — all providers
  promptTokens: number; // OpenAI: prompt_tokens / Anthropic: input_tokens
  completionTokens: number; // OpenAI: completion_tokens / Anthropic: output_tokens
  totalTokens?: number; // OpenAI: total_tokens

  // Cache — Anthropic: cache_read_input_tokens / cache_creation_input_tokens
  //          OpenAI: prompt_tokens_details.cached_tokens
  cacheReadTokens?: number;
  cacheCreationTokens?: number;

  // Reasoning — OpenAI o-series: completion_tokens_details.reasoning_tokens
  reasoningTokens?: number;

  // Cost
  costUSD?: number;

  // Metadata
  provider: ProviderType;
  model: string;
  purpose: PromptPurpose;
  requestId?: string;
  durationMs?: number;
}

export interface TokenUsageFilters {
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  provider?: ProviderType;
  model?: string;
  purpose?: PromptPurpose;
}

export interface TokenUsageAggregation {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalRequests: number;
}

export interface TokenUsageByProvider {
  provider: ProviderType;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestCount: number;
}

export interface TokenUsageByModel {
  model: string;
  provider: ProviderType;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestCount: number;
}

export interface TokenUsageByDay {
  date: string; // YYYY-MM-DD format
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestCount: number;
}

/**
 * Create a new token usage record
 */
export async function createTokenUsage(
  data: LLMUsageInfo
): Promise<TokenUsage> {
  return prisma.tokenUsage.create({
    data: {
      ...data,
      totalTokens:
        data.totalTokens || data.promptTokens + data.completionTokens || 0,
      costMicrocents: data.costUSD ? data.costUSD * 1_000_000 : undefined, // Store as cents to avoid floating point issues
    },
  });
}

/**
 * Get token usage records with optional filters
 */
export async function getTokenUsageRecords(
  filters?: TokenUsageFilters,
  limit: number = 100,
  offset: number = 0
): Promise<TokenUsage[]> {
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

  return records;
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
      promptTokens: true,
      completionTokens: true,
    },
    _count: true,
  });

  const totalInputTokens = aggregation._sum.promptTokens || 0;
  const totalOutputTokens = aggregation._sum.completionTokens || 0;

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
      promptTokens: true,
      completionTokens: true,
    },
    _count: true,
  });

  return groupedData.map((item) => ({
    provider: ProviderType[item.provider as keyof typeof ProviderType],
    promptTokens: item._sum.promptTokens || 0,
    completionTokens: item._sum.completionTokens || 0,
    totalTokens:
      (item._sum.promptTokens || 0) + (item._sum.completionTokens || 0),
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
      promptTokens: true,
      completionTokens: true,
    },
    _count: true,
  });

  return groupedData.map((item) => ({
    model: item.model,
    provider: ProviderType[item.provider as keyof typeof ProviderType],
    promptTokens: item._sum.promptTokens || 0,
    completionTokens: item._sum.completionTokens || 0,
    totalTokens:
      (item._sum.promptTokens || 0) + (item._sum.completionTokens || 0),
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
      promptTokens: true,
      completionTokens: true,
    },
  });

  // Group by date manually (SQLite doesn't support date truncation in groupBy)
  const groupedByDate: Record<string, TokenUsageByDay> = {};

  for (const record of records) {
    const date = record.createdAt.toISOString().split("T")[0]; // Extract YYYY-MM-DD

    if (!groupedByDate[date]) {
      groupedByDate[date] = {
        date,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        requestCount: 0,
      };
    }

    groupedByDate[date].promptTokens += record.promptTokens;
    groupedByDate[date].completionTokens += record.completionTokens;
    groupedByDate[date].totalTokens +=
      record.promptTokens + record.completionTokens;
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
