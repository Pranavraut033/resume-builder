"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { cn } from "@/lib/cn";

// Displays a company logo (fetched via Clearbit) with graceful fallbacks
interface CompanyAvatarProps {
  name?: string | null;
  size?: number;
}

const COLORS = [
  "bg-sky-200 text-sky-900",
  "bg-emerald-200 text-emerald-900",
  "bg-amber-200 text-amber-900",
  "bg-purple-200 text-purple-900",
  "bg-pink-200 text-pink-900",
  "bg-blocky-300 text-blocky-900",
];

function getInitials(name?: string | null) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function buildLogoUrl(name?: string | null) {
  if (!name) return null;
  const domain = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 40);
  if (!domain) return null;
  return `https://logo.clearbit.com/${domain}.com`;
}

export function CompanyAvatar({ name, size = 48 }: CompanyAvatarProps) {
  const [failed, setFailed] = useState(false);
  const initials = useMemo(() => getInitials(name), [name]);
  const logoUrl = useMemo(() => buildLogoUrl(name), [name]);
  const colorClass = useMemo(() => {
    if (!name) return COLORS[0];
    const seed = name.charCodeAt(0) + name.length;
    return COLORS[seed % COLORS.length];
  }, [name]);

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-2xl border border-black/10 font-semibold uppercase shadow-sm",
        colorClass
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {logoUrl && !failed ? (
        <Image
          src={logoUrl}
          alt={`${name ?? "Company"} logo`}
          width={size}
          height={size}
          className="bg-white object-contain p-1.5"
          onError={() => setFailed(true)}
          draggable={false}
        />
      ) : (
        <span className="text-sm font-bold tracking-wider">{initials}</span>
      )}
    </div>
  );
}

export default CompanyAvatar;
