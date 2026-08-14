import { describe, expect, it } from "vitest";

import { formatCoverLetterDate } from "@/lib/coverLetterDate";
import {
  resolveDefaultCoverLetterStyle,
  DEFAULT_COVER_LETTER_STYLE,
} from "@/lib/llm/prompts/coverLetterStyles";
import { JobDetailsJSON } from "@/types/resume";

function job(overrides: Partial<JobDetailsJSON>): JobDetailsJSON {
  return {
    location: {
      country: null,
      city: null,
      state_or_region: null,
      onsite_required: null,
    },
    company: { company_name: null, company_location_country: null } as never,
    raw_description: "",
    ...overrides,
  } as JobDetailsJSON;
}

describe("formatCoverLetterDate", () => {
  it("dates German/EU jobs as DD.MM.YYYY", () => {
    const de = job({ location: { country: "Germany" } as never });
    expect(formatCoverLetterDate(de)).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  });

  it("dates a US job as 'Month D, YYYY'", () => {
    const us = job({ location: { country: "United States" } as never });
    expect(formatCoverLetterDate(us)).toMatch(/^[A-Z][a-z]+ \d{1,2}, \d{4}$/);
  });

  it("defaults to German formatting when no job is known, matching the app's default market", () => {
    expect(formatCoverLetterDate(null)).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  });

  it("ignores region auto-detect once an explicit dateFormat is set", () => {
    const de = job({ location: { country: "Germany" } as never });
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    expect(formatCoverLetterDate(de, "MM/yyyy")).toBe(`${mm}/${dd}/${yyyy}`);
    expect(formatCoverLetterDate(de, "yyyy-MM")).toBe(`${yyyy}-${mm}-${dd}`);
    expect(formatCoverLetterDate(de, "MM.yyyy")).toBe(`${dd}.${mm}.${yyyy}`);
    expect(formatCoverLetterDate(de, "MMM yyyy")).toMatch(
      /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/
    );
  });
});

describe("resolveDefaultCoverLetterStyle", () => {
  it("picks anschreiben for a German/EU job whose ad reads as German", () => {
    const de = job({
      location: { country: "Germany" } as never,
      raw_description:
        "Wir suchen eine Softwareentwicklerin für unser Team in Berlin. Sie bringen Erfahrung mit und arbeiten mit uns an spannenden Aufgaben.",
    });
    expect(resolveDefaultCoverLetterStyle(de)).toBe("anschreiben");
  });

  it("stays on the standard default for a German/EU job posted in English", () => {
    const de = job({
      location: { country: "Germany" } as never,
      raw_description:
        "We are looking for a software engineer to join our Berlin team and help us ship great products.",
    });
    expect(resolveDefaultCoverLetterStyle(de)).toBe(DEFAULT_COVER_LETTER_STYLE);
  });

  it("stays on the standard default for a non-EU job even if the ad happens to be in German", () => {
    const us = job({
      location: { country: "United States" } as never,
      raw_description:
        "Wir suchen eine Softwareentwicklerin für unser Team und Sie arbeiten mit uns.",
    });
    expect(resolveDefaultCoverLetterStyle(us)).toBe(DEFAULT_COVER_LETTER_STYLE);
  });

  it("stays on the standard default with no job at all", () => {
    expect(resolveDefaultCoverLetterStyle(null)).toBe(
      DEFAULT_COVER_LETTER_STYLE
    );
  });
});
