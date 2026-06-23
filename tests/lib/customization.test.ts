import { describe, expect, it } from "vitest";

import {
  DEFAULT_CUSTOMIZATION,
  validateCustomization,
} from "@/types/customization";

describe("validateCustomization background", () => {
  it.each([
    "none",
    "lines",
    "dots",
    "curves",
    "waves",
    "blobs",
    "mesh",
    "pride",
  ])("accepts %s as a valid background id", (background) => {
    expect(() =>
      validateCustomization({ ...DEFAULT_CUSTOMIZATION, background })
    ).not.toThrow();
  });

  it("rejects an invalid background id", () => {
    expect(() =>
      validateCustomization({
        ...DEFAULT_CUSTOMIZATION,
        background: "not-a-real-background",
      })
    ).toThrow("Invalid background selected.");
  });
});
