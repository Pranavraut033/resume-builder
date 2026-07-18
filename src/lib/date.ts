/**
 * Formatting/validation for the YYYY-MM date strings used by Experience,
 * Project, Education, and Volunteer entries.
 */

export type DateFormat =
  | "locale"
  | "MMM yyyy"
  | "MM/yyyy"
  | "yyyy-MM"
  | "MM.yyyy";

export const VALID_DATE_FORMATS: DateFormat[] = [
  "locale",
  "MMM yyyy",
  "MM/yyyy",
  "yyyy-MM",
  "MM.yyyy",
];

/** Formats a "YYYY-MM" string. Returns "" for null/undefined/unparseable input. */
export function formatMonthYear(
  value: string | null | undefined,
  format: DateFormat = "locale",
  locale?: string
): string {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month] = match;

  switch (format) {
    case "MM/yyyy":
      return `${month}/${year}`;
    case "MM.yyyy":
      return `${month}.${year}`;
    case "yyyy-MM":
      return `${year}-${month}`;
    case "MMM yyyy":
    case "locale":
    default: {
      const date = new Date(Number(year), Number(month) - 1, 1);
      const intlLocale = format === "locale" ? locale : "en-US";
      return new Intl.DateTimeFormat(intlLocale, {
        year: "numeric",
        month: "short",
      }).format(date);
    }
  }
}

export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
  format: DateFormat = "locale",
  locale?: string,
  presentLabel = "Present"
): string {
  const startLabel = formatMonthYear(start, format, locale);
  const endLabel = end ? formatMonthYear(end, format, locale) : presentLabel;
  if (!startLabel) return endLabel === presentLabel ? "" : endLabel;
  return `${startLabel} - ${endLabel}`;
}

const MONTH_YEAR_RE = /^\d{4}-\d{2}$/;

/**
 * `<input type="month">` has no native picker UI in Safari/WebKit (incl. the
 * Tauri desktop build on macOS) — it silently degrades to a plain text
 * field. `<input type="date">` is supported everywhere, so pickers use that
 * and pad/strip a fixed day instead.
 */
export function toDateInputValue(monthYear: string | null | undefined): string {
  return monthYear && MONTH_YEAR_RE.test(monthYear) ? `${monthYear}-01` : "";
}

export function fromDateInputValue(dateValue: string): string {
  return dateValue.slice(0, 7);
}

/**
 * True when start <= end (YYYY-MM sorts lexicographically), or either side is
 * empty/not in canonical YYYY-MM form (legacy free-text dates are left
 * unvalidated rather than flagged as false positives).
 */
export function isValidDateRange(
  start: string | null | undefined,
  end: string | null | undefined
): boolean {
  if (!start || !end) return true;
  if (!MONTH_YEAR_RE.test(start) || !MONTH_YEAR_RE.test(end)) return true;
  return start <= end;
}
