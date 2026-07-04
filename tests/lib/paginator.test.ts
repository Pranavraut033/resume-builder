import { describe, expect, it } from "vitest";

import { groupBlocksIntoPages } from "@/lib/paginator";

describe("groupBlocksIntoPages", () => {
  it("returns a single empty page when there are no blocks", () => {
    expect(groupBlocksIntoPages([], 1000)).toEqual([[]]);
  });

  it("packs all blocks onto one page when they all fit", () => {
    expect(groupBlocksIntoPages([100, 100, 100], 1000)).toEqual([
      [0, 1, 2],
    ]);
  });

  it("starts a new page when the next block would overflow", () => {
    expect(groupBlocksIntoPages([600, 600], 1000)).toEqual([[0], [1]]);
  });

  it("places an over-height block on its own page rather than looping forever", () => {
    expect(groupBlocksIntoPages([2000], 1000)).toEqual([[0]]);
  });

  it("always places the first block of a page even if it alone overflows", () => {
    expect(groupBlocksIntoPages([2000, 100], 1000)).toEqual([[0], [1]]);
  });

  it("reduces page-0 capacity by firstPageReserved", () => {
    expect(groupBlocksIntoPages([500, 500], 1000, 600)).toEqual([
      [0],
      [1],
    ]);
  });

  it("does not apply firstPageReserved to subsequent pages", () => {
    expect(groupBlocksIntoPages([900, 900, 900], 1000, 950)).toEqual([
      [0],
      [1],
      [2],
    ]);
  });

  it("accounts for gapPx between blocks on the same page but not before the first", () => {
    expect(groupBlocksIntoPages([400, 400, 400], 1000, 0, 100)).toEqual([
      [0, 1],
      [2],
    ]);
  });

  it("does not add a gap before the first block on a page", () => {
    expect(groupBlocksIntoPages([1000], 1000, 0, 100)).toEqual([[0]]);
  });
});
