import { FitCheckSchema, FitLevel } from "@/types/fitCheck";

/**
 * Parses a persisted FitCheck blob's `contentJson` into a `FitLevel`. A blob
 * that predates the `v: 2` shape fails to parse on purpose — treated as
 * "never run" rather than crashing the caller (the same contract
 * getAllDocuments/FitCheckDrawer/safeParseFitCheck all follow). No `prisma`
 * import here on purpose — this needs to be safe to import from client
 * components (e.g. the home dashboard's fit filter) as well as server code.
 */
export function parseFitLevel(
  contentJson: string | null | undefined
): FitLevel | null {
  if (!contentJson) return null;
  try {
    const result = FitCheckSchema.safeParse(JSON.parse(contentJson));
    return result.success ? result.data.fit_level : null;
  } catch {
    return null;
  }
}

/**
 * A job's fit level, preferring the in-editor (resume-level) check over the
 * bookmark-stage (job-level) one once a resume exists.
 */
export function resolveFitLevel(job: {
  fitCheck?: { contentJson: string } | null;
  resume?: { fitCheck?: { contentJson: string } | null } | null;
}): FitLevel | null {
  const contentJson =
    job.resume?.fitCheck?.contentJson ?? job.fitCheck?.contentJson;
  return parseFitLevel(contentJson);
}
