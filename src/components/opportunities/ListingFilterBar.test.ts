import { describe, expect, it } from "vitest";

import {
  DEFAULT_LISTING_FILTERS,
  hasActiveListingFilters,
  matchesListingFilters,
  type ListingFilters,
} from "./ListingFilterBar";

const base = {
  hiddenAt: null,
  savedJobId: null,
  source: "linkedin",
  title: "Senior Frontend Engineer",
  companyName: "Stripe",
  location: "Berlin",
};
const f = (over: Partial<ListingFilters>): ListingFilters => ({
  ...DEFAULT_LISTING_FILTERS,
  ...over,
});

describe("matchesListingFilters", () => {
  it("shows everything undismissed by default", () => {
    expect(matchesListingFilters(base, DEFAULT_LISTING_FILTERS)).toBe(true);
  });

  it("hides dismissed unless showDismissed", () => {
    const dismissed = { ...base, hiddenAt: new Date() };
    expect(matchesListingFilters(dismissed, DEFAULT_LISTING_FILTERS)).toBe(
      false
    );
    expect(matchesListingFilters(dismissed, f({ showDismissed: true }))).toBe(
      true
    );
  });

  it("hideSaved drops listings that already have a job", () => {
    const saved = { ...base, savedJobId: 3 };
    expect(matchesListingFilters(saved, f({ hideSaved: true }))).toBe(false);
    expect(matchesListingFilters(base, f({ hideSaved: true }))).toBe(true);
  });

  it("source chips OR together; a null source counts as other", () => {
    expect(
      matchesListingFilters(base, f({ sources: ["indeed", "linkedin"] }))
    ).toBe(true);
    expect(matchesListingFilters(base, f({ sources: ["indeed"] }))).toBe(false);
    expect(
      matchesListingFilters(
        { ...base, source: null },
        f({ sources: ["other"] })
      )
    ).toBe(true);
  });

  it("searches title, company and location case-insensitively", () => {
    expect(matchesListingFilters(base, f({ search: "STRIPE" }))).toBe(true);
    expect(matchesListingFilters(base, f({ search: "berlin" }))).toBe(true);
    expect(matchesListingFilters(base, f({ search: "munich" }))).toBe(false);
  });
});

describe("location filter", () => {
  const mumbaiRemote = { ...base, location: "Mumbai (Remote)" };

  it("matches any selected group, so a listing can be found by city or by Remote", () => {
    expect(
      matchesListingFilters(mumbaiRemote, f({ locations: ["mumbai"] }))
    ).toBe(true);
    expect(
      matchesListingFilters(mumbaiRemote, f({ locations: ["remote"] }))
    ).toBe(true);
    expect(
      matchesListingFilters(mumbaiRemote, f({ locations: ["berlin"] }))
    ).toBe(false);
  });

  it("groups spellings of one city", () => {
    for (const location of [
      "Berlin",
      "Berlin, Germany",
      "Berlin Metropolitan Area",
    ]) {
      expect(
        matchesListingFilters(
          { ...base, location },
          f({ locations: ["berlin"] })
        )
      ).toBe(true);
    }
  });

  it("hides listings with no location once a location is selected", () => {
    expect(
      matchesListingFilters(
        { ...base, location: null },
        f({ locations: ["berlin"] })
      )
    ).toBe(false);
    expect(matchesListingFilters({ ...base, location: null }, f({}))).toBe(
      true
    );
  });
});

describe("hasActiveListingFilters", () => {
  it("is false for defaults and true once anything is set", () => {
    expect(hasActiveListingFilters(DEFAULT_LISTING_FILTERS)).toBe(false);
    expect(hasActiveListingFilters(f({ search: "  " }))).toBe(false);
    expect(hasActiveListingFilters(f({ sources: ["xing"] }))).toBe(true);
    expect(hasActiveListingFilters(f({ locations: ["berlin"] }))).toBe(true);
  });
});
