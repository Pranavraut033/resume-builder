import { describe, expect, it } from "vitest";

import { entriesSince, groupBullets } from "./releaseNotes";

import type { ReleaseNoteEntry } from "./releaseNotes.generated";

const entries: ReleaseNoteEntry[] = [
  { version: "1.19.0", date: "2026-09-10", summary: "s19", bullets: [] },
  { version: "1.18.0", date: "2026-09-09", summary: "s18", bullets: [] },
  { version: "1.17.0", date: "2026-09-09", summary: "s17", bullets: [] },
];

describe("entriesSince", () => {
  it("returns everything newer than lastSeenVersion", () => {
    expect(entriesSince(entries, "1.17.0")).toEqual([entries[0], entries[1]]);
  });

  it("returns nothing when already on the newest version", () => {
    expect(entriesSince(entries, "1.19.0")).toEqual([]);
  });

  it("returns nothing when lastSeenVersion is null (fresh install)", () => {
    expect(entriesSince(entries, null)).toEqual([]);
  });

  it("returns nothing when lastSeenVersion isn't found (downgrade, or a pruned history)", () => {
    expect(entriesSince(entries, "0.9.0")).toEqual([]);
  });
});

describe("groupBullets", () => {
  it("groups by the bolded lede", () => {
    const grouped = groupBullets([
      "**New: a thing.** Details.",
      "**Improved: a thing.** Details.",
      "**Changed: a thing.** Details.",
      "**Fixed: a thing.** Details.",
      "**Note for MCP users:** something else entirely.",
    ]);
    expect(grouped.new).toHaveLength(1);
    expect(grouped.improved).toHaveLength(2);
    expect(grouped.fixed).toHaveLength(1);
    expect(grouped.other).toHaveLength(1);
  });

  it("is case-insensitive on the lede", () => {
    expect(groupBullets(["**fixed:** lowercase lede."]).fixed).toHaveLength(1);
  });
});
