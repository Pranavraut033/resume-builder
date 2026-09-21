"use client";

import Link from "next/link";

import CompanyAvatar from "@/components/CompanyAvatar";
import { SourceLogo } from "@/components/SourceLogo";
import { Icon } from "@/components/ui/Icon";
import { formatTimestamp } from "@/lib";
import cn from "@/lib/cn";

import type { JobListingRow } from "@/actions/emailSync";

interface ListingCardProps {
  listing: JobListingRow;
  /** A bookmark parse for this posting is queued or running. */
  saving?: boolean;
  onSave: (listing: JobListingRow) => void;
  onToggleHidden: (listing: JobListingRow) => void;
}

const actionButton =
  "text-agent-on-surface-variant hover:text-agent-primary flex items-center gap-1 text-xs font-medium transition-colors disabled:opacity-50";

export function ListingCard({
  listing,
  saving,
  onSave,
  onToggleHidden,
}: ListingCardProps) {
  const isDismissed = Boolean(listing.hiddenAt);
  const subtitle = [listing.companyName, listing.location]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className={cn(
        "border-agent-outline-variant bg-agent-surface-lowest hover:border-agent-outline space-y-3 rounded-xl border p-4 transition-colors",
        isDismissed && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        <CompanyAvatar
          name={listing.companyName}
          size={44}
          shape="circle"
          badge={<SourceLogo source={listing.source} url={listing.url} />}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-agent-on-surface text-sm font-medium">
              {listing.title}
            </h3>
            <span className="text-agent-on-surface-variant shrink-0 text-[11px] whitespace-nowrap">
              {listing.postedText ?? formatTimestamp(listing.firstSeenAt)}
            </span>
          </div>
          {subtitle && (
            <p className="text-agent-on-surface-variant text-xs">{subtitle}</p>
          )}
          {(listing.savedJobId !== null || isDismissed) && (
            <div className="flex flex-wrap items-center gap-2">
              {listing.savedJobId !== null && (
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                  Saved
                </span>
              )}
              {isDismissed && (
                <span className="border-agent-outline-variant text-agent-outline rounded-full border px-2 py-0.5 text-[11px] font-medium">
                  Dismissed
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-agent-outline-variant flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3">
        {listing.savedJobId !== null ? (
          <Link
            href={`/job/${listing.savedJobId}`}
            className={cn(actionButton, "text-agent-primary")}
          >
            <Icon name="link" size={13} />
            View saved job
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onSave(listing)}
            disabled={saving}
            className={cn(actionButton, "text-agent-primary")}
          >
            <Icon
              name={saving ? "spinner" : "bookmark"}
              size={13}
              className={saving ? "animate-spin" : undefined}
            />
            {saving ? "Saving…" : "Save"}
          </button>
        )}
        <a
          href={listing.url}
          target="_blank"
          rel="noreferrer"
          className={actionButton}
        >
          Open
        </a>
        <button
          type="button"
          onClick={() => onToggleHidden(listing)}
          className={cn(actionButton, "ml-auto")}
        >
          <Icon name={isDismissed ? "eye" : "eyeOff"} size={13} />
          {isDismissed ? "Restore" : "Dismiss"}
        </button>
      </div>
    </article>
  );
}
