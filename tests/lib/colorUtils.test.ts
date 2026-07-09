import { describe, expect, it } from "vitest";

import {
  colorsFromCSV,
  colorsToCSV,
  DEFAULT_COLORS_CSV,
} from "@/lib/colorUtils";
import { ThemeColors } from "@/types/customization";

describe("colorsToCSV", () => {
  it("joins the colors tuple into a comma-separated string", () => {
    const colors: ThemeColors = [
      "#111111",
      "#222222",
      "#333333",
      "#444444",
      "#555555",
    ];
    expect(colorsToCSV(colors)).toBe("#111111,#222222,#333333,#444444,#555555");
  });
});

describe("colorsFromCSV", () => {
  it("parses a 5-value CSV string into a colors tuple", () => {
    expect(colorsFromCSV("#111111,#222222,#333333,#444444,#555555")).toEqual([
      "#111111",
      "#222222",
      "#333333",
      "#444444",
      "#555555",
    ]);
  });

  it("trims whitespace around each value", () => {
    expect(
      colorsFromCSV(" #111111 , #222222 , #333333 , #444444 , #555555 ")
    ).toEqual(["#111111", "#222222", "#333333", "#444444", "#555555"]);
  });

  it("throws when fewer than 5 values are given", () => {
    expect(() => colorsFromCSV("#111111,#222222")).toThrow(
      "Invalid color CSV format. Expected 5 values, got 2"
    );
  });

  it("throws when more than 5 values are given", () => {
    expect(() =>
      colorsFromCSV("#111111,#222222,#333333,#444444,#555555,#666666")
    ).toThrow("Invalid color CSV format. Expected 5 values, got 6");
  });

  it("round-trips with colorsToCSV via DEFAULT_COLORS_CSV", () => {
    const parsed = colorsFromCSV(DEFAULT_COLORS_CSV);
    expect(colorsToCSV(parsed)).toBe(DEFAULT_COLORS_CSV);
  });
});
