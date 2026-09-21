"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  getJobListings,
  setListingHidden,
  type JobListingRow,
} from "@/actions/emailSync";
import { EmailSyncButton } from "@/components/emails/EmailSyncButton";
import { ModelSelector } from "@/components/ModelSelector";
import { ListingCard } from "@/components/opportunities/ListingCard";
import {
  DEFAULT_LISTING_FILTERS,
  hasActiveListingFilters,
  ListingFilterBar,
  matchesListingFilters,
  type ListingFilters,
} from "@/components/opportunities/ListingFilterBar";
import { buildLocationOptions } from "@/components/opportunities/locationGroups";
import { Button } from "@/components/ui/Button";
import { FallbackState } from "@/components/ui/FallbackState";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useLLMPageChrome } from "@/contexts/LLMPageChromeContext";
import { useEmailSync } from "@/hooks/useEmailSync";
import { useProfileSelection } from "@/hooks/useProfileSelection";
import { formatTimestamp } from "@/lib";
import { hasDefaultGoogleClient } from "@/lib/email/gmailClient";
import { normalizeListingUrl } from "@/lib/email/listingUrl";
import { useBookmarkQueueStore } from "@/store/bookmarkQueueStore";
import { useModelStore } from "@/store/modelStore";

const LISTINGS_KEY = ["jobListings"] as const;

function ListingSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="border-agent-outline-variant bg-agent-surface-lowest h-28 animate-pulse rounded-xl border"
        />
      ))}
    </div>
  );
}

export default function OpportunitiesPage() {
  // Save runs the bookmark parse, which needs the model picker in the chrome.
  useLLMPageChrome(true);

  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const { selectedProfileId } = useProfileSelection();
  const { activeModelPair } = useModelStore();
  const [currentProvider, currentModel] = activeModelPair ?? [];
  const { status, isConnected, isStatusLoading, isConnecting, connect } =
    useEmailSync();

  const [filters, setFilters] = useState<ListingFilters>(
    DEFAULT_LISTING_FILTERS
  );

  // Keyed on the sync status so a finished sync refetches; keepPreviousData
  // avoids a skeleton flash (same approach as /emails).
  const { data: listings = [], isLoading: isListingsLoading } = useQuery({
    queryKey: [...LISTINGS_KEY, status?.totalListings, status?.lastSyncedAt],
    queryFn: () => getJobListings(),
    enabled: !isStatusLoading,
    placeholderData: keepPreviousData,
  });

  const queueItems = useBookmarkQueueStore((s) => s.items);
  const savingUrls = useMemo(
    () =>
      new Set(
        queueItems
          .filter((i) => i.status === "queued" || i.status === "running")
          .map((i) => normalizeListingUrl(i.url))
      ),
    [queueItems]
  );

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: LISTINGS_KEY });
    queryClient.invalidateQueries({ queryKey: ["emailSyncStatus"] });
  };

  const hideMutation = useMutation({
    mutationFn: (listing: JobListingRow) =>
      setListingHidden(listing.id, !listing.hiddenAt),
    onMutate: (listing) =>
      queryClient.setQueriesData<JobListingRow[]>(
        { queryKey: LISTINGS_KEY },
        (old) =>
          old?.map((l) =>
            l.id === listing.id
              ? { ...l, hiddenAt: l.hiddenAt ? null : new Date() }
              : l
          )
      ),
    onSuccess: refresh,
    onError: (error) => {
      refresh();
      pushToast({
        title: "Unable to update listing",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    },
  });

  const handleSave = (listing: JobListingRow) => {
    if (!currentModel || !currentProvider) {
      pushToast({
        title: "Model required",
        description: "Please select a model first.",
        variant: "error",
      });
      return;
    }
    useBookmarkQueueStore.getState().enqueue(listing.url, {
      modelOptions: { model: currentModel, provider: currentProvider },
      profileId: selectedProfileId ?? undefined,
      onSaved: () => {
        queryClient.invalidateQueries({ queryKey: ["jobs"] });
        queryClient.invalidateQueries({ queryKey: LISTINGS_KEY });
      },
    });
  };

  const visible = useMemo(
    () => listings.filter((l) => matchesListingFilters(l, filters)),
    [listings, filters]
  );
  // Location chips reflect the other active filters, so a count is what you'd
  // actually get by picking it — selected chips are kept even at 0.
  const locationOptions = useMemo(
    () =>
      buildLocationOptions(
        listings
          .filter((l) =>
            matchesListingFilters(l, { ...filters, locations: [] })
          )
          .map((l) => l.location),
        filters.locations
      ),
    [listings, filters]
  );
  const availableSources = useMemo(
    () => [...new Set(listings.map((l) => l.source ?? "other"))],
    [listings]
  );
  const savedCount = listings.filter((l) => l.savedJobId !== null).length;

  const isLoading = isStatusLoading || isListingsLoading;

  const connectAction = hasDefaultGoogleClient() ? (
    <Button
      variant="primary"
      onClick={connect}
      disabled={isConnecting}
      icon={
        <Icon
          name={isConnecting ? "spinner" : "mail"}
          className={isConnecting ? "h-4 w-4 animate-spin" : "h-4 w-4"}
        />
      }
    >
      {isConnecting ? "Waiting for sign-in…" : "Connect Gmail"}
    </Button>
  ) : (
    <Link href="/settings">
      <Button variant="primary">Set up Google sign-in</Button>
    </Link>
  );

  let body: React.ReactNode;
  if (isLoading) {
    body = <ListingSkeleton />;
  } else if (listings.length === 0 && !isConnected) {
    body = (
      <FallbackState
        iconName="mail"
        title="Gmail isn't connected"
        description="Connect your Gmail (read-only) and Udaan will pull the postings out of your LinkedIn, Indeed and StepStone job alerts."
        action={connectAction}
      />
    );
  } else if (listings.length === 0) {
    body = (
      <FallbackState
        iconName="sparkles"
        title="No job alerts yet"
        description={
          status?.lastSyncedAt
            ? `Last synced ${formatTimestamp(status.lastSyncedAt)} — no job-alert emails found. Turn on alerts on LinkedIn, Indeed or StepStone and they'll show up here.`
            : "Nothing synced yet. Run a sync to pull in your job alerts."
        }
        action={<EmailSyncButton variant="primary" size="md" />}
      />
    );
  } else if (visible.length === 0) {
    body = (
      <FallbackState
        iconName="checkCircle"
        title="Nothing matches"
        description={
          hasActiveListingFilters(filters)
            ? "No listings match these filters."
            : "Nothing to show."
        }
        action={
          <Button
            variant="secondary"
            onClick={() => setFilters(DEFAULT_LISTING_FILTERS)}
          >
            Clear filters
          </Button>
        }
      />
    );
  } else {
    body = (
      <div className="space-y-3">
        {visible.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            saving={savingUrls.has(listing.url)}
            onSave={handleSave}
            onToggleHidden={(l) => hideMutation.mutate(l)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-agent-on-surface text-2xl font-bold">
            Opportunities
          </h1>
          <p className="text-agent-on-surface-variant mt-1 text-sm">
            {listings.length} from your job alerts · {savedCount} saved
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ModelSelector
            scope="email"
            variant="compact"
            label="Email AI model"
          />
          <EmailSyncButton />
        </div>
      </div>

      {!isLoading && listings.length > 0 && !isConnected && (
        <div className="border-agent-outline-variant bg-agent-surface-lowest flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3">
          <p className="text-agent-on-surface-variant text-xs">
            Gmail is disconnected — new job alerts won&apos;t sync until you
            reconnect.
          </p>
          {connectAction}
        </div>
      )}

      {listings.length > 0 && (
        <ListingFilterBar
          filters={filters}
          onChange={setFilters}
          availableSources={availableSources}
          locationOptions={locationOptions}
        />
      )}

      {body}
    </div>
  );
}
