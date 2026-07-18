/**
 * Date Range Field Component
 * Provides input for date ranges with optional "Present" toggle
 */

"use client";

import React, { useState } from "react";

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
      <label
        className="block text-sm font-medium"
        style={{ color: "var(--color-agent-on-surface)" }}
      >
        {label}
      </label>

      <div className="space-y-3">
        {/* Start Date */}
        <div>
          <input
            type="date"
            value={toDateInputValue(startDate)}
            onChange={(e) =>
              onStartDateChange(fromDateInputValue(e.target.value))
            }
            placeholder="Start Date"
            className="w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:ring-2 focus:outline-none"
            style={{
              borderColor: "var(--color-agent-outline-variant)",
              background: "var(--color-agent-surface-lowest)",
              color: "var(--color-agent-on-surface)",
              caretColor: "var(--color-agent-primary)",
            }}
          />
        </div>

        {/* End Date or Present Toggle */}
        <div className="space-y-2">
          {(!showPresentOption || !isPresent) && (
            <input
              type="date"
              value={toDateInputValue(endDate)}
              onChange={(e) =>
                handleEndDateChange(fromDateInputValue(e.target.value))
              }
              placeholder="End Date"
              className="w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:ring-2 focus:outline-none"
              style={{
                borderColor: "var(--color-agent-outline-variant)",
                background: "var(--color-agent-surface-lowest)",
                color: "var(--color-agent-on-surface)",
                caretColor: "var(--color-agent-primary)",
              }}
            />
          )}

          {showPresentOption && (
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isPresent}
                onChange={(e) => handlePresentToggle(e.target.checked)}
                className="h-4 w-4 rounded"
                style={{ accentColor: "var(--color-agent-primary)" }}
              />
              <span
                className="text-sm"
                style={{ color: "var(--color-agent-on-surface)" }}
              >
                Currently working here
              </span>
            </label>
          )}
        </div>
      </div>

      {error ? (
        <p className="text-xs" style={{ color: "var(--color-agent-error)" }}>
          {error}
        </p>
      ) : (
        helpText && (
          <p
            className="text-xs"
            style={{ color: "var(--color-agent-on-surface-variant)" }}
          >
            {helpText}
          </p>
        )
      )}
    </div>
  );
}
