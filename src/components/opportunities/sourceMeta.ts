/** Job-board sources (`JobListing.source`) — shared by the filter bar and the card. */
export const LISTING_SOURCES = [
  "linkedin",
  "indeed",
  "glassdoor",
  "stepstone",
  "xing",
  "jobware",
  "other",
] as const;

const LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  indeed: "Indeed",
  glassdoor: "Glassdoor",
  stepstone: "StepStone",
  xing: "Xing",
  jobware: "Jobware",
  other: "Other",
};

export function sourceLabel(source: string | null): string {
  return LABELS[source ?? "other"] ?? "Other";
}

export function sourceBadgeClass(source: string | null): string {
  switch (source) {
    case "linkedin":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "indeed":
      return "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";
    case "glassdoor":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "stepstone":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "xing":
      return "bg-teal-500/15 text-teal-400 border-teal-500/30";
    default:
      return "bg-slate-500/15 text-slate-400 border-slate-500/30";
  }
}
