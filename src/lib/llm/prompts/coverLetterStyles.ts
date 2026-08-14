/**
 * Cover letter writing-flow styles.
 * Each style's `promptFragment` replaces the template's STRUCTURE block
 * wholesale — it carries its own paragraph count and length budget.
 * `promptFragment: null` (standard) means "use the template's built-in
 * structure", so the prompt template needs no entry for it.
 */

import { isGermanEuJob } from "@/lib/llm/prompts/regionGuidance";
import { JobDetailsJSON } from "@/types/resume";

export interface CoverLetterStyle {
  label: string;
  description: string;
  promptFragment: string | null;
}

export const COVER_LETTER_STYLES = {
  standard: {
    label: "Standard (impact-first)",
    description: "Hook, proof of impact, company fit, close. The safe default.",
    promptFragment: null,
  },
  narrative: {
    label: "Story-driven",
    description: "One real achievement told as a story, start to finish.",
    promptFragment: `- Tell ONE story from the resume — the achievement most like this job's core problem. Do not list unrelated achievements.
- Para 1 — Scene: open mid-story at the moment of tension (the problem the candidate faced); one sentence to establish stakes, no scene-setting fluff
- Para 2 — Resolution: how they solved it and the measurable outcome, using only numbers present in the resume
- Para 3 — Bridge: why that story is exactly what this role at this company needs; name the role and company here, not earlier
- Para 4 — Close: one forward-looking sentence
- 4 paragraphs, each 2–3 sentences; the story thread must run unbroken through all of them`,
  },
  problemSolution: {
    label: "Problem–solution",
    description: "Opens with the pain point this role exists to solve.",
    promptFragment: `- Para 1 — The problem: name the specific pain point this role exists to solve, inferred strictly from the job's responsibilities and requirements — show the candidate understands it better than other applicants; mention the candidate only in the final sentence
- Para 2 — The evidence: 1–2 resume achievements proving the candidate has solved this class of problem before, with existing numbers
- Para 3 — The approach + close: one or two sentences on how the candidate would approach this problem (grounded ONLY in how they solved it before — no invented plans), then invite next steps
- 3 paragraphs, each 2–4 sentences`,
  },
  shortPunchy: {
    label: "Short & punchy",
    description: "3 tight paragraphs, under 150 words.",
    promptFragment: `- Exactly 3 short paragraphs, under 150 words total
- Para 1 — Hook: one or two sentences, the candidate's single strongest metric or fact aimed at the job's top requirement
- Para 2 — Proof: two sentences mapping 1–2 achievements to what the role needs
- Para 3 — Close: one sentence
- Every sentence under 20 words; if a word can be cut, cut it`,
  },
  cultureFit: {
    label: "Enthusiastic culture-fit",
    description: "Leads with a specific company signal, not a generic pitch.",
    promptFragment: `- Para 1 — Company signal: open with a concrete, specific detail about the company (product, mission, scale, stated challenge — only what the job details support) and why it genuinely matters to the candidate, evidenced by their actual background
- Para 2 — Proof of alignment: 1–2 achievements from the resume showing the candidate already works the way this company works; quantify with existing data only
- Para 3 — Contribution: what the candidate would bring to this specific team, grounded strictly in resume facts — enthusiasm expressed through specificity, never adjectives
- Para 4 — Close: one warm, forward-looking sentence, no flattery
- 4 paragraphs, each 2–3 sentences`,
  },
  anschreiben: {
    label: "Anschreiben (German formal)",
    description:
      "Formal German business register, Betreff line, ~1 page — for DE/AT/CH applications.",
    promptFragment: `- Write the letter in the job description's language — if the JD is in German, write in German; do not machine-translate a generic English draft into German
- Formal German business register throughout: "Sehr geehrte Damen und Herren" if no contact is named, or "Sehr geehrte/r Herr/Frau [Name]" if the job details name a recruiter/contact
- Open with a Betreff (subject) line stating the role, e.g. "Betreff: Bewerbung als [Job Title]"
- Para 1 — Motivation: why this role and company specifically, grounded in the job details, not generic enthusiasm
- Para 2 — Evidence: 1–2 concrete achievements from the resume mapped to the role's core requirements, quantified using only existing data
- Para 3 — Availability and fit: state availability (Eintrittstermin) if the job details mention a start date; only mention salary expectation (Gehaltsvorstellung) if the job description explicitly asks for it
- Close with "Mit freundlichen Grüßen" followed by the candidate's name
- ~1 page (3 paragraphs plus Betreff and closing), formal register throughout — no casual idioms`,
  },
} as const satisfies Record<string, CoverLetterStyle>;

export type CoverLetterStyleId = keyof typeof COVER_LETTER_STYLES;

export const DEFAULT_COVER_LETTER_STYLE: CoverLetterStyleId = "standard";

// German stopwords/umlauts common enough in a job ad's body that seeing
// several is a reliable signal the ad itself is written in German — as
// opposed to a German/EU-based role posted in English, which is common in
// tech and shouldn't default into a German-register letter (anschreiben's
// salutation/sign-off phrases are hardcoded German, not translated per JD).
// ponytail: word-list heuristic, not a language detector — false negatives
// on a short/sparse JD just fall back to the standard style, which is
// harmless. Upgrade path: a real langdetect if this misfires in practice.
const GERMAN_TEXT_SIGNALS =
  /[äöüß]|\b(und|der|die|das|mit|für|ist|sind|wir|Sie|Ihre|Unternehmen|Bewerbung|Kenntnisse|Erfahrung|Aufgaben|Anforderungen)\b/g;

function looksGerman(text: string | null | undefined): boolean {
  if (!text) return false;
  const matches = text.match(GERMAN_TEXT_SIGNALS);
  return (matches?.length ?? 0) >= 4;
}

/**
 * Default style for the generate-cover-letter dropdown: `anschreiben` when
 * the job is both DE/EU-market (same signal `resolveRegionGuidance` uses)
 * and the ad itself reads as German — otherwise the usual `standard`
 * default. Always overridable in the dropdown.
 */
export function resolveDefaultCoverLetterStyle(
  job: JobDetailsJSON | null | undefined
): CoverLetterStyleId {
  if (job && isGermanEuJob(job) && looksGerman(job.raw_description)) {
    return "anschreiben";
  }
  return DEFAULT_COVER_LETTER_STYLE;
}

export function resolveCoverLetterStyleGuide(
  id?: CoverLetterStyleId
): string | undefined {
  return (
    COVER_LETTER_STYLES[id ?? DEFAULT_COVER_LETTER_STYLE].promptFragment ??
    undefined
  );
}
