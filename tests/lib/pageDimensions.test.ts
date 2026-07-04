import { describe, expect, it } from "vitest";

import { getPageDimensions } from "@/lib/pageDimensions";

describe("getPageDimensions", () => {
  it("resolves letter dimensions for pageFormat 'letter'", () => {
    const dims = getPageDimensions("letter", "normal");
    expect(dims.widthMm).toBe(215.9);
    expect(dims.heightMm).toBe(279.4);
  });

  it("resolves a4 dimensions for any non-'letter' pageFormat", () => {
    const dims = getPageDimensions("a4", "normal");
    expect(dims.widthMm).toBe(210);
    expect(dims.heightMm).toBe(297);
  });

  it("falls back to a4 dimensions for an unrecognized pageFormat", () => {
    const dims = getPageDimensions("unknown", "normal");
    expect(dims.widthMm).toBe(210);
    expect(dims.heightMm).toBe(297);
  });

  it.each([
    ["narrow", 32],
    ["normal", 48],
    ["wide", 64],
  ])("maps marginSize '%s' to %dpx", (marginSize, expected) => {
    expect(getPageDimensions("a4", marginSize).marginPx).toBe(expected);
  });

  it("falls back to 48px margin for an unrecognized marginSize", () => {
    expect(getPageDimensions("a4", "huge").marginPx).toBe(48);
  });

  it("computes contentHeightPx as heightPx minus top and bottom margins", () => {
    const dims = getPageDimensions("a4", "normal");
    expect(dims.contentHeightPx).toBe(dims.heightPx - 2 * dims.marginPx);
  });

  it("converts mm to px using 96/25.4 px-per-mm", () => {
    const dims = getPageDimensions("letter", "normal");
    expect(dims.widthPx).toBeCloseTo(215.9 * (96 / 25.4), 5);
    expect(dims.heightPx).toBeCloseTo(279.4 * (96 / 25.4), 5);
  });
});
