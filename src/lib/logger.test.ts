import { describe, expect, it } from "vitest";

import { Logger } from "./logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const frameFunctionName = (Logger as any).frameFunctionName as (
  line: string
) => string;

describe("Logger.frameFunctionName", () => {
  it("extracts the function name from a V8-style frame", () => {
    expect(frameFunctionName("    at error (foo.js:12:3)")).toBe("error");
    expect(frameFunctionName("    at Logger.error (foo.js:12:3)")).toBe(
      "error"
    );
  });

  it("extracts the function name from a WebKit/JSC-style frame", () => {
    expect(
      frameFunctionName("captureStack@http://localhost/app.js:1428:30")
    ).toBe("captureStack");
  });

  it("returns empty string for anonymous frames, so they aren't stripped", () => {
    expect(frameFunctionName("@http://localhost/app.js:1548:32")).toBe("");
  });
});
