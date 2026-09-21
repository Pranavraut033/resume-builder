// @vitest-environment node
import { describe, it, expect } from "vitest";

import {
  DESKTOP_SCHEMES,
  appLinkFor,
  parseStateTarget,
  tagState,
} from "@/lib/email/appLink";

describe("appLink", () => {
  it("round-trips a desktop scheme through the OAuth state", () => {
    const state = tagState("abc_123-XYZ", "udaan");

    expect(state).toBe("udaan~abc_123-XYZ");
    expect(parseStateTarget(state)).toEqual({
      kind: "desktop",
      scheme: "udaan",
    });
  });

  it("tags web builds explicitly", () => {
    const state = tagState("abc", null);

    expect(state).toBe("web~abc");
    expect(parseStateTarget(state)).toEqual({ kind: "web" });
  });

  it("maps each build's identifier to its own scheme, so canary never opens stable", () => {
    expect(DESKTOP_SCHEMES["com.resumebuilder.dev"]).toBe("udaan");
    expect(DESKTOP_SCHEMES["com.resumebuilder.canary"]).toBe("udaan-canary");
  });

  it("treats an untagged (pre-existing) state as web", () => {
    expect(parseStateTarget("plainOldState")).toEqual({ kind: "web" });
  });

  // The state arrives from the query string of a public URL, so the scheme it
  // names must come from an allow-list — never be echoed into a link.
  it.each([
    "javascript:alert(1)~x",
    'evil"><script>alert(1)</script>~x',
    "file~x",
    "UDAAN~x",
    "~x",
    "",
  ])("never trusts an unknown scheme prefix: %s", (state) => {
    expect(parseStateTarget(state)).toEqual({ kind: "web" });
  });

  it("builds a deep link for desktop and an in-app path for web", () => {
    expect(appLinkFor({ kind: "desktop", scheme: "udaan-canary" })).toBe(
      "udaan-canary://oauth-complete"
    );
    expect(appLinkFor({ kind: "web" })).toBe("/settings");
  });
});
