export function formatStatus(status: string) {
  return `${status.charAt(0)}${status.slice(1).toLowerCase()}`;
}

export function formatTimestamp(value: string | Date) {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function parseJobDetails(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}
