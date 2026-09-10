/**
 * Date Range Field Component
 * Provides input for date ranges with optional "Present" toggle
 */

"use client";

import { useState } from "react";

import { fromDateInputValue, toDateInputValue } from "@/lib/date";

interface DateRangeFieldProps {
  label: string;
  startDate?: string;
  endDate?: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  helpText?: string;
  /** Validation message (e.g. end before start); rendered in place of helpText. */
  error?: string;
  /** When true, show the "Present" toggle; when false, always show end date input */
  showPresentOption?: boolean;
}

const dateInputClasses =
  "w-full rounded-lg border border-agent-outline-variant bg-agent-surface-lowest px-3 py-1.5 text-sm text-agent-on-surface caret-agent-primary transition-colors focus:ring-2 focus:ring-agent-primary focus:outline-none";

export function DateRangeField({
  label,
  startDate = "",
  endDate = "",
  onStartDateChange,
  onEndDateChange,
  helpText,
  error,
  showPresentOption = true,
}: DateRangeFieldProps) {
  const [isPresent, setIsPresent] = useState(
    showPresentOption ? !endDate : false
  );

  const handlePresentToggle = (checked: boolean) => {
    setIsPresent(checked);
    if (checked) {
      onEndDateChange("");
    }
  };

  return (
    <div className="space-y-1">
      <label className="text-agent-on-surface block text-sm font-medium">
        {label}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <input
          type="date"
          value={toDateInputValue(startDate)}
          onChange={(e) =>
            onStartDateChange(fromDateInputValue(e.target.value))
          }
          placeholder="Start Date"
          className={dateInputClasses}
        />

        {showPresentOption && isPresent ? (
          <label className="border-agent-outline-variant bg-agent-surface-lowest flex h-[34px] cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm">
            <input
              type="checkbox"
              checked={isPresent}
              onChange={(e) => handlePresentToggle(e.target.checked)}
              className="accent-agent-primary h-4 w-4 rounded"
            />
            <span className="text-agent-on-surface truncate">
              Currently working here
            </span>
          </label>
        ) : (
          <input
            type="date"
            value={toDateInputValue(endDate)}
            onChange={(e) =>
              onEndDateChange(fromDateInputValue(e.target.value))
            }
            placeholder="End Date"
            className={dateInputClasses}
          />
        )}
      </div>

      {showPresentOption && !isPresent && (
        <label className="text-agent-on-surface-variant flex cursor-pointer items-center gap-2 pt-0.5 text-xs">
          <input
            type="checkbox"
            checked={isPresent}
            onChange={(e) => handlePresentToggle(e.target.checked)}
            className="accent-agent-primary h-3.5 w-3.5 rounded"
          />
          Currently working here
        </label>
      )}

      {error ? (
        <p className="text-agent-error text-xs">{error}</p>
      ) : (
        helpText && (
          <p className="text-agent-on-surface-variant text-xs">{helpText}</p>
        )
      )}
    </div>
  );
}
