/**
 * Token Filters Component
 * Provides filtering controls for token usage analytics
 */

import { useState } from "react";

import {
  TokenUsageFilters,
  TokenUsageProvider,
  TokenUsagePurpose,
} from "@/actions/tokenUsage";
import { Button } from "@/components/ui/Button";
import { getAvailableProviders } from "@/lib/llm/providers";

interface TokenFiltersProps {
  filters: TokenUsageFilters;
  onFilterChange: (filters: TokenUsageFilters) => void;
}

export default function TokenFilters({
  filters,
  onFilterChange,
}: TokenFiltersProps) {
  const [startDate, setStartDate] = useState(filters.startDate || "");
  const [endDate, setEndDate] = useState(filters.endDate || "");
  const [provider, setProvider] = useState(filters.provider || "");
  const [purpose, setPurpose] = useState(filters.purpose || "");

  const providers = getAvailableProviders().map((p) => p.type);
  const purposes = [
    "NEW_JOB",
    "RESUME_FIELD_IMPROVEMENT",
    "RESUME_GENERATION",
    "COVER_LETTER_GENERATION",
    "RESUME_PARSING",
    "JOB_PARSING",
  ];

  const handleApplyFilters = () => {
    const newFilters: TokenUsageFilters = {};

    if (startDate) {
      newFilters.startDate = new Date(startDate).toISOString();
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      newFilters.endDate = endDateTime.toISOString();
    }
    if (provider) {
      newFilters.provider = provider as TokenUsageProvider;
    }
    if (purpose) {
      newFilters.purpose = purpose as TokenUsagePurpose;
    }

    onFilterChange(newFilters);
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setProvider("");
    setPurpose("");
    onFilterChange({});
  };

  const hasActiveFilters = startDate || endDate || provider || purpose;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Start Date */}
        <div>
          <label
            htmlFor="startDate"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Start Date
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        {/* End Date */}
        <div>
          <label
            htmlFor="endDate"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            End Date
          </label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        {/* Provider */}
        <div>
          <label
            htmlFor="provider"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Provider
          </label>
          <select
            id="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">All Providers</option>
            {providers.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Purpose */}
        <div>
          <label
            htmlFor="purpose"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Purpose
          </label>
          <select
            id="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">All Purposes</option>
            {purposes.map((p) => (
              <option key={p} value={p}>
                {p
                  .split("_")
                  .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
                  .join(" ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleApplyFilters}>Apply Filters</Button>
        {hasActiveFilters && (
          <Button variant="secondary" onClick={handleClearFilters}>
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
