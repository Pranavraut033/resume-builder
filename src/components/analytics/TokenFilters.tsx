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
            className="text-agent-on-surface-variant block text-sm font-medium"
          >
            Start Date
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border-agent-outline-variant bg-agent-surface-low text-agent-on-surface focus:border-agent-primary focus:ring-agent-primary mt-1 block w-full rounded-xl border px-3 py-2 text-sm shadow-sm focus:ring-1 focus:outline-none"
          />
        </div>

        {/* End Date */}
        <div>
          <label
            htmlFor="endDate"
            className="text-agent-on-surface-variant block text-sm font-medium"
          >
            End Date
          </label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border-agent-outline-variant bg-agent-surface-low text-agent-on-surface focus:border-agent-primary focus:ring-agent-primary mt-1 block w-full rounded-xl border px-3 py-2 text-sm shadow-sm focus:ring-1 focus:outline-none"
          />
        </div>

        {/* Provider */}
        <div>
          <label
            htmlFor="provider"
            className="text-agent-on-surface-variant block text-sm font-medium"
          >
            Provider
          </label>
          <select
            id="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="border-agent-outline-variant bg-agent-surface-low text-agent-on-surface focus:border-agent-primary focus:ring-agent-primary mt-1 block w-full rounded-xl border px-3 py-2 text-sm shadow-sm focus:ring-1 focus:outline-none"
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
            className="text-agent-on-surface-variant block text-sm font-medium"
          >
            Purpose
          </label>
          <select
            id="purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="border-agent-outline-variant bg-agent-surface-low text-agent-on-surface focus:border-agent-primary focus:ring-agent-primary mt-1 block w-full rounded-xl border px-3 py-2 text-sm shadow-sm focus:ring-1 focus:outline-none"
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
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleApplyFilters} size="sm">
          Apply Filters
        </Button>
        {hasActiveFilters && (
          <Button variant="secondary" size="sm" onClick={handleClearFilters}>
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
