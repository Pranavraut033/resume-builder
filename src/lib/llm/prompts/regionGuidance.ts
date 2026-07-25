/**
 * DE/EU region guidance fragment.
 * Condensed from the resume-toolkit skill's `germany-eu.md` reference —
 * US resume/cover-letter conventions partly conflict with German/EU
 * expectations, so this fragment is only surfaced when the target job
 * looks EU-based, and it explicitly flags where it overrides a US default
 * (1-page rule, cutting hobbies) rather than silently picking one.
 */

import { JobDetailsJSON } from "@/types/resume";

// Country strings/codes that plausibly indicate an EU/DE target. Deliberately
// small and literal.
const EU_COUNTRY_SIGNALS = [
  "germany",
  "deutschland",
  "de",
  "austria",
  "österreich",
  "at",
  "switzerland",
  "schweiz",
  "ch",
  "france",
  "netherlands",
  "belgium",
  "spain",
  "italy",
  "poland",
  "sweden",
  "denmark",
  "finland",
  "ireland",
  "portugal",
  "eu",
  "european union",
];

// German-language words/characters unlikely to appear in an English JD by
// accident — a light-touch signal, not a real language detector.
const GERMAN_LANGUAGE_SIGNALS = [
  /\bwir suchen\b/i,
  /\bihre aufgaben\b/i,
  /\bihr profil\b/i,
  /\bbewerbung\b/i,
  /\bstellenangebot\b/i,
  /\bmitarbeiter(in)?\b/i,
  /[äöüß]/i,
];

function isEuCountry(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return EU_COUNTRY_SIGNALS.includes(normalized);
}

function hasGermanLanguageSignal(
  rawDescription: string | null | undefined
): boolean {
  if (!rawDescription) return false;
  return GERMAN_LANGUAGE_SIGNALS.some((pattern) =>
    pattern.test(rawDescription)
  );
}

const REGION_GUIDANCE_FRAGMENT = `\
DE/EU REGION GUIDANCE — apply on top of the analysis above; where it conflicts \
with a US default this prompt otherwise applies, say so explicitly rather than \
silently picking one:
- Language proficiency: use CEFR levels ("German — B2", never vague "fluent"). If the JD asks for German and the resume is silent, flag it — silence reads as "none". In-progress language should show trajectory (e.g. "B1 (B2-Kurs in progress)"), not just a bare level.
- Work authorization is the most common real knockout for non-EU candidates — advise stating status plainly and early (e.g. EU Blue Card, Chancenkarte, or "requires sponsorship") rather than leaving it silent.
- Expect gapless chronology: German recruiters read the CV as a complete timeline, so unexplained gaps of roughly 2+ months need a one-line account.
- 2 pages is normal and expected in Germany even mid-career — this overrides any 1-page US compression advice elsewhere in this prompt.
- If the JD is in German, the application (and cover letter) should be in German too — flag an English application to a German-language JD as a likely silent rejection, and warn that visibly machine-translated German reads worse than a clean English application.
- If the degree/institution isn't well known in Germany, suggest a one-line equivalence note (e.g. "recognized as equivalent to a German Bachelor's").
- Don't recommend Europass unless the target is an EU institution or public body — most companies find it clunky.
- Keep an Interessen/hobbies line rather than advising it be cut (this overrides the usual "cut hobbies" US default) — make it specific and integration-flavored rather than generic.`;

/**
 * Detect whether a job target looks EU/DE-based and, if so, return the
 * condensed region-guidance fragment to fold into ATS/cover-letter prompts.
 * Returns `undefined` when nothing EU-like is detected so templates can
 * gate on it with `{{#if regionGuidance}}`.
 *
 * // ponytail: this is a literal country-string/keyword check, not real
 * // geo/language detection — it will miss less common country spellings,
 * // ISO variants, or JDs that mention Germany only in prose (e.g. "remote,
 * // reports to our Berlin office"). The upgrade path is a user-set region
 * // field on Job, not a smarter heuristic.
 */
export function resolveRegionGuidance(
  job: JobDetailsJSON | null | undefined
): string | undefined {
  if (!job) return undefined;

  const isEuTarget =
    isEuCountry(job.location?.country) ||
    isEuCountry(job.company?.company_location_country) ||
    hasGermanLanguageSignal(job.raw_description);

  return isEuTarget ? REGION_GUIDANCE_FRAGMENT : undefined;
}
