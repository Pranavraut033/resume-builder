const REMOTE = "Remote";
const AREA_WORDS =
  /\b(greater|metropolitan (region|area)|metro area|area|region|district)\b/gi;

/**
 * Buckets a digest's free-text location for the quick filter. Digests write the
 * same place many ways ("Mumbai (Remote)", "Mumbai Metropolitan Region",
 * "Berlin, Germany"), so this keeps the city, drops the qualifiers, and adds a
 * separate "Remote" group — so one listing can sit in two groups (Mumbai and
 * Remote). Returns [] when there is no location.
 * ponytail: takes the first place before a comma, so "Frankfurt am Main" stays
 * whole but a location listing two cities only groups under the first.
 */
export function locationGroups(location: string | null): string[] {
  if (!location?.trim()) return [];
  const groups: string[] = [];
  const isRemote = /\b(remote|home ?office|work from home)\b/i.test(location);

  const place = location
    .replace(/\(.*?\)/g, " ")
    .split(/,|\/|\||\s[-–]\s/)[0]
    .replace(AREA_WORDS, " ")
    .replace(/\s+/g, " ")
    .trim();

  // "Remote" on its own is the group, not a place.
  if (place && !/^(remote|home ?office|work from home)$/i.test(place)) {
    groups.push(place);
  }
  if (isRemote) groups.push(REMOTE);
  return groups;
}

/** Case-insensitive identity, so "berlin" and "Berlin" are one chip. */
export const locationKey = (group: string): string => group.toLowerCase();

export interface LocationOption {
  key: string;
  label: string;
  count: number;
}

/**
 * Chips for the filter: every group present in `locations`, most common first.
 * `keepKeys` (the current selection) are always included — with a count of 0 if
 * other filters have emptied them — so a selected chip can never vanish and
 * leave the user unable to deselect it.
 */
export function buildLocationOptions(
  locations: (string | null)[],
  keepKeys: string[] = []
): LocationOption[] {
  const options = new Map<string, LocationOption>();
  for (const location of locations) {
    for (const label of locationGroups(location)) {
      const key = locationKey(label);
      const existing = options.get(key);
      if (existing) existing.count++;
      else options.set(key, { key, label, count: 1 });
    }
  }
  for (const key of keepKeys) {
    if (!options.has(key)) options.set(key, { key, label: key, count: 0 });
  }
  return [...options.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label)
  );
}
