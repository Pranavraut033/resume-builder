"use client";

/**
 * Token Analytics Dashboard
 *
 * Displays comprehensive token usage analytics including:
 * - Summary cards (total tokens, requests, providers)
 * - Time-series chart (tokens per day)
 * - Breakdown charts (by provider, by model)
 * - Filterable data table
 */

import { useState, useEffect, useCallback } from "react";

import {
  getTokenUsageAggregation,
  getTokenUsageByDay,
  getTokenUsageByProvider,
  getTokenUsageByModel,
  getTokenUsageRecords,
  getTokenUsageCount,
  TokenUsageFilters,
  TokenUsageAggregation,
  TokenUsageByDay,
  TokenUsageByProvider,
  TokenUsageByModel,
  TokenUsageRecord,
} from "@/actions/tokenUsage";
import TokenBreakdownCharts from "@/components/analytics/TokenBreakdownCharts";
import TokenFilters from "@/components/analytics/TokenFilters";
import TokenSummaryCards from "@/components/analytics/TokenSummaryCards";
import TokenTimeSeriesChart from "@/components/analytics/TokenTimeSeriesChart";
import TokenUsageTable from "@/components/analytics/TokenUsageTable";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createLogger } from "@/lib/logger";

const logger = createLogger("TokenAnalytics");

export default function TokenAnalyticsPage() {
  const [filters, setFilters] = useState<TokenUsageFilters>({});
  const [loading, setLoading] = useState(true);
  const [aggregation, setAggregation] = useState<TokenUsageAggregation | null>(
    null
  );
  const [timeSeriesData, setTimeSeriesData] = useState<TokenUsageByDay[]>([]);
  const [providerData, setProviderData] = useState<TokenUsageByProvider[]>([]);
  const [modelData, setModelData] = useState<TokenUsageByModel[]>([]);
  const [records, setRecords] = useState<TokenUsageRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 50;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [aggData, timeData, provData, modData, recordsData, count] =
        await Promise.all([
          getTokenUsageAggregation(filters),
          getTokenUsageByDay(filters),
          getTokenUsageByProvider(filters),
          getTokenUsageByModel(filters),
          getTokenUsageRecords(
            filters,
            recordsPerPage,
            (currentPage - 1) * recordsPerPage
          ),
          getTokenUsageCount(filters),
        ]);

      setAggregation(aggData);
      setTimeSeriesData(timeData);
      setProviderData(provData);
      setModelData(modData);
      setRecords(recordsData);
      setTotalRecords(count);

      logger.debug("Analytics data loaded", {
        aggregation: aggData,
        timeSeriesCount: timeData.length,
        providerCount: provData.length,
        modelCount: modData.length,
        recordsCount: recordsData.length,
      });
    } catch (error) {
      logger.error("Failed to fetch token analytics data", { error });
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage, recordsPerPage]);

  // Fetch all data when filters change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleFilterChange(newFilters: TokenUsageFilters) {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page on filter change
  }

  function handlePageChange(page: number) {
    setCurrentPage(page);
  }

  const totalPages = Math.ceil(totalRecords / recordsPerPage);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Token Usage Analytics
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Monitor and analyze your LLM token consumption across providers and
            models.
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6 p-4">
          <TokenFilters filters={filters} onFilterChange={handleFilterChange} />
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          </div>
        )}

        {!loading && aggregation && (
          <>
            {/* Summary Cards */}
            <TokenSummaryCards aggregation={aggregation} />

            {/* Time Series Chart */}
            {timeSeriesData.length > 0 && (
              <Card className="mb-6 p-6">
                <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                  Token Usage Over Time
                </h2>
                <TokenTimeSeriesChart data={timeSeriesData} />
              </Card>
            )}

            {/* Breakdown Charts */}
            {(providerData.length > 0 || modelData.length > 0) && (
              <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {providerData.length > 0 && (
                  <Card className="p-6">
                    <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                      Usage by Provider
                    </h2>
                    <TokenBreakdownCharts data={providerData} type="provider" />
                  </Card>
                )}
                {modelData.length > 0 && (
                  <Card className="p-6">
                    <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                      Usage by Model
                    </h2>
                    <TokenBreakdownCharts data={modelData} type="model" />
                  </Card>
                )}
              </div>
            )}

            {/* Data Table */}
            {records.length > 0 && (
              <Card className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Token Usage Records
                  </h2>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {totalRecords} total record{totalRecords !== 1 ? "s" : ""}
                  </div>
                </div>
                <TokenUsageTable records={records} />

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {records.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  No token usage data found. Start using the application to see
                  analytics.
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
