"use client";

import {
  DateFormat,
  formatDateRange,
  formatMonthYear,
  isValidDateRange,
} from "@/lib/date";

import { useInlineEdit } from "./InlineEditContext";
import { InlineField } from "./InlineField";

interface EditableDateRangeProps {
  startDate: string | null;
  endDate: string | null;
  dateFormat: DateFormat;
  onCommitStart: (value: string) => void;
  onCommitEnd: (value: string) => void;
  className?: string;
}

/** Start/end month-year pair, rendered as native date pickers when editable
 * and as a locale/format-aware string otherwise. Shared by experience,
 * project, and education entries. */
export function EditableDateRange({
  startDate,
  endDate,
  dateFormat,
  onCommitStart,
  onCommitEnd,
  className,
}: EditableDateRangeProps) {
  const { editable } = useInlineEdit();

  if (!editable) {
    return <>{formatDateRange(startDate, endDate, dateFormat)}</>;
  }

  const valid = isValidDateRange(startDate, endDate);

  return (
    <span className={className}>
      <InlineField
        value={startDate ?? ""}
        onChange={onCommitStart}
        fieldType="date"
        placeholder="Start"
        renderDisplay={(v) =>
          v ? (
            formatMonthYear(v, dateFormat)
          ) : (
            <span className="italic opacity-50">Start</span>
          )
        }
      />
      {" - "}
      <InlineField
        value={endDate ?? ""}
        onChange={onCommitEnd}
        fieldType="date"
        placeholder="Present"
        renderDisplay={(v) =>
          v ? (
            formatMonthYear(v, dateFormat)
          ) : (
            <span className="italic opacity-50">Present</span>
          )
        }
      />
      {!valid && (
        <span className="mt-0.5 block text-xs text-red-500">
          End date must be after start date
        </span>
      )}
    </span>
  );
}
