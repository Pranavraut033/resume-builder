/** Email classification stages (`JobEmail.stage`) — shared by /emails and JobEmailsModal. */
export const EMAIL_STAGES = [
  "APPLIED",
  "ASSESSMENT",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
  "INFO",
] as const;

export type EmailStage = (typeof EMAIL_STAGES)[number];

export function stageBadgeClass(stage: string | null): string {
  switch (stage) {
    case "INTERVIEW":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "OFFER":
      return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    case "ASSESSMENT":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "REJECTED":
      return "bg-rose-500/15 text-rose-400 border-rose-500/30";
    case "APPLIED":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    default:
      return "bg-slate-500/15 text-slate-400 border-slate-500/30";
  }
}
