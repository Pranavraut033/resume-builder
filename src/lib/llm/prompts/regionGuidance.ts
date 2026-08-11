/**
 * Market-convention fragment folded into resume/ATS/cover-letter prompts.
 *
 * Germany is the DEFAULT market for this app, so the fragment is returned
 * unless the job looks clearly non-EU (US/UK/CA/AU/IN/…). German conventions
 * conflict with US defaults on length, photo, hobbies, language levels and
 * gapless chronology, so the fragment states where it overrides rather than
 * leaving the model to pick silently.
 *
 * Content is condensed from ../../../../../interview-kb/playbooks/resume-playbook.md
 * (Part II — the German Lebenslauf). Firsthand hiring-manager claims are kept;
 * vendor-only and undated disagreements (photo, date of birth, signature block,
 * profile summary) are deliberately left out — the job ad decides those, and the
 * playbook's own reconciliation says the ad beats every default.
 */

import { JobDetailsJSON } from "@/types/resume";

// Countries where the German conventions below are actively wrong. Everything
// else — including an unknown/unstated location — falls through to the German
// default, because that's what this app's users are applying into.
const NON_EU_COUNTRY_SIGNALS = [
  "united states",
  "united states of america",
  "usa",
  "us",
  "u.s.",
  "u.s.a.",
  "canada",
  "ca",
  "united kingdom",
  "uk",
  "great britain",
  "england",
  "scotland",
  "australia",
  "au",
  "new zealand",
  "nz",
  "india",
  "in",
  "singapore",
  "sg",
  "united arab emirates",
  "uae",
  "japan",
  "jp",
  "china",
  "cn",
  "brazil",
  "br",
  "israel",
  "il",
  "south africa",
  "za",
  "mexico",
  "mx",
];

function isNonEuCountry(value: string | null | undefined): boolean {
  if (!value) return false;
  return NON_EU_COUNTRY_SIGNALS.includes(value.trim().toLowerCase());
}

const REGION_GUIDANCE_FRAGMENT = `\
GERMAN / EU MARKET CONVENTIONS (this app's default market — apply on top of \
everything above; an explicit instruction in the job ad beats every default \
here, and where this conflicts with a US convention stated elsewhere in this \
prompt, this wins):
- Format is a gate before content: a crowded or inconsistent CV is rejected before a single bullet is read. Two spacious pages are normal and expected even mid-career — never compress to one page.
- Reading order is work experience first, then personal details, education last (education is a bonus, not a filter). Keep the strongest, most recent evidence at the top of the experience section.
- Telegraphic style: no first-person pronouns, no full sentences — "Design of the billing service", "Reduced latency 40% by …". 3–7 bullets per role, identical layout for every role.
- List multiple roles at the same employer as separate dated entries rather than nesting them under one company block — it shows growth.
- Dates carry month and year in one consistent format everywhere (MM/YYYY); an ongoing role reads "since MM/YYYY".
- Gapless chronology: German readers read the CV as a complete timeline, so a gap of roughly 2+ months wants a one-line account — use training, study, or a current activity already present in the profile; never invent one.
- Language proficiency as CEFR levels ("German — B2"), never a vague "fluent". In-progress language shows trajectory ("B1, B2 course until 03/2026"). No skill bars, dots, percentages or star ratings for any proficiency — words only.
- Work authorization is the most common real knockout for non-EU candidates: when the profile states nationality or status (EU Blue Card, Chancenkarte, sponsorship required), keep it plainly and early rather than dropping it.
- A degree unknown in Germany reads as unverifiable — keep an equivalence note (e.g. anabin recognition) when the profile already has one. State a grade explicitly labelled ("Final grade: 2.1") when the profile gives one.
- Keep a short, specific Interessen/hobbies line when the profile has one — this overrides the usual US "cut hobbies" advice. Specific beats generic: "nature photography", not "photography".
- No icons, logos, or graphics: name tools, software and programming languages in words, since the first reader may not be from your field.
- If the job ad is written in German, the application is expected in German too.
- The cover letter (Motivationsschreiben) is read after the CV and is expected to complement it and show culture fit, never to repeat it. It is one part of a Bewerbung — a bundle that also carries diplomas with grades and employer certificates — so it doesn't have to carry the whole application on its own.`;

/**
 * Return the market-convention fragment for a job. Germany is the default, so
 * this returns the fragment unless the job's country is clearly outside the
 * EU — then `undefined`, and templates gate on `{{#if regionGuidance}}`.
 *
 * // ponytail: literal country-string matching, not geo detection. A US job
 * // whose country field is empty gets German guidance; that's the deliberate
 * // trade for defaulting to the market these users actually apply into. The
 * // upgrade path is a user-set region field on Job, not a smarter heuristic.
 */
export function resolveRegionGuidance(
  job: JobDetailsJSON | null | undefined
): string | undefined {
  if (!job) return undefined;

  const country =
    job.location?.country ?? job.company?.company_location_country ?? null;

  return isNonEuCountry(country) ? undefined : REGION_GUIDANCE_FRAGMENT;
}
