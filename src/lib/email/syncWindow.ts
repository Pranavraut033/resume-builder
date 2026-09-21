/**
 * How far back a sync may reach. A hard floor on the Gmail `after:` bound for
 * every pass: a first connect, a long-idle install (lastSyncedAt months old),
 * and the alert backfill all stop here, so a sync can't fan out into hundreds
 * of per-message classification/LLM calls. Older mail is deliberately ignored.
 */
export const MAX_EMAIL_AGE_DAYS = 28;

const DAY_MS = 24 * 60 * 60 * 1000;
const OVERLAP_MS = 5 * 60 * 1000;

/**
 * `resumeFrom` is where the pass left off (ISO), or null when it never ran.
 * Resumes 5 minutes early so mail arriving mid-sync isn't missed, but never
 * earlier than the age floor.
 */
export function syncAfter(
  resumeFrom: string | null,
  now: number = Date.now()
): Date {
  const floor = now - MAX_EMAIL_AGE_DAYS * DAY_MS;
  const resume = resumeFrom ? new Date(resumeFrom).getTime() - OVERLAP_MS : NaN;
  return new Date(Number.isNaN(resume) ? floor : Math.max(resume, floor));
}
