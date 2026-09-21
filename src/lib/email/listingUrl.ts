export type ListingSource =
  | "linkedin"
  | "indeed"
  | "glassdoor"
  | "stepstone"
  | "xing"
  | "jobware"
  | "other";

const SOURCE_HOSTS: [string, ListingSource][] = [
  ["linkedin.com", "linkedin"],
  ["indeed.", "indeed"],
  ["glassdoor.", "glassdoor"],
  ["stepstone.", "stepstone"],
  ["xing.com", "xing"],
  ["jobware.", "jobware"],
];

/**
 * Digest links carry per-email tracking params (LinkedIn's `/comm/jobs/view/ID/?trackingId=…`),
 * so the same posting arrives under a fresh URL every time. Dedupe only works on this form.
 */
export function normalizeListingUrl(url: string): string {
  try {
    const u = new URL(url.trim());
    const path = u.pathname.replace(/^\/comm\//, "/").replace(/\/+$/, "");
    // Indeed identifies the posting by ?jk=, so it's the one query param worth keeping.
    const jk = u.hostname.includes("indeed.") ? u.searchParams.get("jk") : null;
    return `${u.protocol}//${u.hostname.toLowerCase()}${path}${jk ? `?jk=${jk}` : ""}`;
  } catch {
    return url.trim();
  }
}

export function detectSource(url: string): ListingSource {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return SOURCE_HOSTS.find(([h]) => host.includes(h))?.[1] ?? "other";
  } catch {
    return "other";
  }
}

/**
 * Collapses every URL in a digest body to its normalized form. LinkedIn puts a
 * ~700-char tracking URL on each posting, so without this a body cap holds one
 * or two jobs and the LLM prompt is mostly tracking noise.
 */
export function shortenUrls(text: string): string {
  return text.replace(/https?:\/\/[^\s<>()"']+/g, (u) =>
    normalizeListingUrl(u)
  );
}
