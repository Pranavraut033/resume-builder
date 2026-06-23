import { describe, expect, it } from "vitest";

import { buildBackground, namespaceDrawing } from "@/lib/backgrounds/specs";
import { AVAILABLE_BACKGROUNDS, BackgroundId } from "@/lib/backgrounds/types";
import { ThemeColors } from "@/types/customization";

const COLORS: ThemeColors = [
  "#1d4ed8",
  "#475569",
  "#6d28d9",
  "#1f2937",
  "#ffffff",
];
const W = 800;
const H = 1000;

describe("buildBackground", () => {
  it("returns an empty drawing for 'none'", () => {
    const drawing = buildBackground("none", COLORS, W, H);
    expect(drawing).toEqual({ defs: [], shapes: [] });
  });

  it.each(
    AVAILABLE_BACKGROUNDS.filter((b) => b.id !== "none").map((b) => b.id)
  )("returns a non-empty drawing with subtle opacity for '%s'", (id) => {
    const drawing = buildBackground(id as BackgroundId, COLORS, W, H);
    expect(drawing.shapes.length).toBeGreaterThan(0);

    for (const shape of drawing.shapes) {
      const fill = "fill" in shape ? shape.fill : undefined;
      const isGradientFill =
        typeof fill === "string" && fill.startsWith("url(");
      if (isGradientFill) continue;
      const opacity = shape.opacity ?? 1;
      expect(opacity).toBeLessThanOrEqual(0.2);
    }
    for (const def of drawing.defs) {
      for (const stop of def.stops) {
        expect(stop.opacity ?? 1).toBeLessThanOrEqual(0.1);
      }
    }
  });

  it("keeps gradient ids unique after namespacing", () => {
    const drawing = buildBackground("mesh", COLORS, W, H);
    const namespaced = namespaceDrawing(drawing, "abc");

    expect(namespaced.defs.every((d) => d.id.startsWith("abc-"))).toBe(true);
    const fills = namespaced.shapes
      .map((s) => (s.kind === "rect" ? s.fill : undefined))
      .filter(Boolean) as string[];
    expect(fills.every((f) => /url\(#abc-/.test(f))).toBe(true);
  });
});
