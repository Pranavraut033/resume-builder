/**
 * What counts as a job-board digest / recommendation (vs. mail about an
 * application the user made). Pure and shared: the classifier, the Gmail
 * query and the server-side "convert misfiled alerts" pass all read this one
 * list, so they can't drift apart.
 */

// Exact-ish From fragments. Deliberately NOT bare platform domains: XING,
// LinkedIn (jobs-noreply@) and StepStone also send application mail.
const ALERT_SENDERS = [
  "jobalerts-noreply@linkedin.com",
  "jobs-listings@linkedin.com",
  "alert@indeed.com",
  "noreply@glassdoor",
  "@stepstone",
  "jobware",
  "@prodevs",
  "ziprecruiter",
  "wellfound",
  "otta.com",
];

const ALERT_SUBJECTS = [
  "job alert",
  "jobs for you",
  "new jobs",
  "jobs matching",
  "recommended for you",
  "recommended jobs",
  "job recommendation",
  "jobs you may be interested in",
  "new job request",
  "matches your profile",
  "neue jobs",
  "neue stellenangebote",
];

// A sender/subject hit is ignored when the subject is plainly about an
// application the user made ("Your application files are now together…").
const APPLICATION_SUBJECT =
  /your application|application (was )?(sent|received|status)|thank you for (applying|your application)|bewerbung/i;

export function isJobAlert(email: {
  sender: string;
  subject: string;
}): boolean {
  if (APPLICATION_SUBJECT.test(email.subject)) return false;
  const sender = email.sender.toLowerCase();
  const subject = email.subject.toLowerCase();
  return (
    ALERT_SENDERS.some((s) => sender.includes(s)) ||
    ALERT_SUBJECTS.some((s) => subject.includes(s))
  );
}

// Gmail-side gate: casts a wider net than isJobAlert (whole platform domains)
// because the classifier makes the final call. Its own pass so a burst of
// digests can't eat the application query's per-sync cap.
const QUERY_DOMAINS = [
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
  "stepstone.de",
  "xing.com",
  "jobware.de",
  "prodevs.io",
];

export const JOB_ALERT_QUERY =
  `from:(${QUERY_DOMAINS.join(" OR ")}) OR ` +
  `subject:(${ALERT_SUBJECTS.map((s) => `"${s}"`).join(" OR ")})`;
