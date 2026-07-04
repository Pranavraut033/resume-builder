import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/pdf/fonts", () => ({
  registerPDFFont: vi.fn((fontFamily: string) => fontFamily),
}));

import { registerPDFFont } from "@/lib/pdf/fonts";
import {
  getPagePt,
  resolvePDFCustomization,
  withAlpha,
} from "@/lib/pdf/resolveStyles";
import { SanitizedCustomization } from "@/types/customization";

const baseCustomization = {
  template: "modern-minimal",
  colors: "#3b82f6,#64748b,#8b5cf6,#1f2937,#ffffff",
  fontFamily: "Inter",
  fontSize: "medium",
  marginSize: "normal",
  lineHeight: "medium",
  pageFormat: "a4",
} as unknown as SanitizedCustomization;

describe("getPagePt", () => {
  it("returns LETTER dimensions", () => {
    expect(getPagePt("LETTER")).toEqual({ w: 612, h: 792 });
  });

  it("returns A4 dimensions", () => {
    expect(getPagePt("A4")).toEqual({ w: 595.28, h: 841.89 });
  });

  it("falls back to LETTER for an unrecognized format", () => {
    expect(getPagePt("unknown" as never)).toEqual({ w: 612, h: 792 });
  });
});

describe("withAlpha", () => {
  it("converts a hex color and alpha hex into an rgba string", () => {
    expect(withAlpha("#8b5cf6", "33")).toBe("rgba(139,92,246,0.200)");
  });

  it("resolves full alpha (ff) to 1.000", () => {
    expect(withAlpha("#000000", "ff")).toBe("rgba(0,0,0,1.000)");
  });

  it("resolves zero alpha (00) to 0.000", () => {
    expect(withAlpha("#ffffff", "00")).toBe("rgba(255,255,255,0.000)");
  });
});

describe("resolvePDFCustomization", () => {
  it("resolves all fields from a fully specified customization", () => {
    const styles = resolvePDFCustomization(baseCustomization);

    expect(styles.primaryColor).toBe("#3b82f6");
    expect(styles.secondaryColor).toBe("#64748b");
    expect(styles.accentColor).toBe("#8b5cf6");
    expect(styles.textColor).toBe("#1f2937");
    expect(styles.backgroundColor).toBe("#ffffff");
    expect(styles.fontSize).toBe(10);
    expect(styles.smallFontSize).toBe(9);
    expect(styles.headingFontSize).toBe(15);
    expect(styles.nameFontSize).toBe(24);
    expect(styles.lineHeight).toBe(1.5);
    expect(styles.marginPt).toBe(36);
    expect(styles.pageFormat).toBe("A4");
    expect(styles.background).toBe("none");
    expect(styles.colorsTuple).toEqual([
      "#3b82f6",
      "#64748b",
      "#8b5cf6",
      "#1f2937",
      "#ffffff",
    ]);
    expect(registerPDFFont).toHaveBeenCalledWith("Inter");
  });

  it("falls back to the default color palette when colors is missing", () => {
    const styles = resolvePDFCustomization({
      ...baseCustomization,
      colors: undefined,
    } as unknown as SanitizedCustomization);

    expect(styles.primaryColor).toBe("#3b82f6");
    expect(styles.backgroundColor).toBe("#ffffff");
  });

  it("falls back to default colors for any missing trailing entries", () => {
    const styles = resolvePDFCustomization({
      ...baseCustomization,
      colors: "#111111,#222222",
    } as unknown as SanitizedCustomization);

    expect(styles.primaryColor).toBe("#111111");
    expect(styles.secondaryColor).toBe("#222222");
    expect(styles.accentColor).toBe("#8b5cf6");
    expect(styles.textColor).toBe("#1f2937");
    expect(styles.backgroundColor).toBe("#ffffff");
  });

  it("falls back to medium/normal defaults for unknown size keys", () => {
    const styles = resolvePDFCustomization({
      ...baseCustomization,
      fontSize: "huge",
      marginSize: "huge",
      lineHeight: "huge",
    } as unknown as SanitizedCustomization);

    expect(styles.fontSize).toBe(10);
    expect(styles.smallFontSize).toBe(9);
    expect(styles.headingFontSize).toBe(15);
    expect(styles.nameFontSize).toBe(24);
    expect(styles.marginPt).toBe(36);
    expect(styles.lineHeight).toBe(1.5);
  });

  it("resolves background to the given id when it is a valid BackgroundId", () => {
    const styles = resolvePDFCustomization({
      ...baseCustomization,
      background: "dots",
    } as unknown as SanitizedCustomization);

    expect(styles.background).toBe("dots");
  });

  it("applies medium/normal/Inter defaults when size/font keys are absent", () => {
    const sparse = {
      template: "modern-minimal",
      colors: undefined,
      fontFamily: undefined,
      fontSize: undefined,
      marginSize: undefined,
      lineHeight: undefined,
      pageFormat: undefined,
    } as unknown as SanitizedCustomization;

    const styles = resolvePDFCustomization(sparse);

    expect(styles.fontSize).toBe(10);
    expect(styles.marginPt).toBe(36);
    expect(styles.lineHeight).toBe(1.5);
    expect(registerPDFFont).toHaveBeenCalledWith("Inter");
  });

  it("resolves background to 'none' when the value is not a valid BackgroundId", () => {
    const styles = resolvePDFCustomization({
      ...baseCustomization,
      background: "not-a-real-background",
    } as unknown as SanitizedCustomization);

    expect(styles.background).toBe("none");
  });

  it("resolves pageFormat to A4 when not exactly 'letter'", () => {
    const styles = resolvePDFCustomization({
      ...baseCustomization,
      pageFormat: undefined,
    } as unknown as SanitizedCustomization);

    expect(styles.pageFormat).toBe("A4");
  });

  it("resolves pageFormat to LETTER when 'letter'", () => {
    const styles = resolvePDFCustomization({
      ...baseCustomization,
      pageFormat: "letter",
    } as unknown as SanitizedCustomization);

    expect(styles.pageFormat).toBe("LETTER");
  });
});
