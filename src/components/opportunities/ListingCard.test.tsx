import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ListingCard } from "./ListingCard";

import type { JobListingRow } from "@/actions/emailSync";

const listing = (over: Partial<JobListingRow> = {}): JobListingRow => ({
  id: 1,
  createdAt: new Date(),
  title: "Senior Software Engineer",
  companyName: "Kaliper",
  location: "Mumbai (Remote)",
  url: "https://www.linkedin.com/jobs/view/111",
  source: "linkedin",
  postedText: null,
  firstSeenAt: new Date(),
  hiddenAt: null,
  jobEmailId: 1,
  savedJobId: null,
  ...over,
});

const noop = vi.fn();

describe("ListingCard", () => {
  it("shows the company as a circle with the job board's logo badge", () => {
    const { container } = render(
      <ListingCard listing={listing()} onSave={noop} onToggleHidden={noop} />
    );

    // Company circle (logo image, or initials if it can't load).
    expect(
      container.querySelector(".rounded-full.border-black\\/10")
    ).not.toBeNull();
    // Provider badge, named for assistive tech.
    expect(screen.getByRole("img", { name: "From LinkedIn" })).toBeTruthy();
    // Favicon comes from the listing URL's host, not a hard-coded list.
    expect(
      container.querySelector('img[src*="domain=linkedin.com"]')
    ).not.toBeNull();
  });

  it("badges an unlisted board by its own host", () => {
    const { container } = render(
      <ListingCard
        listing={listing({ source: "other", url: "https://prodevs.io/jobs/9" })}
        onSave={noop}
        onToggleHidden={noop}
      />
    );
    expect(
      container.querySelector('img[src*="domain=prodevs.io"]')
    ).not.toBeNull();
  });

  it("falls back to the board's initial when the logo can't load", () => {
    const { container } = render(
      <ListingCard listing={listing()} onSave={noop} onToggleHidden={noop} />
    );

    fireEvent.error(
      container.querySelector('img[src*="domain=linkedin.com"]')!
    );

    const badge = screen.getByRole("img", { name: "From LinkedIn" });
    expect(badge.textContent).toBe("L");
  });

  it("still shows title, company and location beside the avatar", () => {
    render(
      <ListingCard listing={listing()} onSave={noop} onToggleHidden={noop} />
    );
    expect(screen.getByText("Senior Software Engineer")).toBeTruthy();
    expect(screen.getByText("Kaliper · Mumbai (Remote)")).toBeTruthy();
  });
});
