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
import {
  Button,
  Card,
  PageHeader,
  PageSection,
  SurfacePanel,
} from "@/components/ui";
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
    <div className="bg-agent-surface-lowest text-agent-on-surface min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <PageHeader
          title="Token Usage Analytics"
          description="Monitor and analyze your LLM token consumption across providers and models."
        />

        <PageSection title="Filters" className="mb-5">
          <SurfacePanel>
            <TokenFilters
              filters={filters}
              onFilterChange={handleFilterChange}
            />
          </SurfacePanel>
        </PageSection>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="border-agent-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
          </div>
        )}

        {!loading && aggregation && (
          <>
            {/* Summary Cards */}
            <TokenSummaryCards aggregation={aggregation} />

            {/* Time Series Chart */}
            {timeSeriesData.length > 0 && (
              <PageSection title="Token Usage Over Time">
                <SurfacePanel>
                  <TokenTimeSeriesChart data={timeSeriesData} />
                </SurfacePanel>
              </PageSection>
            )}

            {/* Breakdown Charts */}
            {(providerData.length > 0 || modelData.length > 0) && (
              <PageSection title="Usage Breakdown">
                <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {providerData.length > 0 && (
                    <Card className="p-6" padding="lg" variant="surface">
                      <h2 className="text-agent-on-surface mb-4 text-xl font-semibold tracking-tight">
                        Usage by Provider
                      </h2>
                      <TokenBreakdownCharts
                        data={providerData}
                        type="provider"
                      />
                    </Card>
                  )}
                  {modelData.length > 0 && (
                    <Card className="p-6" padding="lg" variant="surface">
                      <h2 className="text-agent-on-surface mb-4 text-xl font-semibold tracking-tight">
                        Usage by Model
                      </h2>
                      <TokenBreakdownCharts data={modelData} type="model" />
                    </Card>
                  )}
                </div>
              </PageSection>
            )}

            {/* Data Table */}
            {records.length > 0 && (
              <PageSection title="Token Usage Records">
                <SurfacePanel className="p-6" stack>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-agent-on-surface text-xl font-semibold tracking-tight">
                      Records overview
                    </div>
                    <div className="text-agent-on-surface-variant text-sm">
                      {totalRecords} total record{totalRecords !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <TokenUsageTable records={records} />

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="border-agent-outline-variant mt-4 flex items-center justify-between border-t pt-4">
                      <div className="text-agent-on-surface-variant text-sm">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </SurfacePanel>
              </PageSection>
            )}

            {records.length === 0 && (
              <Card className="p-12 text-center" variant="surface">
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
