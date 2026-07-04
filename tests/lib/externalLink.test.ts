import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/keyStorage", () => ({
  isTauriContext: vi.fn(),
}));

import { isExternalHref, openExternalUrl } from "@/lib/externalLink";
import { isTauriContext } from "@/lib/keyStorage";

describe("isExternalHref", () => {
  it("returns false for an empty href", () => {
    expect(isExternalHref("")).toBe(false);
  });

  it("returns false for an in-page anchor", () => {
    expect(isExternalHref("#section")).toBe(false);
  });

  it("returns false for a mailto: link", () => {
    expect(isExternalHref("mailto:test@example.com")).toBe(false);
  });

  it("returns false for a tel: link", () => {
    expect(isExternalHref("tel:+15551234567")).toBe(false);
  });

  it("returns false for a same-origin absolute URL", () => {
    expect(isExternalHref(window.location.origin + "/some/path")).toBe(
      false
    );
  });

  it("returns true for a different-origin absolute URL", () => {
    expect(isExternalHref("https://example.com/some/path")).toBe(true);
  });

  it("returns false for a relative path (resolves to same origin)", () => {
    expect(isExternalHref("/job/123")).toBe(false);
  });

  it("returns false for an unparseable href", () => {
    expect(isExternalHref("http://[")).toBe(false);
  });
});

describe("openExternalUrl", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens a new tab when not in a Tauri context", async () => {
    vi.mocked(isTauriContext).mockReturnValue(false);
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    await openExternalUrl("https://example.com");

    expect(openSpy).toHaveBeenCalledWith(
      "https://example.com",
      "_blank",
      "noopener,noreferrer"
    );
  });
});
