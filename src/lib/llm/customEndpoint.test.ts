import { describe, expect, it } from "vitest";

import { validateCustomBaseUrl } from "./customEndpoint";

describe("validateCustomBaseUrl", () => {
  it("accepts https endpoints", () => {
    expect(
      validateCustomBaseUrl("https://integrate.api.nvidia.com/v1")
    ).toBeNull();
  });

  it("accepts http only on loopback, where there is nothing to eavesdrop on", () => {
    expect(validateCustomBaseUrl("http://localhost:8000/v1")).toBeNull();
    expect(validateCustomBaseUrl("http://127.0.0.1:1234/v1")).toBeNull();
  });

  it("rejects http to a remote host — key and resume would go in plaintext", () => {
    expect(validateCustomBaseUrl("http://api.example.com/v1")).toMatch(/https/);
  });

  it("rejects a bare host with no scheme", () => {
    expect(validateCustomBaseUrl("api.example.com/v1")).toMatch(/valid URL/);
  });

  it("rejects non-http schemes", () => {
    expect(validateCustomBaseUrl("ftp://example.com")).toMatch(/https/);
    expect(validateCustomBaseUrl("file:///etc/passwd")).toMatch(/https/);
  });

  it("rejects empty input", () => {
    expect(validateCustomBaseUrl("   ")).toMatch(/Enter/);
  });

  it("ignores surrounding whitespace", () => {
    expect(validateCustomBaseUrl("  https://example.com/v1  ")).toBeNull();
  });
});
