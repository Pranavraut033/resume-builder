"use client";

import { useState } from "react";

import { FIT_LEVEL_META } from "@/components/job-v2/FitCheckDrawer";
import { Icon } from "@/components/ui/Icon";
import cn from "@/lib/cn";
import { FitLevel } from "@/types/fitCheck";

const FIT_LEVELS = Object.keys(FIT_LEVEL_META) as FitLevel[];
export const CLEANUP_AGE_OPTIONS = [30, 60, 90] as const;

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
        "rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors",
        active
          ? "border-agent-primary bg-agent-primary text-agent-on-primary"
          : "border-agent-outline-variant bg-agent-surface-lowest text-agent-on-surface-variant hover:text-agent-on-surface"
      )}
    >
      {children}
    </button>
  );
}

interface BookmarkToolbarProps {
  urlInput: string;
  onUrlInputChange: (value: string) => void;
  onAdd: () => void;
  canAdd: boolean;

  search: string;
  onSearchChange: (value: string) => void;

  fitLevels: FitLevel[];
  onToggleFitLevel: (level: FitLevel) => void;

  cleanupDays: number;
  onCleanupDaysChange: (days: number) => void;
  onCleanup: () => void;
  cleanupCount: number;
}

export default function BookmarkToolbar({
  urlInput,
  onUrlInputChange,
  onAdd,
  canAdd,
  search,
  onSearchChange,
  fitLevels,
  onToggleFitLevel,
  cleanupDays,
  onCleanupDaysChange,
  onCleanup,
  cleanupCount,
}: BookmarkToolbarProps) {
  const [addExpanded, setAddExpanded] = useState(false);

  return (
    <div className="space-y-3">
      {/* Add URL — collapses to a single-line affordance until focused */}
      <div className="border-agent-outline-variant bg-agent-surface-lowest rounded-2xl border p-3">
        {addExpanded ? (
          <>
            <textarea
              autoFocus
              value={urlInput}
              onChange={(e) => onUrlInputChange(e.target.value)}
              onBlur={() => !urlInput.trim() && setAddExpanded(false)}
              rows={3}
              placeholder="https://example.com/job-posting (one per line, or comma-separated)"
              className="border-agent-outline-variant placeholder:text-agent-on-surface-variant focus:border-agent-primary focus:ring-agent-primary w-full resize-none rounded-xl border bg-(--color-agent-surface-lowest) px-4 py-3 text-sm text-(--color-agent-on-surface) focus:ring-1 focus:outline-none"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  onUrlInputChange("");
                  setAddExpanded(false);
                }}
                className="text-agent-on-surface-variant rounded-xl px-4 py-2.5 text-sm font-medium hover:opacity-80"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onAdd();
                  setAddExpanded(false);
                }}
                disabled={!canAdd}
                className="bg-agent-primary rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setAddExpanded(true)}
            className="text-agent-on-surface-variant hover:border-agent-primary hover:text-agent-primary flex w-full items-center gap-2 rounded-xl border border-dashed border-(--color-agent-outline-variant) px-4 py-2.5 text-left text-sm transition"
          >
            <Icon name="plus" size={16} />
            Paste a job posting URL…
          </button>
        )}
      </div>

      {/* Search + filters + cleanup */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <label className="border-agent-outline-variant bg-agent-surface-lowest flex min-w-[180px] flex-1 items-center gap-2 rounded-xl border px-3 py-1.5 sm:flex-initial">
            <Icon
              name="search"
              size={14}
              className="text-agent-on-surface-variant shrink-0"
            />
            <span className="sr-only">Search bookmarks</span>
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search company or role"
              className="text-agent-on-surface min-w-0 flex-1 border-none bg-transparent text-sm focus:outline-none"
            />
          </label>
          {FIT_LEVELS.map((level) => (
            <Chip
              key={level}
              active={fitLevels.includes(level)}
              onClick={() => onToggleFitLevel(level)}
            >
              {FIT_LEVEL_META[level].label}
            </Chip>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <select
            value={cleanupDays}
            onChange={(e) => onCleanupDaysChange(Number(e.target.value))}
            className="border-agent-outline-variant bg-agent-surface-lowest text-agent-on-surface-variant rounded-lg border px-2 py-1.5 text-xs font-medium focus:outline-none"
          >
            {CLEANUP_AGE_OPTIONS.map((days) => (
              <option key={days} value={days}>
                Older than {days}d
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onCleanup}
            disabled={cleanupCount === 0}
            className="border-agent-outline-variant text-agent-on-surface-variant flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:border-red-300 hover:text-red-500 disabled:opacity-40"
          >
            <Icon name="trash" size={13} />
            Delete old{cleanupCount > 0 ? ` (${cleanupCount})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
