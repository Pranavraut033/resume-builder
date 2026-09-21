import { Icon } from "@/components/ui/Icon";
import cn from "@/lib/cn";

import { EMAIL_STAGES } from "./stageMeta";

import type { TrackedEmail } from "@/actions/emailSync";

export interface EmailFilters {
  search: string;
  showHidden: boolean;
  actionRequired: boolean;
  unlinked: boolean;
  stages: string[];
}

export const DEFAULT_EMAIL_FILTERS: EmailFilters = {
  search: "",
  showHidden: false,
  actionRequired: false,
  unlinked: false,
  stages: [],
};

export function hasActiveEmailFilters(filters: EmailFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.showHidden ||
    filters.actionRequired ||
    filters.unlinked ||
    filters.stages.length > 0
  );
}

/** Pure predicate — kept apart from the page so it's unit-testable without mounting. */
export function matchesEmailFilters(
  email: Pick<
    TrackedEmail,
    | "hiddenAt"
    | "actionRequired"
    | "jobId"
    | "stage"
    | "subject"
    | "sender"
    | "companyName"
    | "snippet"
  >,
  filters: EmailFilters
): boolean {
  if (!filters.showHidden && email.hiddenAt) return false;
  if (filters.actionRequired && !email.actionRequired) return false;
  if (filters.unlinked && email.jobId !== null) return false;
  if (
    filters.stages.length > 0 &&
    !(email.stage && filters.stages.includes(email.stage))
  ) {
    return false;
  }
  const query = filters.search.trim().toLowerCase();
  if (query) {
    const haystack = `${email.subject} ${email.sender} ${email.companyName ?? ""} ${email.snippet}`;
    if (!haystack.toLowerCase().includes(query)) return false;
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

export function EmailFilterBar({
  filters,
  onChange,
  groupByJob,
  onGroupByJobChange,
}: {
  filters: EmailFilters;
  onChange: (next: EmailFilters) => void;
  groupByJob: boolean;
  onGroupByJobChange: (next: boolean) => void;
}) {
  const toggleStage = (stage: string) =>
    onChange({
      ...filters,
      stages: filters.stages.includes(stage)
        ? filters.stages.filter((s) => s !== stage)
        : [...filters.stages, stage],
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Icon
            name="search"
            size={15}
            className="text-agent-outline pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search subject, sender or snippet…"
            aria-label="Search emails"
            className="border-agent-outline-variant bg-agent-surface-lowest text-agent-on-surface placeholder:text-agent-outline focus:border-agent-primary w-full rounded-xl border py-2 pr-3 pl-9 text-sm focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => onGroupByJobChange(!groupByJob)}
          aria-pressed={groupByJob}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
            groupByJob
              ? "border-agent-primary text-agent-primary bg-agent-surface-lowest"
              : "border-agent-outline-variant bg-agent-surface-lowest text-agent-on-surface-variant hover:text-agent-on-surface"
          )}
        >
          <Icon name="link" size={14} />
          Group by job
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Chip
          active={filters.actionRequired}
          onClick={() =>
            onChange({ ...filters, actionRequired: !filters.actionRequired })
          }
        >
          Needs action
        </Chip>
        <Chip
          active={filters.unlinked}
          onClick={() => onChange({ ...filters, unlinked: !filters.unlinked })}
        >
          Unlinked
        </Chip>
        <Chip
          active={filters.showHidden}
          onClick={() =>
            onChange({ ...filters, showHidden: !filters.showHidden })
          }
        >
          Show hidden
        </Chip>
        <span className="bg-agent-outline-variant mx-1 h-4 w-px" aria-hidden />
        {EMAIL_STAGES.map((stage) => (
          <Chip
            key={stage}
            active={filters.stages.includes(stage)}
            onClick={() => toggleStage(stage)}
          >
            {stage.charAt(0) + stage.slice(1).toLowerCase()}
          </Chip>
        ))}
      </div>
    </div>
  );
}
