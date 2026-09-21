import { useState } from "react";

import { Icon } from "@/components/ui/Icon";
import cn from "@/lib/cn";

import {
  locationGroups,
  locationKey,
  type LocationOption,
} from "./locationGroups";
import { LISTING_SOURCES, sourceLabel } from "./sourceMeta";

import type { JobListingRow } from "@/actions/emailSync";

export interface ListingFilters {
  search: string;
  showDismissed: boolean;
  hideSaved: boolean;
  sources: string[];
  /** `locationKey`s (lowercase). Any-of: a listing matches if one of its groups is selected. */
  locations: string[];
}

export const DEFAULT_LISTING_FILTERS: ListingFilters = {
  search: "",
  showDismissed: false,
  hideSaved: false,
  sources: [],
  locations: [],
};

export function hasActiveListingFilters(filters: ListingFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.showDismissed ||
    filters.hideSaved ||
    filters.sources.length > 0 ||
    filters.locations.length > 0
  );
}

/** Pure predicate — kept apart from the page so it's unit-testable without mounting. */
export function matchesListingFilters(
  listing: Pick<
    JobListingRow,
    "hiddenAt" | "savedJobId" | "source" | "title" | "companyName" | "location"
  >,
  filters: ListingFilters
): boolean {
  if (!filters.showDismissed && listing.hiddenAt) return false;
  if (filters.hideSaved && listing.savedJobId !== null) return false;
  if (
    filters.sources.length > 0 &&
    !filters.sources.includes(listing.source ?? "other")
  ) {
    return false;
  }
  if (
    filters.locations.length > 0 &&
    !locationGroups(listing.location).some((g) =>
      filters.locations.includes(locationKey(g))
    )
  ) {
    return false;
  }
  const query = filters.search.trim().toLowerCase();
  if (query) {
    const haystack = `${listing.title} ${listing.companyName ?? ""} ${listing.location ?? ""}`;
    if (!haystack.toLowerCase().includes(query)) return false;
  }
  return true;
}

const LOCATION_CHIPS_SHOWN = 8;

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-agent-primary bg-agent-primary text-agent-on-primary"
          : "border-agent-outline-variant bg-agent-surface-lowest text-agent-on-surface-variant hover:text-agent-on-surface"
      )}
    >
      {children}
    </button>
  );
}

export function ListingFilterBar({
  filters,
  onChange,
  availableSources,
  locationOptions,
}: {
  filters: ListingFilters;
  onChange: (next: ListingFilters) => void;
  /** Only sources that actually appear in the feed get a chip. */
  availableSources: string[];
  /** Location groups drawn from the fetched listings (see locationGroups.ts). */
  locationOptions: LocationOption[];
}) {
  const [showAllLocations, setShowAllLocations] = useState(false);
  // Quick filter: the most common groups, plus anything selected so it can be undone.
  const visibleLocations = showAllLocations
    ? locationOptions
    : locationOptions.filter(
        (o, i) => i < LOCATION_CHIPS_SHOWN || filters.locations.includes(o.key)
      );
  const hiddenLocationCount = locationOptions.length - visibleLocations.length;
  const toggleLocation = (key: string) =>
    onChange({
      ...filters,
      locations: filters.locations.includes(key)
        ? filters.locations.filter((k) => k !== key)
        : [...filters.locations, key],
    });

  const toggleSource = (source: string) =>
    onChange({
      ...filters,
      sources: filters.sources.includes(source)
        ? filters.sources.filter((s) => s !== source)
        : [...filters.sources, source],
    });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Icon
          name="search"
          size={15}
          className="text-agent-outline pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
        />
        <input
          type="search"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search title, company or location…"
          aria-label="Search listings"
          className="border-agent-outline-variant bg-agent-surface-lowest text-agent-on-surface placeholder:text-agent-outline focus:border-agent-primary w-full rounded-xl border py-2 pr-3 pl-9 text-sm focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Chip
          active={filters.hideSaved}
          onClick={() =>
            onChange({ ...filters, hideSaved: !filters.hideSaved })
          }
        >
          Hide saved
        </Chip>
        <Chip
          active={filters.showDismissed}
          onClick={() =>
            onChange({ ...filters, showDismissed: !filters.showDismissed })
          }
        >
          Show dismissed
        </Chip>
        {availableSources.length > 1 && (
          <>
            <span
              className="bg-agent-outline-variant mx-1 h-4 w-px"
              aria-hidden
            />
            {LISTING_SOURCES.filter((s) => availableSources.includes(s)).map(
              (source) => (
                <Chip
                  key={source}
                  active={filters.sources.includes(source)}
                  onClick={() => toggleSource(source)}
                >
                  {sourceLabel(source)}
                </Chip>
              )
            )}
          </>
        )}
      </div>

      {locationOptions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-agent-outline flex items-center gap-1 text-xs font-medium">
            <Icon name="mapPin" size={13} />
            Location
          </span>
          {visibleLocations.map((option) => (
            <Chip
              key={option.key}
              active={filters.locations.includes(option.key)}
              onClick={() => toggleLocation(option.key)}
            >
              {option.label}
              <span className="ml-1.5 opacity-70">{option.count}</span>
            </Chip>
          ))}
          {(hiddenLocationCount > 0 || showAllLocations) &&
            locationOptions.length > LOCATION_CHIPS_SHOWN && (
              <button
                type="button"
                onClick={() => setShowAllLocations((v) => !v)}
                className="text-agent-on-surface-variant hover:text-agent-primary text-xs font-medium"
              >
                {showAllLocations
                  ? "Show less"
                  : `+${hiddenLocationCount} more`}
              </button>
            )}
        </div>
      )}
    </div>
  );
}
