export interface JobSite {
  key: string;
  name: string;
}

export const JOB_SITES: JobSite[] = [
  { key: "google", name: "Google Jobs" },
  { key: "linkedin", name: "LinkedIn" },
  { key: "indeed", name: "Indeed" },
  { key: "glassdoor", name: "Glassdoor" },
];

/**
 * Constructs pre-encoded search URLs for all supported job sites.
 * Returns a mapping of site key → URL.
 */
export function buildSearchUrls(
  query: string,
  location: string
): Record<string, string> {
  const q = encodeURIComponent(query.trim());
  const l = encodeURIComponent(location.trim());

  return {
    google: `https://www.google.com/search?q=${q}+jobs+${l}&ibp=htl;jobs`,
    linkedin: `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${l}`,
    indeed: `https://www.indeed.com/jobs?q=${q}&l=${l}`,
    glassdoor: `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${q}&locT=C&locId=${l}`,
  };
}
