// Shared job status definitions used in UI + Server Actions
export const JOB_STATUSES = [
  "BOOKMARKED",
  "DRAFT",
  "APPLIED",
  "INTERVIEW",
  "REJECTED",
  "OFFER",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export function isJobStatus(value: string): value is JobStatus {
  return (JOB_STATUSES as ReadonlyArray<string>).includes(value);
}
