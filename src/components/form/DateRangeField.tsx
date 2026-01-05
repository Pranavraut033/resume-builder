/**
 * Date Range Field Component
 * Provides input for date ranges with optional "Present" toggle
 */

"use client";

import React, { useState } from "react";

interface DateRangeFieldProps {
  label: string;
  startDate?: string;
  endDate?: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  helpText?: string;
  /** When true, show the "Present" toggle; when false, always show end date input */
  showPresentOption?: boolean;
}

export function DateRangeField({
  label,
  startDate = "",
  endDate = "",
  onStartDateChange,
  onEndDateChange,
  helpText,
  showPresentOption = true,
}: DateRangeFieldProps) {
  const [isPresent, setIsPresent] = useState(
    showPresentOption ? !endDate : false
  );

  const handleEndDateChange = (value: string) => {
    if (isPresent) {
      setIsPresent(false);
    }
    onEndDateChange(value);
  };

  const handlePresentToggle = (checked: boolean) => {
    setIsPresent(checked);
    if (checked) {
      onEndDateChange("");
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      <div className="space-y-3">
        {/* Start Date */}
        <div>
          <input
            type="month"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            placeholder="Start Date"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* End Date or Present Toggle */}
        <div className="space-y-2">
          {(!showPresentOption || !isPresent) && (
            <input
              type="month"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              placeholder="End Date"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 transition-colors focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          )}

          {showPresentOption && (
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isPresent}
                onChange={(e) => handlePresentToggle(e.target.checked)}
                className="h-4 w-4 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Currently working here
              </span>
            </label>
          )}
        </div>
      </div>

      {helpText && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helpText}</p>
      )}
    </div>
  );
}
