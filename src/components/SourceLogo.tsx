"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import {
  sourceBadgeClass,
  sourceLabel,
} from "@/components/opportunities/sourceMeta";
import cn from "@/lib/cn";

/**
 * The platform something came through (a job board for a listing, the relay or
 * ATS for an email), as a small round logo — meant for the
 * corner of a `CompanyAvatar`. The logo is the site's own favicon (same
 * lookup CompanyAvatar uses), taken from the listing URL so unlisted boards
 * get theirs too; if it can't load (offline desktop, blocked), it falls back
 * to the board's initial on its brand colour.
 */
export function SourceLogo({
  url,
  source = null,
  label: labelOverride,
}: {
  /** Any page on the platform; only its host is used for the logo. */
  url: string;
  /** A known board key (see sourceMeta); tints the fallback and names the badge. */
  source?: string | null;
  /** Explicit name, for platforms outside the known set. */
  label?: string;
}) {
  const [failed, setFailed] = useState(false);
  const label = labelOverride ?? sourceLabel(source);
  const host = useMemo(() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  }, [url]);

  return (
    <span
      title={label}
      role="img"
      aria-label={`From ${label}`}
      className={cn(
        "ring-agent-surface-lowest flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border bg-white ring-2",
        failed || !host ? sourceBadgeClass(source) : "border-black/10"
      )}
    >
      {host && !failed ? (
        <Image
          src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`}
          alt=""
          width={16}
          height={16}
          unoptimized
          draggable={false}
          className="h-4 w-4 object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-[10px] leading-none font-bold">
          {label.charAt(0)}
        </span>
      )}
    </span>
  );
}
