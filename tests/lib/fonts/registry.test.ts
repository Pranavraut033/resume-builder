import { describe, expect, it } from "vitest";

import { AVAILABLE_FONTS } from "@/types/customization";
import { fontFamilyCss } from "@/lib/fonts/registry";
import { SYSTEM_FONT_MAP, registerPDFFont } from "@/lib/pdf/fonts";

// Guards against the whole "font is listed but can't actually render"
// bug class: every AVAILABLE_FONTS entry must resolve to a real CSS stack
// and a real PDF font, not the unknown-font fallback.
describe("font registry", () => {
  it.each(AVAILABLE_FONTS)("%s resolves to a usable CSS stack", (name) => {
    const stack = fontFamilyCss(name);
    expect(stack).toContain(name);
  });

  it.each(AVAILABLE_FONTS)("%s resolves to a real PDF font", (name) => {
    const resolved = registerPDFFont(name);
    // Unknown fonts silently fall back to "Helvetica" — only acceptable
    // for fonts that are genuinely Helvetica-family system fonts.
    if (resolved === "Helvetica") {
      expect(SYSTEM_FONT_MAP[name]).toBe("Helvetica");
    } else {
      expect(resolved).toBeTruthy();
    }
  });
});
