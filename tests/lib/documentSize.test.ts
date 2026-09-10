import { describe, expect, it } from "vitest";

import {
  DOCUMENT_SIZE_CONFIG,
  DOCUMENT_SIZES,
  documentSizeOf,
  effectiveDocumentSize,
  sizeConfigOf,
} from "@/lib/documentSize";

describe("documentSize", () => {
  it("round-trips every preset through documentSizeOf", () => {
    for (const size of DOCUMENT_SIZES) {
      const cfg = DOCUMENT_SIZE_CONFIG[size];
      expect(
        documentSizeOf({
          fontSize: cfg.fontSize,
          marginSize: cfg.marginSize,
          lineHeight: cfg.lineHeight,
        })
      ).toBe(size);
    }
  });

  it("returns null (Custom) for a hand-mixed triple that matches no preset", () => {
    expect(
      documentSizeOf({
        fontSize: "large",
        marginSize: "narrow",
        lineHeight: "small",
      })
    ).toBeNull();
  });

  it("still resolves a sane spacing config for a Custom triple", () => {
    const custom = {
      fontSize: "large" as const,
      marginSize: "narrow" as const,
      lineHeight: "small" as const,
    };
    expect(effectiveDocumentSize(custom)).toBe("relaxed");
    expect(sizeConfigOf(custom)).toEqual(DOCUMENT_SIZE_CONFIG.relaxed);
  });

  it("the normal preset leaves PDF spacing unscaled", () => {
    expect(DOCUMENT_SIZE_CONFIG.normal.spaceScale).toBe(1);
  });
});
