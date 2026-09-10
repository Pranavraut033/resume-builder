import { JobRecord } from "@/actions/job";
import { FIT_LEVEL_META } from "@/components/job-v2/FitCheckDrawer";
import cn from "@/lib/cn";
import { resolveFitLevel } from "@/lib/jobs/fitLevel";
import { FitLevel } from "@/types/fitCheck";

const FIT_LEVELS = Object.keys(FIT_LEVEL_META) as FitLevel[];

export interface JobFilters {
  showHidden: boolean;
  hideRejected: boolean;
  fitLevels: FitLevel[];
}

export const DEFAULT_FILTERS: JobFilters = {
  showHidden: false,
  hideRejected: false,
  fitLevels: [],
};

export function hasActiveFilters(filters: JobFilters): boolean {
  return (
    filters.showHidden || filters.hideRejected || filters.fitLevels.length > 0
  );
}

/** Pure predicate — kept separate from JobTableClient so it's unit-testable
 * without mounting the table. */
export function matchesFilters(
  job: Pick<JobRecord, "hiddenAt" | "status" | "fitCheck" | "resume">,
  filters: JobFilters
): boolean {
  if (!filters.showHidden && job.hiddenAt) return false;
  if (filters.hideRejected && job.status === "REJECTED") return false;
  if (filters.fitLevels.length > 0) {
    const fitLevel = resolveFitLevel(job);
    if (!fitLevel || !filters.fitLevels.includes(fitLevel)) return false;
  }
  return true;
}

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

export default function FilterBar({
  filters,
  onChange,
}: {
  filters: JobFilters;
  onChange: (filters: JobFilters) => void;
}) {
  const toggleFitLevel = (level: FitLevel) => {
    const fitLevels = filters.fitLevels.includes(level)
      ? filters.fitLevels.filter((l) => l !== level)
      : [...filters.fitLevels, level];
    onChange({ ...filters, fitLevels });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip
        active={filters.hideRejected}
        onClick={() =>
          onChange({ ...filters, hideRejected: !filters.hideRejected })
        }
      >
        Hide rejected
      </Chip>
      <Chip
        active={filters.showHidden}
        onClick={() =>
          onChange({ ...filters, showHidden: !filters.showHidden })
        }
      >
        Show hidden
      </Chip>

      <span className="bg-agent-outline-variant mx-1 h-4 w-px" />

      {FIT_LEVELS.map((level) => (
        <Chip
          key={level}
          active={filters.fitLevels.includes(level)}
          onClick={() => toggleFitLevel(level)}
        >
          {FIT_LEVEL_META[level].label}
        </Chip>
      ))}

      {hasActiveFilters(filters) && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="text-agent-on-surface-variant hover:text-agent-primary text-xs font-medium underline-offset-2 hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
