import type { ReleaseNoteEntry } from "@/lib/releaseNotes.generated";

/**
 * Entries newer than `lastSeenVersion`, newest-first (the order
 * RELEASE_NOTES.md / the generator already produces). If the version isn't
 * found — a fresh install with no prior version recorded, or a downgrade —
 * returns nothing rather than guessing; the caller treats "nothing to show"
 * as "just stamp the current version and move on".
 */
export function entriesSince(
  entries: ReleaseNoteEntry[],
  lastSeenVersion: string | null
): ReleaseNoteEntry[] {
  if (!lastSeenVersion) return [];
  const index = entries.findIndex((entry) => entry.version === lastSeenVersion);
  if (index === -1) return [];
  return entries.slice(0, index);
}

export interface GroupedBullets {
  new: string[];
  improved: string[];
  fixed: string[];
  other: string[];
}

const LEDE_RE = /^\*\*(New|Improved|Changed|Fixed)\b/i;

/**
 * Groups a release note's bullets by their bolded lede (`**New: …**`,
 * `**Fixed: …**`, …) — the convention RELEASE_NOTES.md is already written
 * in, not a general markdown parser. A bullet that doesn't open that way
 * (a closing "Note for X users:" paragraph, say) lands in `other`.
 *
 * ponytail: prefix match on the lede, not a parser — RELEASE_NOTES.md
 * bullets are written this way by convention. If a bullet lands in
 * "other", fix the bullet, not this.
 */
export function groupBullets(bullets: string[]): GroupedBullets {
  const grouped: GroupedBullets = {
    new: [],
    improved: [],
    fixed: [],
    other: [],
  };
  for (const bullet of bullets) {
    const match = bullet.match(LEDE_RE);
    const lede = match?.[1]?.toLowerCase();
    if (lede === "new") grouped.new.push(bullet);
    else if (lede === "improved" || lede === "changed")
      grouped.improved.push(bullet);
    else if (lede === "fixed") grouped.fixed.push(bullet);
    else grouped.other.push(bullet);
  }
  return grouped;
}
