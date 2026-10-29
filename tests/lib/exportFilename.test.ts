import { describe, expect, it } from "vitest";

import { exportFilename } from "@/lib/exportFilename";

describe("exportFilename", () => {
  it("joins name and company parts with underscores", () => {
    expect(exportFilename("Pranav Raut", "Acme GmbH", "resume")).toBe(
      "Pranav_Raut_Acme_GmbH_Resume.pdf"
    );
  });

  it("omits a missing company", () => {
    expect(exportFilename("Pranav Raut", undefined, "resume")).toBe(
      "Pranav_Raut_Resume.pdf"
    );
  });

  it("strips invalid characters and keeps the cover letter suffix", () => {
    expect(exportFilename("Jo", "A/B: Co.", "cover-letter")).toBe(
      "Jo_AB_Co._Cover_Letter.pdf"
    );
  });

  it("handles an empty name", () => {
    expect(exportFilename("", undefined, "resume")).toBe("Resume.pdf");
    expect(exportFilename(undefined, undefined, "cover-letter")).toBe(
      "Cover_Letter.pdf"
    );
  });

  it("keeps non-ASCII letters", () => {
    expect(exportFilename("Jürgen Müller", "Acme", "resume")).toBe(
      "Jürgen_Müller_Acme_Resume.pdf"
    );
  });
});
