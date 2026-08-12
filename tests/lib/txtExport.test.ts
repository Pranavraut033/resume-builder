import { describe, expect, it, vi } from "vitest";

import { generateResumeTXT } from "@/lib/txtExport";
import { ResumeJSON } from "@/types/resume";

vi.mock("@/components/job-v2/engine/buildSections", () => ({
  buildSections: vi.fn(),
}));
vi.mock("@/components/job-v2/engine/sections", () => ({
  SECTION_REGISTRY: {
    summary: { txt: vi.fn() },
  },
}));

import { buildSections } from "@/components/job-v2/engine/buildSections";
import { SECTION_REGISTRY } from "@/components/job-v2/engine/sections";

const resume = {
  header: { name: "Jane Doe", email: "jane@example.com" },
} as unknown as ResumeJSON;

describe("generateResumeTXT", () => {
  it("renders the header followed by section text", () => {
    vi.mocked(buildSections).mockReturnValue([
      { id: "s1", type: "summary" } as never,
    ]);
    vi.mocked(SECTION_REGISTRY.summary.txt).mockReturnValue("Summary body");

    expect(generateResumeTXT(resume)).toBe(
      "Jane Doe\njane@example.com\n\nSummary body\n"
    );
  });

  it("includes headline and the rest of the contact block when present", () => {
    const fullResume = {
      header: {
        name: "Jane Doe",
        headline: "Senior Backend Engineer",
        email: "jane@example.com",
        phone: "555-0100",
        location: "Berlin, Germany",
        linkedin: "linkedin.com/in/janedoe",
        github: "github.com/janedoe",
        website: "janedoe.com",
        workAuthorization: "EU Blue Card",
      },
    } as unknown as ResumeJSON;
    vi.mocked(buildSections).mockReturnValue([]);

    expect(generateResumeTXT(fullResume)).toBe(
      "Jane Doe\n" +
        "Senior Backend Engineer\n" +
        "jane@example.com  |  555-0100  |  Berlin, Germany  |  LinkedIn: linkedin.com/in/janedoe  |  GitHub: github.com/janedoe  |  Website: janedoe.com  |  Work Authorization: EU Blue Card\n\n"
    );
  });

  it("skips a section type missing from SECTION_REGISTRY", () => {
    vi.mocked(buildSections).mockReturnValue([
      { id: "s1", type: "unknown-type" } as never,
    ]);

    expect(generateResumeTXT(resume)).toBe("Jane Doe\njane@example.com\n\n");
  });

  it("filters out sections whose txt() returns an empty string", () => {
    vi.mocked(buildSections).mockReturnValue([
      { id: "s1", type: "summary" } as never,
    ]);
    vi.mocked(SECTION_REGISTRY.summary.txt).mockReturnValue("");

    expect(generateResumeTXT(resume)).toBe("Jane Doe\njane@example.com\n\n");
  });

  it("returns just the header when there are no sections", () => {
    vi.mocked(buildSections).mockReturnValue([]);

    expect(generateResumeTXT(resume)).toBe("Jane Doe\njane@example.com\n\n");
  });
});
